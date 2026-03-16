import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type RefObject,
} from 'react';
import type { LogEntry } from '../types/log';
import { api, type ExplorationStatus, type ZoneRow } from '../lib/api';

// ─── Server shape ────────────────────────────────────────────

export type CurrentAction = {
  zoneId:      string;
  createdAt:   number; // Date.now() ms — used for tick bar animation
  speedPerSec: number; // 1 / tickSec
};

// ─── State ───────────────────────────────────────────────────

export type Item = {
  id: string;
  name: string;
  type: 'material' | 'consumable' | 'equipment' | 'key_item';
  qty: number;
  grade: 'common' | 'uncommon' | 'rare' | 'epic';
  desc: string;
};

export type Equipment = {
  weapon: Item | null;
  armor: Item | null;
  accessory: Item | null;
};

export type GameState = {
  character:     { name: string; hp: number; maxHp: number; exp: number; maxExp: number };
  resources:     Record<string, number>;
  skills:        Record<string, number>; // jobType → skill level (0.00–100.00)
  currentAction: CurrentAction;
  progress:      number;      // zone exploration % (0–100)
  isExploring:   boolean;
  logs:          LogEntry[];
  inventory:     Item[];
  equipment:     Equipment;
};

const INITIAL_STATE: GameState = {
  character:     { name: '방랑자_카이', hp: 450, maxHp: 500, exp: 12500, maxExp: 34000 },
  resources:     {},
  skills:        {},
  currentAction: {
    zoneId:      'camp3-commercial',
    createdAt:   Date.now(),
    speedPerSec: 1 / 8,
  },
  progress:    0,
  isExploring: false,
  logs:        [],
  inventory: [
    { id: 'i1', name: '마나 결정(기본)', type: 'material', qty: 124, grade: 'common', desc: '가장 흔한 형태의 응집된 마나.' },
    { id: 'i2', name: '마나 결정(중급)', type: 'material', qty: 14, grade: 'uncommon', desc: '상당히 순도 높은 마나.' },
    { id: 'i3', name: '정화수', type: 'consumable', qty: 5, grade: 'uncommon', desc: '마나 피폭 수치를 낮춰준다.' },
    { id: 'i4', name: '고철 부품', type: 'material', qty: 45, grade: 'common', desc: '과거 도시의 기계 잔해.' },
    { id: 'i5', name: '고대 유물 파편', type: 'material', qty: 2, grade: 'rare', desc: '알 수 없는 용도의 파편.' },
    { id: 'i6', name: '낡은 탐색자 나이프', type: 'equipment', qty: 1, grade: 'common', desc: '날이 많이 상한 칼.' },
  ],
  equipment: {
    weapon: { id: 'eq1', name: '개조된 파동검', type: 'equipment', qty: 1, grade: 'rare', desc: '마나를 둘러 파괴력을 높인 검.' },
    armor: { id: 'eq2', name: '순환회 표준 방호복', type: 'equipment', qty: 1, grade: 'uncommon', desc: '기본적인 피폭을 막아준다.' },
    accessory: null,
  }
};

// ─── Actions ─────────────────────────────────────────────────

export type GameAction =
  | { type: 'CHANGE_ZONE';   zoneId: string; tickSec: number }
  | { type: 'ADD_LOG';       entry: LogEntry }
  | { type: 'SERVER_SYNC';   progress: number; resources: Record<string, number>; jobType: string | null; jobPointsGained: number; nextTickIn: number; tickSec: number }
  | { type: 'SET_RESOURCES'; resources: Record<string, number> }
  | { type: 'STOP_EXPLORE' };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'CHANGE_ZONE':
      return {
        ...state,
        currentAction: {
          zoneId:      action.zoneId,
          createdAt:   Date.now(),
          speedPerSec: 1 / action.tickSec,
        },
        isExploring: true,
        logs:        [],
        progress:    0,
      };
    case 'ADD_LOG':
      return { ...state, logs: [action.entry, ...state.logs].slice(0, 20) };
    case 'SERVER_SYNC': {
      const merged: Record<string, number> = { ...state.resources };
      for (const [k, v] of Object.entries(action.resources)) {
        merged[k] = (merged[k] ?? 0) + v;
      }
      const skills = { ...state.skills };
      if (action.jobType && action.jobPointsGained > 0) {
        skills[action.jobType] = (skills[action.jobType] ?? 0) + action.jobPointsGained / 100;
      }
      return {
        ...state,
        progress:  action.progress,
        resources: merged,
        skills,
        currentAction: {
          ...state.currentAction,
          createdAt:   Date.now() - (action.tickSec - action.nextTickIn) * 1000,
          speedPerSec: 1 / action.tickSec,
        },
      };
    }
    case 'SET_RESOURCES':
      return { ...state, resources: action.resources };
    case 'STOP_EXPLORE':
      return { ...state, isExploring: false };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────

export const CIRCLE_CIRCUMFERENCE = 75.4; // 2π × r=12

type GameContextValue = {
  state:                 GameState;
  dispatch:              React.Dispatch<GameAction>;
  circleTickRef:         RefObject<SVGCircleElement | null>;
  mapTickRef:            RefObject<HTMLDivElement | null>;
  zones:                 ZoneRow[];
  navigateToActiveRef:   React.MutableRefObject<(() => void) | null>;
};

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

// ─── Helpers ─────────────────────────────────────────────────

