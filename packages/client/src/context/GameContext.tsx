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
import { INITIAL_LOGS } from '../types/log';
import type { LogEntry } from '../types/log';

// ─── Server shape ────────────────────────────────────────────
// Server sends: { zone_id, created_at (ms), speed_per_sec }
// Client derives elapsed / tickPct locally — no WebSocket needed.

export type CurrentAction = {
  zoneId:      string;
  createdAt:   number; // Date.now() ms — maps to server's created_at
  speedPerSec: number; // ticks/sec    — maps to server's speed
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
  character:     { name: string; level: number; hp: number; maxHp: number; exp: number; maxExp: number };
  resources:     { manaStone: number; bss: number };
  currentAction: CurrentAction;
  progress:      number;      // zone exploration % (0–100)
  logs:          LogEntry[];
  inventory:     Item[];
  equipment:     Equipment;
};

const INITIAL_STATE: GameState = {
  character:     { name: '방랑자_카이', level: 27, hp: 450, maxHp: 500, exp: 12500, maxExp: 34000 },
  resources:     { manaStone: 14, bss: 2340 },
  currentAction: {
    zoneId:      'ruin-commercial',
    createdAt:   Date.now() - (4 * 3600 + 32 * 60 + 17) * 1000,
    speedPerSec: 1 / 12, // 12s tick
  },
  progress: 67,
  logs:     INITIAL_LOGS,
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
  | { type: 'CHANGE_ZONE';   zoneId: string }
  | { type: 'ADD_LOG';       entry: LogEntry }
  | { type: 'EARN_PROGRESS'; delta: number }
  // Future: replace local state with server payload
  | { type: 'SERVER_SYNC';   action: CurrentAction; progress: number };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'CHANGE_ZONE':
      return {
        ...state,
        currentAction: { ...state.currentAction, zoneId: action.zoneId, createdAt: Date.now() },
      };
    case 'ADD_LOG':
      return { ...state, logs: [action.entry, ...state.logs].slice(0, 20) };
    case 'EARN_PROGRESS':
      return { ...state, progress: Math.min(100, +(state.progress + action.delta).toFixed(1)) };
    case 'SERVER_SYNC':
      return { ...state, currentAction: action.action, progress: action.progress };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────

type GameContextValue = {
  state:         GameState;
  dispatch:      React.Dispatch<GameAction>;
  globalBarRef:  RefObject<HTMLDivElement | null>;
  mapTickRef:    RefObject<HTMLDivElement | null>;
};

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

// ─── Loot pool (shared) ──────────────────────────────────────

const LOOT_POOL: LogEntry[] = [
  { time: '', segments: [{ type: 'highlight', text: '마나 결정(중급)' }, { type: 'plain', text: ' ×2 획득 — ' }, { type: 'reward', text: '+120 획득' }] },
  { time: '', segments: [{ type: 'plain', text: '폐허 탐색 중 ' }, { type: 'danger', text: '변이체(2단계) 조우' }, { type: 'plain', text: ' — 자동 회피 성공' }] },
  { time: '', segments: [{ type: 'highlight', text: '고대 유물 파편' }, { type: 'plain', text: ' 발견 — 유물 복원 스킬 적용 중' }] },
  { time: '', segments: [{ type: 'plain', text: '폐허 탐색 ' }, { type: 'good', text: 'Lv.12 달성' }, { type: 'plain', text: ' — 탐색 속도 +5%' }] },
  { time: '', segments: [{ type: 'plain', text: '마나 결정(기본) ×3 획득 — ' }, { type: 'reward', text: '+45 획득' }] },
  { time: '', segments: [{ type: 'highlight', text: '잠긴 금고' }, { type: 'plain', text: ' 발견 — 해제 시도 중' }] },
  { time: '', segments: [{ type: 'plain', text: '구역 탐색 중 ' }, { type: 'danger', text: '마나 결정 폭발' }, { type: 'plain', text: ' 위험 감지 — 우회 경로 선택' }] },
  { time: '', segments: [{ type: 'plain', text: '고철 부품 ×5 획득 — ' }, { type: 'good', text: '유물 복원 경험치 +12' }] },
];

const PROGRESS_PER_ITEM = 1.5;
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Provider ────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);

  const globalBarRef = useRef<HTMLDivElement>(null);
  const mapTickRef   = useRef<HTMLDivElement>(null);

  // Stable refs so RAF closure doesn't go stale
  const actionRef   = useRef(state.currentAction);
  const progressRef = useRef(state.progress);
  const awardedRef  = useRef(0); // items awarded this session

  useEffect(() => { actionRef.current   = state.currentAction; }, [state.currentAction]);
  useEffect(() => { progressRef.current = state.progress;      }, [state.progress]);

  const dispatchStable = useCallback(dispatch, []);
  const providerValue = useMemo(
    () => ({ state, dispatch, globalBarRef, mapTickRef }),
    [state, dispatch],
  );

  useEffect(() => {
    let rafId = 0;

    const tick = (now: number) => {
      const action        = actionRef.current;
      const tickPeriodMs  = 1000 / action.speedPerSec;
      const msSinceStart  = now - action.createdAt;
      const tickPct       = (msSinceStart % tickPeriodMs) / tickPeriodMs;
      const totalItems    = Math.floor(msSinceStart / tickPeriodMs);

      // DOM: tick progress bars (no re-render)
      if (mapTickRef.current) {
        mapTickRef.current.style.width = `${tickPct * 100}%`;
      }
      if (globalBarRef.current) {
        globalBarRef.current.style.width = `${tickPct * 100}%`;
      }

      // Award new items
      while (awardedRef.current < totalItems) {
        const entry: LogEntry = {
          ...LOOT_POOL[awardedRef.current % LOOT_POOL.length],
          time: nowHHMM(),
        };
        awardedRef.current++;
        dispatchStable({ type: 'ADD_LOG',       entry });
        dispatchStable({ type: 'EARN_PROGRESS', delta: PROGRESS_PER_ITEM });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [dispatchStable]);

  return <GameContext.Provider value={providerValue}>{children}</GameContext.Provider>;
}
