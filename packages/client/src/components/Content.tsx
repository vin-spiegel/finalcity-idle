import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import avatar from "../assets/image.png";
import mapPreview from "../assets/map-preview.png";
import zoneWorld  from "../assets/zones/world.png";
import zoneKirtas from "../assets/zones/kirtas.png";
import zoneVoid   from "../assets/zones/void.png";

const ZONE_IMAGES: Record<string, string> = {
  // world & branches
  world:            zoneWorld,
  "urban-ruins":    zoneKirtas,
  "mana-research":  zoneVoid,
  "outer-nature":   zoneKirtas,
  "underground-veins": zoneVoid,
  kirtas:           zoneKirtas,
  "red-canyon":     zoneKirtas,
  "gray-plateau":   zoneVoid,
  "final-city-outer": zoneVoid,
  // leaves
  "camp3-commercial":  zoneKirtas,
  "camp3-factory":     zoneKirtas,
  "camp3-mana-rift":   zoneKirtas,
  "camp3-ancient-lab": zoneVoid,
  "camp3-void-depths": zoneVoid,
  // Phase B leaves
  "lumber-dead-forest": zoneKirtas,
  "lumber-mutant-plants": zoneKirtas,
  "lumber-forbidden-deep": zoneVoid,
  "miner-quarry": zoneVoid,
  "miner-mana-vein": zoneVoid,
  "miner-crystal-cave": zoneVoid,
};
import { useGame } from "../context/GameContext";
import { api } from "../lib/api";
import type { ZoneRow } from "../lib/api";


// ─── Types ────────────────────────────────────────────────────

type DangerLevel = "안전" | "보통" | "위험" | "극한";

type ZoneNode = {
  id:          string;
  parentId:    string | null;
  name:        string;
  desc:        string;
  art:         string;
  levelReq:    number;
  dangerLevel: DangerLevel;
  // branch: tickSec = null, leaf: tickSec set
  tickSec:     number | null;
  actionType:  string | null;
  jobType:     string | null;
  children:    ZoneNode[];
};

// ─── Static ───────────────────────────────────────────────────

const DANGER_CLASS: Record<DangerLevel, string> = {
  "안전": "danger--safe",
  "보통": "danger--normal",
  "위험": "danger--danger",
  "극한": "danger--extreme",
};

const HUD_LOG_COUNT = 4;

// ─── NPC presence ─────────────────────────────────────────────

type NpcModalState = {
  name: string;
  lines: string[];
  count: number;
  isEnding?: boolean;
  coolProgress?: number;
  isPostCooldown?: boolean; // 쿨타임 직후인지 여부
};

const NPC_TITLES = ["방랑자", "순환회원", "잡역부", "채집꾼", "탐색자", "유랑자", "개척자", "폐허사냥꾼"];
const NPC_NAMES  = ["카이", "시오", "펜", "카라", "렌", "미르", "토르", "유이", "하켄", "세라", "나린", "다온", "루카", "에이", "볼크", "이든"];

const NPC_GENERIC_LINES = [
  "이 구역은 처음이에요?",
  "자원 채집 효율이 꽤 좋은 편이에요.",
  "조심하세요. 가끔 이상한 마나 파동이 감지된대요.",
  "순환회가 이 구역 출입을 제한하려 했는데, 그냥 무시하고 왔어요.",
  "오늘은 피폭 수치가 평소보다 낮네요.",
  "파편 줍는 데 30분 걸릴 때도 있는데, 가끔 희귀한 것도 나오니까요.",
  "마나 결정 품질이 여기가 좋다고 소문이 나서 왔어요.",
  "폐허 사냥꾼들이 자주 지나가는데, 눈 마주치지 않는 게 나아요.",
  "여기선 혼자 다니지 않는 게 기본이에요.",
  "이 구역 지형이 낯설어서 처음엔 많이 헤맸어요.",
];

const NPC_REASON: Record<string, string> = {
  "방랑자":    "딱히 목적 없이 돌아다니다 보니까 여기까지 왔어요.",
  "순환회원":  "조직에서 이 구역 자원 조사 임무를 줬어요.",
  "채집꾼":    "이 근처 채집이 제 생계예요.",
  "잡역부":    "부탁받은 일이 있어서요. 자세한 건 말 못 해요.",
  "탐색자":    "이 구역 지도 데이터가 부족해서 직접 와봤어요.",
  "유랑자":    "여기저기 다니다 보면 재밌는 게 나오더라고요.",
  "개척자":    "언젠가 여기에 베이스캠프 만들 생각이에요.",
  "폐허사냥꾼":"위험한 곳일수록 값진 게 있거든요.",
};

