import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import avatar from "../assets/image.png";
import mapPreview from "../assets/map-preview.png";
import { useGame } from "../context/GameContext";

// ─── Types ────────────────────────────────────────────────────

type Crumb = { label: string; key: string };

type NavView =
  | { depth: 1 }
  | { depth: 2; regionKey: string }
  | { depth: 3; regionKey: string; zoneId: string };

type DangerLevel = "안전" | "보통" | "위험" | "극한";

type ZoneAction = {
  id:     string;
  label:  string;
  hint:   string;
  tone:   "primary" | "neutral";
  zoneId?: string;
};

type SubZone = {
  id:        string;
  name:      string;
  location:  string;
  regionKey: string;
  lv:        number;
  tickSec:   number;
  danger:    DangerLevel;
  art:       string;
  desc:      string;
  actions:   ZoneAction[];
};

type LargeRegion = {
  key:    string;
  label:  string;
  lv:     string;
  danger: DangerLevel;
  desc:   string;
};

// ─── Data ─────────────────────────────────────────────────────

const LARGE_REGIONS: LargeRegion[] = [
  { key: "kirtas",           label: "키르타스 평원",    lv: "1–5",  danger: "보통", desc: "도시 붕괴 이후 폐허가 된 개척지. 낮은 위험도에도 마나 결정 채굴 가치가 높아 탐색대가 끊이지 않는다." },
  { key: "red-canyon",       label: "붉은 협곡",        lv: "12",   danger: "위험", desc: "산화된 마나 층이 지층을 물들인 협곡. 균열 밀도가 높아 공간 왜곡이 빈번하게 발생한다." },
  { key: "gray-plateau",     label: "회색 고원",        lv: "20",   danger: "위험", desc: "고대 문명 유적이 점재하는 불모지. 탐색 대원들의 실종률이 지역 평균의 세 배에 달한다." },
  { key: "final-city-outer", label: "파이널 시티 외곽", lv: "30",   danger: "극한", desc: "도시 핵심부를 감싼 공허의 경계선. 이 선을 넘어 귀환한 탐색자의 기록은 없다." },
];

const SUBZONES: SubZone[] = [
  {
    id: "ruin-commercial", name: "상업 구획 폐건물",
    location: "키르타스 평원", regionKey: "kirtas",
    lv: 1, tickSec: 12, danger: "안전",
    art: "░▒▓█▓▒░\n▒▓████▓▒\n▓██████▓\n▒▓████▓▒\n░▒▓█▓▒░",
    desc: "도시가 숨을 거두던 날에도 간판은 켜져 있었다. 마나 결정이 균열 사이로 자라나고 있지만, 아직 거스름돈을 기다리는 카운터가 남아 있다.",
    actions: [
      { id: "explore",  label: "탐색 시작",  hint: "12초 간격 · 마나 결정 채굴",   tone: "primary", zoneId: "ruin-commercial" },
      { id: "scavenge", label: "구석 뒤지기", hint: "저급 부품 발견 확률 +15%",     tone: "neutral" },
    ],
  },
  {
    id: "ruin-factory", name: "구 제조 공장 지하",
    location: "키르타스 평원", regionKey: "kirtas",
    lv: 5, tickSec: 18, danger: "보통",
    art: "▒░▒▓▒░▒\n░▓████▓░\n▓██▓███▓\n░▓████▓░\n▒░▒▓▒░▒",
    desc: "가동 정지 명령을 받지 못한 기계들이 지하 3층에서 아직 무언가를 찍어내고 있다. 순환회는 생산물의 정체를 공개하지 않는다.",
    actions: [
      { id: "explore",   label: "탐색 시작",  hint: "18초 간격 · 고철 부품",        tone: "primary", zoneId: "ruin-factory" },
      { id: "dismantle", label: "기계 해체",   hint: "기술 경험치 +12",              tone: "neutral" },
    ],
  },
  {
    id: "mana-rift", name: "마나 균열 지대",
    location: "붉은 협곡", regionKey: "red-canyon",
    lv: 12, tickSec: 25, danger: "위험",
    art: "░▒░▓░▒░\n▒▓▒█▒▓▒\n▓█▓▓▓█▓\n▒▓▒█▒▓▒\n░▒░▓░▒░",
    desc: "현실의 막이 얇아져 빛이 비틀린다. 순환회 공식 관측 기록에서 이 구역의 좌표는 세 번 삭제되었다.",
    actions: [
      { id: "explore", label: "탐색 시작",  hint: "25초 간격 · 마나 결정(중급)",   tone: "primary", zoneId: "mana-rift" },
      { id: "mine",    label: "결정 채굴",   hint: "채굴량 ×1.5 — 위험도 상승",     tone: "neutral" },
    ],
  },
  {
    id: "ancient-lab", name: "고대 연구소 잔해",
    location: "회색 고원", regionKey: "gray-plateau",
    lv: 20, tickSec: 35, danger: "위험",
    art: "▓▒░▒░▒▓\n▒▓▒▓▒▓▒\n░▒▓███▒░\n▒▓▒▓▒▓▒\n▓▒░▒░▒▓",
    desc: "데이터는 지워졌으나 피실험체는 남아 있다. 연구 목적은 끝내 밝혀지지 않았고, 여기선 아무것도 자연사하지 않는다.",
    actions: [
      { id: "explore",  label: "탐색 시작",  hint: "35초 간격 · 고대 유물 파편",    tone: "primary", zoneId: "ancient-lab" },
      { id: "excavate", label: "유물 발굴",   hint: "희귀 아이템 발견 확률 +30%",    tone: "neutral" },
    ],
  },
  {
    id: "void-sector", name: "공허 구역 심층부",
    location: "파이널 시티 외곽", regionKey: "final-city-outer",
    lv: 30, tickSec: 50, danger: "극한",
    art: "█▓▒░▒▓█\n▓█▓▒▓█▓\n▒▓█▓█▓▒\n▓█▓▒▓█▓\n█▓▒░▒▓█",
    desc: "도시의 끝에서 공허가 시작된다. 이 지점을 지나 귀환한 탐색자의 기록은 없다 — 장비만 가끔 돌아온다.",
    actions: [
      { id: "explore", label: "탐색 시작", hint: "50초 간격 · 공허 파편", tone: "primary", zoneId: "void-sector" },
    ],
  },
];

