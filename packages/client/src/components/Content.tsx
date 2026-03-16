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

const NPC_TITLES = ["방랑자", "순환회원", "잡역부", "채집꾼", "탐색자", "유랑자", "개척자", "폐허사냥꾼"];
const NPC_NAMES  = ["카이", "시오", "펜", "카라", "렌", "미르", "토르", "유이", "하켄", "세라", "나린", "다온", "루카", "에이", "볼크", "이든"];

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

  const [roots,    setRoots]    = useState<ZoneNode[]>([]);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [toast,    setToast]    = useState<string | null>(null);

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

        {/* ── 맵 미리보기 ── */}
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
                    <span className="log-time">{entry.time}</span>
                    <span className="log-text">
                      {entry.segments.map((seg, j) =>
                        seg.type === "plain"
                          ? <span key={j}>{seg.text}</span>
                          : <span key={j} className={seg.type}>{seg.text}</span>
                      )}
                    </span>
                  </div>
                );
              })}
              <div className="map-hud-tick-bar">
                <div ref={mapTickRef} className="map-hud-tick-fill" />
              </div>
            </div>
          )}
        </div>

        {/* ── Zone 리스트 ── */}
        <div className="nav-list">
          {roots.length === 0 ? (
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
                      // Optimistic: update UI immediately
                      dispatch({ type: "CHANGE_ZONE", zoneId: leaf.id, tickSec: leaf.tickSec! });
                      try {
                        await api.startExploration(leaf.id);
                      } catch {
                        dispatch({ type: "STOP_EXPLORE" }); // rollback
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
                        <span className="badge">◷ {leaf.tickSec}s</span>
                        <span className={`badge badge--danger ${DANGER_CLASS[leaf.dangerLevel]}`}>{leaf.dangerLevel}</span>
                        {isActive && <span className="badge badge--active">{action} 중</span>}
                      </div>
                    </div>
                    <div className="nav-row-arrow">{locked ? "🔒" : isActive ? "●" : "▶"}</div>
                  </div>
                  {/* NPC 목록 */}
                  <div className="npc-list">
                    {zoneNpcs(leaf.id).map((name, i) => (
                      <div key={i} className="npc-row">
                        <span className="npc-dot">●</span>
                        <span className="npc-name">{name}</span>
                        <span className="npc-action">{action} 중</span>
                      </div>
                    ))}
                  </div>

                  {/* 탐색 취소 */}
                  {isActive && (
                    <div
                      className={`nav-row nav-row--stop${stopping ? " nav-row--pending" : ""}`}
                      onClick={async () => {
                        if (stopping) return;
                        setStopping(true);
                        // Optimistic: update UI immediately
                        dispatch({ type: "STOP_EXPLORE" });
                        try {
                          await api.stopExploration();
                        } catch { /* server stop failed, but sync loop is now paused — ok */ }
                        finally {
                          setStopping(false);
                        }
                      }}
                    >
                      <div className="nav-row-info">
                        <div className="nav-row-name">{stopping ? "◌ 취소 중…" : `✕ ${action} 취소`}</div>
                        <div className="nav-row-badges">
                          <span className="badge">◷ {fmtElapsed(elapsed)}</span>
                          <span className="badge">{progress.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="nav-row-arrow">›</div>
                    </div>
                  )}
                </>
              );
            })()
          ) : (
            /* ── Branch view: child list ── */
            children.map(node => {
              const isLeaf   = node.tickSec != null;
              const isActive = node.id === activeZone;
              const action   = node.actionType ?? null;
              return (
                <div
                  key={node.id}
                  className={`nav-row${isActive ? " nav-row--active" : ""}`}
                  onClick={() => navigate(node.id)}
                >
                  <div className="nav-row-info">
                    <div className="nav-row-name">{node.name}</div>
                    <div className="nav-row-badges">
                      {isLeaf && action && <span className="badge">{action}</span>}
                      {isLeaf && <span className="badge">◷ {node.tickSec}s</span>}
                      <span className={`badge badge--danger ${DANGER_CLASS[node.dangerLevel]}`}>{node.dangerLevel}</span>
                      {isActive && <span className="badge badge--active">{action ?? "탐색"} 중</span>}
                    </div>
                  </div>
                  <div className="nav-row-arrow">{isLeaf ? "▸" : "›"}</div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