// ─── NPC 대사 리스트 (여기에 주실 리스트를 추가하면 됩니다) ───
const MIR_TALK_LIST = [
  "순환회에서 감투를 쓴 그새끼. 왜이렇게 꺼드럭대는지 모르겠네요.",
  "요즘 공장에 이상한 소문이 돌아요. 밤마다 기계들이 스스로 움직인다나.",
  "이 구역 잔해들 사이에서 가끔 옛날 물건들이 나오는데, 꽤 쏠쏠해요.",
  "언젠가는 이 짓도 그만두고 파이널 시티 안쪽으로 들어가고 싶네요.",
  "그래도, 할 일이 있어서 다행이네요.",
  "순환회에 그녀석이 들어갔다던데. 잘 지내려나. 누구냐고요? 제 옛 연인이요.",
  "그래도 포기 하지 않아.나는. 아, 들으셨어요 ?",
  "오래전 가끔은 마나 폭풍 소리가 자장가처럼 들릴 때가 있어요. 미친 소리 같지만요.",
  "저, 경보기가 울리는데, 꺼주실래요 ? 시끄러워서.",
  // ... 추가될 대사들은 여기에 계속 넣으면 됩니다.
];

const NPC_SPECIAL_LINES: Record<string, string[]> = {
  "잡역부_미르": MIR_TALK_LIST,
};

function lcg(seed: number) {
  return ((seed * 1664525 + 1013904223) >>> 0) / 0x100000000;
}

function zoneNpcs(zoneId: string, count = 3): string[] {
  let seed = 0;
  for (let i = 0; i < zoneId.length; i++) seed = (seed * 31 + zoneId.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }, (_, i) => {
    const a = lcg(seed ^ (i * 0xdeadbeef));
    const b = lcg(seed ^ (i * 0xcafebabe));
    const title = NPC_TITLES[Math.floor(a * NPC_TITLES.length)];
    const name  = NPC_NAMES[Math.floor(b * NPC_NAMES.length)];
    return `${title}_${name}`;
  });
}

function npcDialog(npcName: string, zoneId: string, idx: number, talkCount: number = 0, excludeLine?: string, isPostCooldown?: boolean): { lines: string[], isEnding: boolean } {
  let seed = 0;
  for (let i = 0; i < zoneId.length; i++) seed = (seed * 31 + zoneId.charCodeAt(i)) >>> 0;
  seed ^= (idx + 1) * 0xf00dbabe;

  const title  = npcName.split("_")[0];
  const reason = NPC_REASON[title] ?? "딱히 이유는 없어요.";

  // 특수 대사가 있는 NPC인 경우
  if (NPC_SPECIAL_LINES[npcName]) {
    // 쿨타임 직후에는 지정된 대사 고정
    if (isPostCooldown) {
      return { lines: ["...", "하, 이런 곳에서도 수다를 좋아하는 분이 있네."], isEnding: false };
    }

    const specials = [...NPC_SPECIAL_LINES[npcName]];
    
    if (npcName === "잡역부_미르" && talkCount >= 5) {
      specials.push("저기, 그렇게 한가해요?");
    }

    const isRandom = idx !== Math.floor(idx);
    let i1 = isRandom
      ? Math.floor(Math.random() * specials.length)
      : Math.floor(lcg(seed ^ 0x1111) * specials.length);

    if (specials.length > 1 && specials[i1] === excludeLine) {
      i1 = (i1 + 1) % specials.length;
    }

    const chosenLine = specials[i1];
    const isEnding = chosenLine === "저기, 그렇게 한가해요?";
    
    const displayReason = talkCount === 1 ? reason : "...";

    return { lines: [displayReason, chosenLine], isEnding };
  }

  const i1     = Math.floor(lcg(seed ^ 0x1111) * NPC_GENERIC_LINES.length);
  let   i2     = Math.floor(lcg(seed ^ 0x2222) * NPC_GENERIC_LINES.length);
  if (i2 === i1) i2 = (i2 + 1) % NPC_GENERIC_LINES.length;
  return { lines: [reason, NPC_GENERIC_LINES[i1], NPC_GENERIC_LINES[i2]], isEnding: false };
}

