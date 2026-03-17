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
    { id: 'i3', name: '정화수', type: 'consumable', qty: 5, grade: 'uncommon', desc: '마나 피폭 수치를 낮춰준다.' },
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
  state:          GameState;
  dispatch:       React.Dispatch<GameAction>;
  circleTickRef:  RefObject<SVGCircleElement | null>;
  mapTickRef:     RefObject<HTMLDivElement | null>;
  zones:          ZoneRow[];
};

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

// ─── Helpers ─────────────────────────────────────────────────

export type ResourceMeta = {
  name:  string;
  grade: 'common' | 'uncommon' | 'rare' | 'epic';
  desc:  string;
};

export const RESOURCE_METADATA: Record<string, ResourceMeta> = {
  bss: { 
    name: 'BSS', 
    grade: 'epic', 
    desc: '마나 폭발로 파괴된 도시 통신망의 파편. 희소하며 모든 거래의 기준 통화.' 
  },
  mana_crystal: { 
    name: '마나 결정(기본)', 
    grade: 'common', 
    desc: '가장 흔한 형태의 응집된 마나.' 
  },
  scrap_parts: { 
    name: '고철 부품', 
    grade: 'common', 
    desc: '과거 도시의 기계 잔해.' 
  },
  blueprint_frag: { 
    name: '설계도 파편', 
    grade: 'uncommon', 
    desc: '고대 장치의 도면 일부.' 
  },
  mana_crystal_mid: { 
    name: '마나 결정(중급)', 
    grade: 'uncommon', 
    desc: '상당히 순도 높은 마나.' 
  },
  relic_frag: { 
    name: '유물 파편', 
    grade: 'rare', 
    desc: '알 수 없는 용도의 고대 파편.' 
  },
  mana_crystal_adv: { 
    name: '마나 결정(고급)', 
    grade: 'rare', 
    desc: '매우 강력한 에너지를 머금은 결정.' 
  },
  ancient_record: { 
    name: '고대 기록', 
    grade: 'rare', 
    desc: '대재앙 이전의 데이터가 담긴 기록 매체.' 
  },
  rare_relic: { 
    name: '희귀 유물', 
    grade: 'epic', 
    desc: '박물관에나 있을 법한 진귀한 유물.' 
  },
  mutant_mat: { 
    name: '변이체 재료', 
    grade: 'epic', 
    desc: '공허 구역 변이체에서 추출한 유기 재료.' 
  },
  // Phase B resources
  wood: { name: '목재', grade: 'common', desc: '건축이나 제작에 쓰이는 일반적인 나무.' },
  resin: { name: '수지', grade: 'common', desc: '끈적이는 나무 진액.' },
  mutant_wood: { name: '변이 목재', grade: 'uncommon', desc: '마나에 절어 단단해진 목재.' },
  spore_crystal: { name: '포자 결정', grade: 'uncommon', desc: '거대 포자에서 추출한 결정.' },
  ancient_wood: { name: '고대목', grade: 'rare', desc: '수천 년을 버텨온 고대의 나무.' },
  stone: { name: '석재', grade: 'common', desc: '흔한 바위 조각.' },
  iron_ore: { name: '철광석', grade: 'common', desc: '제련하면 철을 얻을 수 있는 광석.' },
  mana_stone: { name: '마나석', grade: 'uncommon', desc: '마나 결정의 원석.' },
  rare_mineral: { name: '희귀 광물', grade: 'rare', desc: '깊은 지하에서만 발견되는 광물.' },
  crystal_core: { name: '결정 코어', grade: 'epic', desc: '순수한 에너지의 결정체.' },
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

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const zonesRef = useRef(initialZones ?? []);
  useEffect(() => { zonesRef.current = initialZones ?? []; }, [initialZones]);

  const circleTickRef = useRef<SVGCircleElement>(null);
  const mapTickRef    = useRef<HTMLDivElement>(null);

  // Stable refs so RAF + async closures don't go stale
  const actionRef      = useRef(state.currentAction);
  const isExploringRef = useRef(state.isExploring);

  useEffect(() => { actionRef.current      = state.currentAction; }, [state.currentAction]);
  useEffect(() => { isExploringRef.current = state.isExploring;   }, [state.isExploring]);

  const dispatchStable = useCallback(dispatch, []);

  const providerValue = useMemo(
    () => ({ state, dispatch, circleTickRef, mapTickRef, zones: initialZones ?? [] }),
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

  // ── Server sync loop ──────────────────────────────────────
  useEffect(() => {
    const sync = async () => {
      if (!isExploringRef.current) return;
      try {
        const result = await api.syncExploration();
        console.log('[sync]', result);

        // Milestone detection
        if (result.jobType && result.jobPointsGained > 0) {
          const oldLevel = stateRef.current.skills[result.jobType] ?? 0;
          const newLevel = oldLevel + result.jobPointsGained / 100;

          const milestones = [10, 15, 20, 30, 35];
          for (const m of milestones) {
            if (oldLevel < m && newLevel >= m) {
              const jobName = result.jobType.toUpperCase();
              dispatchStable({
                type: 'ADD_LOG',
                entry: {
                  time: nowHHMM(),
                  segments: [
                    { type: 'highlight', text: `[${jobName}] ` },
                    { type: 'plain', text: `${m.toFixed(2)} 달성 — 새로운 구역 해금!` }
                  ]
                }
              });
            }
          }
        }

        // Completion log
        if (stateRef.current.progress < 100 && result.progress >= 100) {
          const zoneName = zonesRef.current.find((z: ZoneRow) => z.id === stateRef.current.currentAction.zoneId)?.name || '구역';
          dispatchStable({
            type: 'ADD_LOG',
            entry: {
              time: nowHHMM(),
              segments: [
                { type: 'good', text: `[탐험 완료] ` },
                { type: 'plain', text: `${zoneName} 탐색 완료!` }
              ]
            }
          });
        }

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
            const isBss = key === 'bss';
            const name = RESOURCE_METADATA[key]?.name ?? key;
            dispatchStable({
              type:  'ADD_LOG',
              entry: {
                time: nowHHMM(),
                segments: isBss ? [
                  { type: 'reward', text: `🏆 ${name} ×${amt} 획득!` },
                  { type: 'plain',  text: ' (보너스)' }
                ] : [
                  { type: 'highlight', text: name },
                  { type: 'plain',     text: ` ×${amt} 획득` },
                ],
              },
            });
          }
        }
      } catch (err) {
        console.warn('[sync] error:', err);
      }
    };

    const interval = setInterval(sync, 30_000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [dispatchStable]);

  return <GameContext.Provider value={providerValue}>{children}</GameContext.Provider>;
}
