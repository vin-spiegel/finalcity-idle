import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import avatar from "../assets/image.png";
import mapPreview from "../assets/map-preview.png";
import { useGame } from "../context/GameContext";
import { api, type ZoneRow } from "../lib/api";

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

// ─── Component ────────────────────────────────────────────────

export default function Content() {
  const { state, dispatch, mapTickRef } = useGame();
  const { currentAction, progress, logs } = state;

  const [roots, setRoots] = useState<ZoneNode[]>([]);

  useEffect(() => {
    api.fetchZones().then(rows => setRoots(buildTree(rows)));
  }, []);

  // path = list of zone IDs navigated into (excludes "world" root)
  const [path,       setPath]       = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeZone     = currentAction.zoneId;
  const activeLeaf     = findLeaf(roots, activeZone);
  const hudLogs        = logs.slice(0, HUD_LOG_COUNT);
  const elapsed        = Math.floor((Date.now() - currentAction.createdAt) / 1000);

  // Current node being browsed (null = world root)
  const currentNode = path.length > 0 ? findNode(roots, path[path.length - 1]) : null;
  const children    = currentNode ? currentNode.children : roots.filter(n => n.id !== "world").length > 0 ? roots.find(n => n.id === "world")?.children ?? roots.filter(n => n.parentId === null && n.id !== "world") : roots;

  // Map HUD: show active zone if exploring, else browsed node
  const showActiveHud  = activeLeaf != null && state.isExploring;
  const hudZoneName    = showActiveHud ? activeLeaf!.name : (currentNode?.name ?? "세계 지도");
  const hudSubLine     = showActiveHud
    ? `${activeLeaf!.desc.slice(0, 40)}…`
    : currentNode
      ? `Lv.${currentNode.levelReq} · ${currentNode.dangerLevel}`
      : "탐색 가능한 구역";
  const hudDesc        = showActiveHud ? activeLeaf!.desc : (currentNode?.desc ?? "지도를 탐색하여 다음 목적지를 선택하십시오.");

  const viewKey = currentNode?.id ?? "world";

  // Breadcrumbs
  const crumbs = [
    { id: "__root__", label: "세계 지도" },
    ...path.map(id => ({ id, label: findNode(roots, id)?.name ?? id })),
  ];

  const goBack = () => {
    setPath(p => p.slice(0, -1));
    setExpandedId(null);
  };

  const navigate = (id: string) => {
    const node = findNode(roots, id);
    if (!node) return;
    if (node.children.length > 0) {
      setPath(p => [...p, id]);
      setExpandedId(null);
    } else {
      // leaf: toggle expand
      setExpandedId(prev => prev === id ? null : id);
    }
  };

  const navigateToCrumb = (id: string) => {
    if (id === "__root__") {
      setPath([]);
      setExpandedId(null);
    } else {
      const idx = path.indexOf(id);
      if (idx >= 0) {
        setPath(p => p.slice(0, idx + 1));
        setExpandedId(null);
      }
    }
  };

  return (
    <div className="content">
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
          <img src={mapPreview} alt="구역 지도" className="map-preview" />
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

          {showActiveHud && hudLogs.length > 0 && (
            <div className="map-hud-log">
              {[...hudLogs].reverse().map((entry, i) => {
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
          {children.map(node => {
            const isLeaf     = node.tickSec != null;
            const isActive   = node.id === activeZone;
            const isExpanded = expandedId === node.id;

            return (
              <div key={node.id}>
                <div
                  className={`nav-row${isActive ? " nav-row--active" : ""}`}
                  onClick={() => navigate(node.id)}
                >
                  {node.art && (
                    <div className="nav-row-art">
                      {node.art.split("\n").map((row, i) => <div key={i}>{row}</div>)}
                    </div>
                  )}
                  <div className="nav-row-info">
                    <div className="nav-row-name">{node.name}</div>
                    <div className="nav-row-badges">
                      <span className="badge">Lv.{node.levelReq}</span>
                      {isLeaf && <span className="badge">◷ {node.tickSec}s</span>}
                      <span className={`badge badge--danger ${DANGER_CLASS[node.dangerLevel]}`}>{node.dangerLevel}</span>
                      {isActive && <span className="badge badge--active">탐색 중</span>}
                    </div>
                    {isActive && (
                      <div className="progress-bar" style={{ marginTop: 6 }}>
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="nav-row-arrow">{isLeaf ? (isExpanded ? "▾" : "▸") : "›"}</div>
                </div>

                {/* ── Inline action panel (leaf only) ── */}
                {isLeaf && isExpanded && (
                  <div className="zone-action-panel">
                    <button
                      className={`zone-action-btn zone-action-btn--primary${isActive ? " zone-action-btn--current" : ""}`}
                      onClick={async () => {
                        if (isActive) return;
                        try { await api.startExploration(node.id); } catch { return; }
                        dispatch({ type: "CHANGE_ZONE", zoneId: node.id, tickSec: node.tickSec! });
                      }}
                    >
                      <span className="zone-action-label">{isActive ? "◉ 탐색 중" : "▶ 탐색 시작"}</span>
                      <span className="zone-action-hint">{node.tickSec}초 간격</span>
                    </button>
                    {isActive && (
                      <div className="zone-detail-status">
                        <div className="zone-detail-status-row">
                          <span className="zone-detail-elapsed">◷ {fmtElapsed(elapsed)}</span>
                          <span className="zone-detail-pct">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="progress-bar zone-detail-progress-bar">
                          <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="map-hud-tick-bar zone-detail-tick-bar">
                          <div ref={mapTickRef} className="map-hud-tick-fill" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