// ─── Helpers ──────────────────────────────────────────────────

function fmtElapsed(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildTree(rows: ZoneRow[]): ZoneNode[] {
  const map = new Map<string, ZoneNode>();
  for (const r of rows) {
    map.set(r.id, {
      ...r,
      dangerLevel: r.dangerLevel as DangerLevel,
      children: [],
    });
  }
  const roots: ZoneNode[] = [];
  for (const node of map.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      map.get(node.parentId)?.children.push(node);
    }
  }
  return roots;
}

function findNode(roots: ZoneNode[], id: string): ZoneNode | null {
  for (const n of roots) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function findLeaf(roots: ZoneNode[], id: string): ZoneNode | null {
  const node = findNode(roots, id);
  return node?.tickSec != null ? node : null;
}

function findPathTo(nodes: ZoneNode[], targetId: string, acc: string[] = []): string[] | null {
  for (const node of nodes) {
    const next = [...acc, node.id];
    if (node.id === targetId) return next;
    const found = findPathTo(node.children, targetId, next);
    if (found) return found;
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────

export default function Content() {
  const { state, dispatch, mapTickRef, navigateToActiveRef, zones: zoneRows } = useGame();
  const { currentAction, progress, logs, skills } = state;

  const [roots,     setRoots]     = useState<ZoneNode[]>([]);
  const [starting,  setStarting]  = useState(false);
  const [stopping,  setStopping]  = useState(false);
  const [toast,     setToast]     = useState<string | null>(null);
  const [npcModal, setNpcModal] = useState<NpcModalState | null>(null);

  // NPC 대화 쿨타임 타이머
  useEffect(() => {
    if (!npcModal?.isEnding) return;

    const duration = 5000; // 5초 쿨타임
    const interval = 50;   // 0.05초마다 갱신
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setNpcModal(current => {
        if (!current || !current.isEnding) {
          clearInterval(timer);
          return current;
        }
        const nextProgress = (current.coolProgress || 0) + step;
        if (nextProgress >= 100) {
          clearInterval(timer);
          return { ...current, isEnding: false, coolProgress: 0, count: 1, isPostCooldown: true };
        }
        return { ...current, coolProgress: nextProgress };
      });
    }, interval);

    return () => clearInterval(timer);
  }, [npcModal?.isEnding]);



  useEffect(() => {
    if (zoneRows.length > 0) setRoots(buildTree(zoneRows));
  }, [zoneRows]);

  // path = list of zone IDs navigated into (excludes "world" root)
  const [path, setPath] = useState<string[]>([]);

  // 탐험 중인 구역으로 이동하는 함수 — Topbar에서 호출 가능하도록 ref 등록
  useEffect(() => {
    navigateToActiveRef.current = () => {
      if (!state.isExploring || !currentAction.zoneId || roots.length === 0) return;
      const topLevel = roots.find(n => n.id === "world")?.children ?? roots.filter(n => n.id !== "world");
      const autoPath = findPathTo(topLevel, currentAction.zoneId);
      if (autoPath) setPath(autoPath);
    };
  });

  // 로드 시 탐험 중인 구역으로 자동 이동 + 토스트
  useEffect(() => {
    if (roots.length === 0 || !state.isExploring || !currentAction.zoneId) return;
    const topLevel = roots.find(n => n.id === "world")?.children ?? roots.filter(n => n.id !== "world");
    const autoPath = findPathTo(topLevel, currentAction.zoneId);
    if (autoPath) {
      setPath(autoPath);
      const zoneName = findNode(roots, currentAction.zoneId)?.name ?? currentAction.zoneId;
      setToast(`◉ ${zoneName}에서 탐험 중`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const activeZone     = state.isExploring ? currentAction.zoneId : "";
  const activeLeaf     = findLeaf(roots, activeZone);
  const hudLogs        = logs.slice(0, HUD_LOG_COUNT);
  const elapsed        = Math.floor((Date.now() - currentAction.createdAt) / 1000);

  // Current node being browsed (null = world root)
  const currentNode = path.length > 0 ? findNode(roots, path[path.length - 1]) : null;
  const topLevel    = roots.find(n => n.id === "world")?.children ?? roots.filter(n => n.id !== "world");
  const children    = currentNode ? currentNode.children : topLevel;

  // Map HUD: only show active exploration overlay when viewing the active leaf
  const showActiveHud  = activeLeaf != null && state.isExploring && currentNode?.id === activeZone;
  const hudZoneName    = showActiveHud ? activeLeaf!.name : (currentNode?.name ?? "세계 지도");
  const hudSubLine     = showActiveHud
    ? `${activeLeaf!.desc.slice(0, 40)}…`
    : currentNode
      ? `${currentNode.dangerLevel}`
      : "탐색 가능한 구역";
  const hudDesc        = showActiveHud ? activeLeaf!.desc : (currentNode?.desc ?? "지도를 탐색하여 다음 목적지를 선택하십시오.");

  const viewKey = currentNode?.id ?? "world";

  // Breadcrumbs
  const crumbs = [
    { id: "__root__", label: "세계 지도" },
    ...path.map(id => ({ id, label: findNode(roots, id)?.name ?? id })),
  ];

  const goBack = () => setPath(p => p.slice(0, -1));

  const navigate = (id: string) => {
    if (findNode(roots, id)) setPath(p => [...p, id]);
  };

  const navigateToCrumb = (id: string) => {
    if (id === "__root__") {
      setPath([]);
    } else {
      const idx = path.indexOf(id);
      if (idx >= 0) setPath(p => p.slice(0, idx + 1));
    }
  };

  return (
    <div className="content">
      {toast && <div className="entry-toast">{toast}</div>}
      <div className="content-header">
        <div className="breadcrumb-row">
          {path.length > 0 && (
            <button className="back-btn" title="뒤로" onClick={goBack}>
              <ChevronLeft size={14} />
            </button>
          )}
          <nav className="breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c.id} className="breadcrumb-item">
                {i < crumbs.length - 1 ? (
                  <button className="breadcrumb-link" onClick={() => navigateToCrumb(c.id)}>{c.label}</button>
                ) : (
                  <span className="breadcrumb-current">{c.label}</span>
                )}
                {i < crumbs.length - 1 && <span className="breadcrumb-sep">›</span>}
              </span>
            ))}
          </nav>
          <div className="nearby-topbar">
            <div className="top-avatar"><img src={avatar} alt="" /></div>
            <div className="top-avatar"><img src={avatar} alt="" /></div>
            <div className="top-avatar"><img src={avatar} alt="" /></div>
            <div className="top-avatar"><img src={avatar} alt="" /></div>
            <div className="top-avatar"><img src={avatar} alt="" /></div>
            <div className="top-avatar-more">+29</div>
          </div>
        </div>
      </div>

      <div className="content-body">


        {/* ── NPC 대화 / 맵 미리보기 ── */}
        {npcModal ? (
          <div className="npc-dialog-wrap">
            <span className="modal-corner modal-corner--tl" />
            <span className="modal-corner modal-corner--tr" />
            <span className="modal-corner modal-corner--bl" />
            <span className="modal-corner modal-corner--br" />
            <div className="modal-header">
              <div className="modal-image-wrap">
                <img className="modal-image" src={avatar} alt={npcModal.name} />
              </div>
              <div className="modal-label">{npcModal.name}</div>
              <div className="modal-sublabel">탐험자</div>
            </div>
            <div className="modal-divider"><span>대화</span></div>
            <div className="modal-body">
              {npcModal.lines.map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </div>
        ) : (
        <div className="map-preview-wrap" data-view={viewKey}>
          <img src={ZONE_IMAGES[viewKey] ?? mapPreview} alt="구역 지도" className="map-preview" />
          <div className="map-region-tint" />

          <div className="map-hud-top">
            <div className="map-hud-title-row">
              <span className="map-hud-zone-name">{hudZoneName}</span>
              {showActiveHud && <span className="map-hud-pct">{progress.toFixed(1)}%</span>}
            </div>
            <div className="map-hud-sub">{hudSubLine}</div>
            <div className="map-hud-desc">{hudDesc}</div>
            {showActiveHud && <div className="map-hud-elapsed">◷ {fmtElapsed(elapsed)}</div>}
          </div>

          {showActiveHud && (
            <div className="map-hud-log">
              {hudLogs.length > 0 && [...hudLogs].reverse().map((entry, i) => {
                const age = hudLogs.length - 1 - i;
                return (
                  <div key={i} className="map-hud-line" style={{ opacity: 1 - age * 0.22 }}>
                    {entry.segments.map((seg, j) =>
                      seg.type === "plain"
                        ? <span key={j}>{seg.text}</span>
                        : <span key={j} className={seg.type}>{seg.text}</span>
                    )}
                  </div>
                );
              })}
              <div className="map-hud-tick-bar">
                <div ref={mapTickRef} className="map-hud-tick-fill" />
              </div>
            </div>
          )}
        </div>
        )}

        {/* ── Zone 리스트 / NPC 대화 액션 ── */}
        <div className="nav-list">
          {npcModal ? (
            <>
              {npcModal.isEnding && (
                <div style={{ 
                  height: '2px', // 더 얇게
                  background: 'rgba(0,0,0,0.3)', 
                  width: '100%', 
                  marginBottom: '-1px',
                  position: 'relative',
                  zIndex: 10
                }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'var(--region-primary)', // 주황색으로 변경
                    width: `${npcModal.coolProgress || 0}%`,
                    transition: 'width 0.05s linear',
                    boxShadow: '0 0 4px var(--region-glow)' // 주황색 글로우
                  }} />
                </div>
              )}
              <div 
                className={`nav-row ${npcModal.isEnding ? "nav-row--disabled" : ""}`}
                style={npcModal.isEnding ? { 
                  backgroundColor: "rgba(220, 50, 47, 0.2)", 
                  color: "var(--red-dim)",
                  opacity: 0.9, 
                  cursor: "not-allowed" 
                } : {}}
                onClick={() => {
                  if (npcModal.isEnding) return;
                  setNpcModal(current => {
                    if (!current) return null;
                    const nextCount = current.count + 1;
                    // current.lines[1]은 실제 대사 줄이므로 이를 excludeLine으로 전달
                    const { lines, isEnding } = npcDialog(current.name, currentNode?.id || 'world', Math.random(), nextCount, current.lines[1]);
                    return { 
                      ...current, 
                      count: nextCount,
                      lines,
                      isEnding,
                      isPostCooldown: false // 대화를 이어가면 플래그 해제
                    };
                  });
                }}
              >
                <div className="nav-row-info">
                  <div className="nav-row-name" style={npcModal.isEnding ? { color: "var(--red-dim)" } : {}}>
                    {npcModal.isEnding ? "더 이상 대화할 수 없다" : "대화를 이어간다"}
                  </div>
                </div>
                <div className="nav-row-arrow" style={npcModal.isEnding ? { color: "var(--red-dim)" } : {}}>
                  {npcModal.isEnding ? "✕" : "›"}
                </div>
              </div>

              <div className="nav-row" onClick={() => setNpcModal(null)}>
                <div className="nav-row-info">
                  <div className="nav-row-name">자리를 뜬다</div>
                </div>
                <div className="nav-row-arrow">›</div>
              </div>
            </>
          ) : roots.length === 0 ? (
            <>
              {[0.9, 0.65, 0.75, 0.55].map((w, i) => (
                <div key={i} className="nav-row nav-row--skeleton">
                  <div className="nav-row-info">
                    <div className="skeleton-line" style={{ width: `${w * 100}%` }} />
                    <div className="skeleton-line skeleton-line--sm" style={{ width: "40%" }} />
                  </div>
                </div>
              ))}
            </>
          ) : currentNode?.tickSec != null ? (
            /* ── Leaf view: action rows ── */
            (() => {
              const leaf       = currentNode;
              const isActive   = leaf.id === activeZone;
              const skillLevel = leaf.jobType ? (skills[leaf.jobType] ?? 0) : 0;
              const locked     = leaf.levelReq > 0 && skillLevel < leaf.levelReq;
              const action     = leaf.actionType ?? "탐험";
              return (
                <>
                  {/* 스킬 레벨 표시 */}
                  {leaf.jobType && (
                    <div className="nav-skill-row">
                      <span className="nav-skill-label">{action}</span>
                      <span className="nav-skill-level">{skillLevel.toFixed(2)}</span>
                      {locked && (
                        <span className="nav-skill-req"> (필요 {leaf.levelReq}.00)</span>
                      )}
                    </div>
                  )}

                  {/* 탐색 시작 / 탐색 중 */}
                  <div
                    className={`nav-row${isActive ? " nav-row--active" : ""}${starting ? " nav-row--pending" : ""}${locked ? " nav-row--locked" : ""}`}
                    onClick={async () => {
                      if (isActive || starting || locked) return;
                      setStarting(true);
                      dispatch({ type: "CHANGE_ZONE", zoneId: leaf.id, tickSec: leaf.tickSec! });
                      try {
                        await api.startExploration(leaf.id);
                      } catch {
                        dispatch({ type: "STOP_EXPLORE" });
                      } finally {
                        setStarting(false);
                      }
                    }}
                  >
                    <div className="nav-row-info">
                      <div className="nav-row-name">
                        {locked
                          ? `🔒 ${action} ${leaf.levelReq}.00 필요`
                          : starting ? "◌ 연결 중…"
                          : isActive ? `◉ ${action} 중`
                          : `▶ ${action} 시작`}
                      </div>
                      <div className="nav-row-badges">
                        {isActive
                          ? <>
                              <span className="badge">◷ {fmtElapsed(elapsed)}</span>
                              <span className="badge">{progress.toFixed(1)}%</span>
                            </>
                          : <>
                              <span className="badge">◷ {leaf.tickSec}s</span>
                              <span className={`badge badge--danger ${DANGER_CLASS[leaf.dangerLevel]}`}>{leaf.dangerLevel}</span>
                            </>
                        }
                      </div>
                    </div>
                    {isActive ? (
                      <button
                        className={`nav-row-cancel${stopping ? " nav-row-cancel--pending" : ""}`}
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (stopping) return;
                          setStopping(true);
                          dispatch({ type: "STOP_EXPLORE" });
                          try { await api.stopExploration(); }
                          catch { /* ok */ }
                          finally { setStopping(false); }
                        }}
                      >
                        {stopping ? "◌" : "✕"}
                      </button>
                    ) : (
                      <div className="nav-row-arrow">{locked ? "🔒" : "▶"}</div>
                    )}
                  </div>
                  {/* NPC 목록 */}
                  {zoneNpcs(leaf.id).map((npcName, i) => (
                    <div
                      key={i}
                      className="nav-row nav-row--npc"
                      onClick={() => {
                        const { lines, isEnding } = npcDialog(npcName, leaf.id, i, 1);
                        setNpcModal({ 
                          name: npcName, 
                          lines,
                          count: 1,
                          isEnding,
                          isPostCooldown: false
                        });
                      }}
                    >
                      <img className="nav-row-avatar" src={avatar} alt={npcName} />
                      <div className="nav-row-info">
                        <div className="nav-row-name">{npcName}</div>
                      </div>
                      <div className="nav-row-arrow">›</div>
                    </div>
                  ))}
                </>
              );
            })()
          ) : (
            /* ── Branch view: child list ── */
            children.map(node => {
              const isLeaf   = node.tickSec != null;
              const isActive = node.id === activeZone;
              const action   = node.actionType ?? null;
              const skillLevel = node.jobType ? (skills[node.jobType] ?? 0) : 0;
              const locked     = node.levelReq > 0 && skillLevel < node.levelReq;
              
              return (
                <div
                  key={node.id}
                  className={`nav-row${isActive ? " nav-row--active" : ""}${locked ? " nav-row--locked" : ""}`}
                  onClick={() => navigate(node.id)}
                >
                  <div className="nav-row-info">
                    <div className="nav-row-name">
                      {locked && <span style={{ marginRight: 6 }}>🔒</span>}
                      {node.name}
                    </div>
                    <div className="nav-row-badges">
                      {locked && <span className="badge badge--danger">Lv.{node.levelReq} 필요</span>}
                      {isLeaf && action && <span className="badge">{action}</span>}
                      {isLeaf && <span className="badge">◷ {node.tickSec}s</span>}
                      <span className={`badge badge--danger ${DANGER_CLASS[node.dangerLevel]}`}>{node.dangerLevel}</span>
                      {isActive && <span className="badge badge--active">{action ?? "탐색"} 중</span>}
                    </div>
                  </div>
                  <div className="nav-row-arrow">{locked ? "🔒" : isLeaf ? "▸" : "›"}</div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