const DANGER_CLASS: Record<DangerLevel, string> = {
  "안전": "danger--safe",
  "보통": "danger--normal",
  "위험": "danger--danger",
  "극한": "danger--extreme",
};

const HUD_LOG_COUNT = 4;

function fmtElapsed(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────

export default function Content() {
  const { state, dispatch, mapTickRef } = useGame();
  const { currentAction, progress, logs } = state;

  const [navView, setNavView] = useState<NavView>({ depth: 2, regionKey: "kirtas" });

  const activeZone     = currentAction.zoneId;
  const activeZoneData = SUBZONES.find(z => z.id === activeZone)!;
  const hudLogs        = logs.slice(0, HUD_LOG_COUNT);
  const elapsed        = Math.floor((Date.now() - currentAction.createdAt) / 1000);

  // View context (depth 1 & 2 only — depth 3 replaces map entirely)
  const viewKey               = navView.depth === 3 ? navView.regionKey : navView.depth === 1 ? "world" : navView.regionKey;
  const isViewingActiveRegion = navView.depth === 2 && navView.regionKey === activeZoneData.regionKey;
  const browsingRegion        = navView.depth === 2
    ? LARGE_REGIONS.find(r => r.key === navView.regionKey)!
    : null;

  // HUD content for depth 1 & 2
  const hudZoneName = isViewingActiveRegion
    ? activeZoneData.name
    : navView.depth === 1 ? "세계 지도" : browsingRegion!.label;
  const hudSubLine  = isViewingActiveRegion
    ? `${activeZoneData.location} · ${activeZoneData.danger} · 마나 농도 31%`
    : navView.depth === 1 ? "탐색 가능한 구역 4곳" : `Lv.${browsingRegion!.lv} · ${browsingRegion!.danger}`;
  const hudDesc     = isViewingActiveRegion
    ? activeZoneData.desc
    : navView.depth === 1
      ? "지도를 탐색하여 다음 목적지를 선택하십시오."
      : browsingRegion!.desc;

  // Breadcrumbs
  const crumbs: Crumb[] =
    navView.depth === 1
      ? [{ label: "세계 지도", key: "world" }]
      : navView.depth === 2
        ? [
            { label: "세계 지도", key: "world" },
            { label: LARGE_REGIONS.find(r => r.key === navView.regionKey)!.label, key: navView.regionKey },
          ]
        : [
            { label: "세계 지도", key: "world" },
            { label: LARGE_REGIONS.find(r => r.key === navView.regionKey)!.label, key: navView.regionKey },
            { label: SUBZONES.find(z => z.id === navView.zoneId)!.name, key: navView.zoneId },
          ];

  const goBack = () => {
    if (navView.depth === 3) setNavView({ depth: 2, regionKey: navView.regionKey });
    else if (navView.depth === 2) setNavView({ depth: 1 });
  };

  const navigateTo = (key: string) => {
    if (key === "world") setNavView({ depth: 1 });
    else {
      const isZone = SUBZONES.some(z => z.id === key);
      if (isZone) {
        const zone = SUBZONES.find(z => z.id === key)!;
        setNavView({ depth: 3, regionKey: zone.regionKey, zoneId: key });
      } else {
        setNavView({ depth: 2, regionKey: key });
      }
    }
  };

  // Depth 3: zone being viewed
  const viewZone = navView.depth === 3 ? SUBZONES.find(z => z.id === navView.zoneId)! : null;

  return (
    <div className="content">
      <div className="content-header">
        <div className="breadcrumb-row">
          {crumbs.length > 1 && (
            <button className="back-btn" title="뒤로" onClick={goBack}>
              <ChevronLeft size={14} />
            </button>
          )}
          <nav className="breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c.key} className="breadcrumb-item">
                {i < crumbs.length - 1 ? (
                  <button className="breadcrumb-link" onClick={() => navigateTo(c.key)}>{c.label}</button>
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

        {/* ── Depth 1 & 2: 맵 미리보기 ── */}
        {navView.depth !== 3 && (
          <div className="map-preview-wrap" data-view={viewKey}>
            <img src={mapPreview} alt="구역 지도" className="map-preview" />
            <div className="map-region-tint" />
            <div className="map-hud-top">
              <div className="map-hud-title-row">
                <span className="map-hud-zone-name">{hudZoneName}</span>
                {isViewingActiveRegion && <span className="map-hud-pct">{progress.toFixed(1)}%</span>}
              </div>
              <div className="map-hud-sub">{hudSubLine}</div>
              <div className="map-hud-desc">{hudDesc}</div>
              {isViewingActiveRegion && <div className="map-hud-elapsed">◷ {fmtElapsed(elapsed)}</div>}
            </div>

            {isViewingActiveRegion && hudLogs.length > 0 && (
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
        )}

        {/* ── Depth 3: 소지역 상세 (맵 전체 교체) ── */}
        {navView.depth === 3 && viewZone && (
          <div className="zone-detail">
            <div className="zone-detail-meta">
              <span className="badge">Lv.{viewZone.lv}</span>
              <span className="badge">◷ {viewZone.tickSec}s</span>
              <span className={`badge badge--danger ${DANGER_CLASS[viewZone.danger]}`}>{viewZone.danger}</span>
              {viewZone.id === activeZone && <span className="badge badge--active">탐색 중</span>}
            </div>

            <div className="zone-detail-art">
              {viewZone.art.split("\n").map((row, i) => <div key={i}>{row}</div>)}
            </div>

            <div className="zone-detail-desc">{viewZone.desc}</div>

            <div className="zone-detail-actions">
              {viewZone.actions.map(action => {
                const isCurrent = viewZone.id === activeZone && action.zoneId === activeZone;
                return (
                  <button
                    key={action.id}
                    className={`zone-action-btn zone-action-btn--${action.tone}${isCurrent ? " zone-action-btn--current" : ""}`}
                    onClick={() => {
                      if (action.zoneId && action.zoneId !== activeZone) {
                        dispatch({ type: "CHANGE_ZONE", zoneId: action.zoneId });
                      }
                    }}
                  >
                    <span className="zone-action-label">
                      {isCurrent ? "◉ " : "▶ "}{action.label}
                    </span>
                    <span className="zone-action-hint">{action.hint}</span>
                  </button>
                );
              })}
            </div>

            {viewZone.id === activeZone && (
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

        {/* ── Depth 1: 대지역 목록 ── */}
        {navView.depth === 1 && (
          <div className="nav-list">
            {LARGE_REGIONS.map(r => (
              <div key={r.key} className="nav-row" onClick={() => setNavView({ depth: 2, regionKey: r.key })}>
                <div className="nav-row-info">
                  <div className="nav-row-name">{r.label}</div>
                  <div className="nav-row-badges">
                    <span className="badge">Lv.{r.lv}</span>
                    <span className={`badge badge--danger ${DANGER_CLASS[r.danger]}`}>{r.danger}</span>
                  </div>
                  <div className="nav-row-desc">{r.desc}</div>
                </div>
                <div className="nav-row-arrow">›</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Depth 2: 소지역 목록 ── */}
        {navView.depth === 2 && (
          <div className="nav-list">
            {SUBZONES.filter(z => z.regionKey === navView.regionKey).map(z => {
              const isActive = z.id === activeZone;
              return (
                <div
                  key={z.id}
                  className={`nav-row${isActive ? " nav-row--active" : ""}`}
                  onClick={() => setNavView({ depth: 3, regionKey: z.regionKey, zoneId: z.id })}
                >
                  <div className="nav-row-art">
                    {z.art.split("\n").map((row, i) => <div key={i}>{row}</div>)}
                  </div>
                  <div className="nav-row-info">
                    <div className="nav-row-name">{z.name}</div>
                    <div className="nav-row-badges">
                      <span className="badge">Lv.{z.lv}</span>
                      <span className="badge">◷ {z.tickSec}s</span>
                      <span className={`badge badge--danger ${DANGER_CLASS[z.danger]}`}>{z.danger}</span>
                      {isActive && <span className="badge badge--active">탐색 중</span>}
                    </div>
                    {isActive && (
                      <div className="progress-bar" style={{ marginTop: 6 }}>
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="nav-row-arrow">›</div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