const RESOURCE_NAMES: Record<string, string> = {
  bss:              'BSS',
  mana_crystal:     '마나 결정(기본)',
  scrap_parts:      '고철 부품',
  blueprint_frag:   '설계도 파편',
  mana_crystal_mid: '마나 결정(중급)',
  relic_frag:       '유물 파편',
  mana_crystal_adv: '마나 결정(고급)',
  ancient_record:   '고대 기록',
  rare_relic:       '희귀 유물',
  mutant_mat:       '변이체 재료',
};

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Provider ────────────────────────────────────────────────

type GameProviderProps = {
  children:          ReactNode;
  username?:         string;
  initialStatus?:    ExplorationStatus;
  initialResources?: Record<string, number>;
  initialSkills?:    Record<string, number>;
  initialZones?:     ZoneRow[];
};

export function GameProvider({ children, username, initialStatus, initialResources, initialSkills, initialZones }: GameProviderProps) {
  let init: GameState = {
    ...INITIAL_STATE,
    character: username
      ? { ...INITIAL_STATE.character, name: username }
      : INITIAL_STATE.character,
    resources: initialResources ?? {},
    skills:    initialSkills    ?? {},
  };

  if (initialStatus) {
    init = {
      ...init,
      progress:    initialStatus.progress,
      isExploring: true,
      currentAction: {
        zoneId:      initialStatus.zoneId,
        createdAt:   Date.now() - (initialStatus.tickSec - initialStatus.nextTickIn) * 1000,
        speedPerSec: 1 / initialStatus.tickSec,
      },
    };
  }

  const [state, dispatch] = useReducer(gameReducer, init);

  const circleTickRef        = useRef<SVGCircleElement>(null);
  const mapTickRef           = useRef<HTMLDivElement>(null);
  const navigateToActiveRef  = useRef<(() => void) | null>(null);

  // Stable refs so RAF + async closures don't go stale
  const actionRef      = useRef(state.currentAction);
  const isExploringRef = useRef(state.isExploring);

  useEffect(() => { actionRef.current      = state.currentAction; }, [state.currentAction]);
  useEffect(() => { isExploringRef.current = state.isExploring;   }, [state.isExploring]);

  const dispatchStable = useCallback(dispatch, []);

  const providerValue = useMemo(
    () => ({ state, dispatch, circleTickRef, mapTickRef, navigateToActiveRef, zones: initialZones ?? [] }),
    [state, dispatch, initialZones],
  );

  // ── RAF: tick bar animation only ──────────────────────────
  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      if (!isExploringRef.current) {
        if (mapTickRef.current)    mapTickRef.current.style.width = "0%";
        if (circleTickRef.current) circleTickRef.current.style.strokeDashoffset = String(CIRCLE_CIRCUMFERENCE);
        rafId = requestAnimationFrame(tick);
        return;
      }

      const now          = Date.now();
      const action       = actionRef.current;
      const tickPeriodMs = 1000 / action.speedPerSec;
      const msSinceStart = now - action.createdAt;
      const tickPct      = (msSinceStart % tickPeriodMs) / tickPeriodMs;

      if (mapTickRef.current)    mapTickRef.current.style.width = `${tickPct * 100}%`;
      if (circleTickRef.current) circleTickRef.current.style.strokeDashoffset = String(CIRCLE_CIRCUMFERENCE * (1 - tickPct));

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── Server sync loop (tick-aligned) ──────────────────────────────────
  useEffect(() => {
    if (!state.isExploring) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const doSync = async () => {
      if (!isExploringRef.current) return;
      try {
        const result = await api.syncExploration();
        dispatchStable({
          type:            'SERVER_SYNC',
          progress:        result.progress,
          resources:       result.resources,
          jobType:         result.jobType,
          jobPointsGained: result.jobPointsGained,
          nextTickIn:      result.nextTickIn,
          tickSec:         result.tickSec,
        });
        if (result.ticks > 0) {
          for (const [key, amt] of Object.entries(result.resources)) {
            if (amt <= 0) continue;
            const name = RESOURCE_NAMES[key] ?? key;
            dispatchStable({
              type:  'ADD_LOG',
              entry: {
                time: nowHHMM(),
                segments: [
                  { type: 'highlight', text: name },
                  { type: 'plain',     text: ` ×${amt} 획득` },
                ],
              },
            });
          }
          if (result.jobPointsGained > 0 && result.jobType) {
            dispatchStable({
              type:  'ADD_LOG',
              entry: {
                time: nowHHMM(),
                segments: [
                  { type: 'good',  text: `+${(result.jobPointsGained / 100).toFixed(2)}` },
                  { type: 'plain', text: ' 잡포 획득' },
                ],
              },
            });
          }
        }
        // 다음 틱 경계에 정확히 sync 예약
        if (isExploringRef.current) {
          timeoutId = setTimeout(doSync, Math.max(500, result.nextTickIn * 1000));
        }
      } catch (err) {
        console.warn('[sync] error:', err);
        if (isExploringRef.current) {
          timeoutId = setTimeout(doSync, 5_000);
        }
      }
    };

    // 첫 sync: 현재 틱 잔여 시간 계산
    const action       = actionRef.current;
    const tickPeriodMs = 1000 / action.speedPerSec;
    const elapsedMs    = Date.now() - action.createdAt;
    const firstDelayMs = tickPeriodMs - (elapsedMs % tickPeriodMs);
    timeoutId = setTimeout(doSync, Math.max(500, firstDelayMs));

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timeoutId);
        doSync();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state.isExploring, dispatchStable]);

  return <GameContext.Provider value={providerValue}>{children}</GameContext.Provider>;
}
