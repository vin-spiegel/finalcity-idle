import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import avatar from "../assets/image.png";
import mapPreview from "../assets/map-preview.png";
import Modal from "./Modal";
import { useGame } from "../context/GameContext";

type Crumb = { label: string; key: string };

type NavView = { type: "world" } | { type: "region"; regionKey: string };

type Region = {
  key: string;
  label: string;
  lv: string;
  danger: "안전" | "보통" | "위험" | "극한";
  desc: string;
};

const REGIONS: Region[] = [
  { key: "kirtas",           label: "키르타스 평원",    lv: "1–5",  danger: "보통", desc: "도시 붕괴 이후 폐허가 된 개척지. 낮은 위험도에도 마나 결정 채굴 가치가 높아 탐색대가 끊이지 않는다." },
  { key: "red-canyon",       label: "붉은 협곡",        lv: "12",   danger: "위험", desc: "산화된 마나 층이 지층을 물들인 협곡. 균열 밀도가 높아 공간 왜곡이 빈번하게 발생한다." },
  { key: "gray-plateau",     label: "회색 고원",        lv: "20",   danger: "위험", desc: "고대 문명 유적이 점재하는 불모지. 탐색 대원들의 실종률이 지역 평균의 세 배에 달한다." },
  { key: "final-city-outer", label: "파이널 시티 외곽", lv: "30",   danger: "극한", desc: "도시 핵심부를 감싼 공허의 경계선. 이 선을 넘어 귀환한 탐색자의 기록은 없다." },
];

const ZONE_REGION: Record<string, string> = {
  "키르타스 평원":    "kirtas",
  "붉은 협곡":        "red-canyon",
  "회색 고원":        "gray-plateau",
  "파이널 시티 외곽": "final-city-outer",
};

type Zone = {
  id: string;
  name: string;
  location: string;
  lv: number;
  tickSec: number;
  danger: "안전" | "보통" | "위험" | "극한";
  art: string;
  desc: string;
};

type ZoneModalState = {
  mode: "zone" | "lore";
  zone: Zone;
};

const ZONES: Zone[] = [
  {
    id: "ruin-commercial", name: "상업 구획 폐건물", location: "키르타스 평원", lv: 1, tickSec: 12, danger: "안전",
    art: "░▒▓█▓▒░\n▒▓████▓▒\n▓██████▓\n▒▓████▓▒\n░▒▓█▓▒░",
    desc: "도시가 숨을 거두던 날에도 간판은 켜져 있었다. 마나 결정이 균열 사이로 자라나고 있지만, 아직 거스름돈을 기다리는 카운터가 남아 있다.",
  },
  {
    id: "ruin-factory", name: "구 제조 공장 지하", location: "키르타스 평원", lv: 5, tickSec: 18, danger: "보통",
    art: "▒░▒▓▒░▒\n░▓████▓░\n▓██▓███▓\n░▓████▓░\n▒░▒▓▒░▒",
    desc: "가동 정지 명령을 받지 못한 기계들이 지하 3층에서 아직 무언가를 찍어내고 있다. 순환회는 생산물의 정체를 공개하지 않는다.",
  },
  {
    id: "mana-rift", name: "마나 균열 지대", location: "붉은 협곡", lv: 12, tickSec: 25, danger: "위험",
    art: "░▒░▓░▒░\n▒▓▒█▒▓▒\n▓█▓▓▓█▓\n▒▓▒█▒▓▒\n░▒░▓░▒░",
    desc: "현실의 막이 얇아져 빛이 비틀린다. 순환회 공식 관측 기록에서 이 구역의 좌표는 세 번 삭제되었다.",
  },
  {
    id: "ancient-lab", name: "고대 연구소 잔해", location: "회색 고원", lv: 20, tickSec: 35, danger: "위험",
    art: "▓▒░▒░▒▓\n▒▓▒▓▒▓▒\n░▒▓███▒░\n▒▓▒▓▒▓▒\n▓▒░▒░▒▓",
    desc: "데이터는 지워졌으나 피실험체는 남아 있다. 연구 목적은 끝내 밝혀지지 않았고, 여기선 아무것도 자연사하지 않는다.",
  },
  {
    id: "void-sector", name: "공허 구역 심층부", location: "파이널 시티 외곽", lv: 30, tickSec: 50, danger: "극한",
    art: "█▓▒░▒▓█\n▓█▓▒▓█▓\n▒▓█▓█▓▒\n▓█▓▒▓█▓\n█▓▒░▒▓█",
    desc: "도시의 끝에서 공허가 시작된다. 이 지점을 지나 귀환한 탐색자의 기록은 없다 — 장비만 가끔 돌아온다.",
  },
];

const DANGER_CLASS: Record<Zone["danger"], string> = {
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

export default function Content() {
  const { state, dispatch, mapTickRef } = useGame();
  const { currentAction, progress, logs } = state;

  const [zoneModal, setZoneModal] = useState<ZoneModalState | null>(null);
  const [navView, setNavView]   = useState<NavView>({ type: "region", regionKey: "kirtas" });

  const activeZone     = currentAction.zoneId;
  const activeZoneData = ZONES.find(z => z.id === activeZone)!;
  const hudLogs        = logs.slice(0, HUD_LOG_COUNT);

  const crumbs: Crumb[] = navView.type === "world"
    ? [{ label: "세계 지도", key: "world" }]
    : [
        { label: "세계 지도", key: "world" },
        { label: REGIONS.find(r => r.key === navView.regionKey)!.label, key: navView.regionKey },
      ];

  const goBack    = () => { if (navView.type === "region") setNavView({ type: "world" }); };
  const navigateTo = (key: string) => {
    if (key === "world") setNavView({ type: "world" });
    else setNavView({ type: "region", regionKey: key });
  };

  const visibleZones = navView.type === "region"
    ? ZONES.filter(z => ZONE_REGION[z.location] === navView.regionKey)
    : ZONES;

  // elapsed: derived from createdAt (no state needed)
  const elapsed = Math.floor((Date.now() - currentAction.createdAt) / 1000);

  const openZoneModal = (zone: Zone) => setZoneModal({ mode: "zone", zone });
  const closeModal    = () => setZoneModal(null);

  const handleModalChoice = (choiceId: string) => {
    if (!zoneModal) return;
    if (zoneModal.mode === "zone") {
      if (choiceId === "confirm") dispatch({ type: 'CHANGE_ZONE', zoneId: zoneModal.zone.id });
      if (choiceId !== "inspect") closeModal();
      return;
    }
    closeModal();
  };

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
        <div className="map-preview-wrap">
          <img src={mapPreview} alt="구역 지도" className="map-preview" />
          <div className="map-hud-top">
            <div className="map-hud-title-row">
              <span className="map-hud-zone-name">{activeZoneData.name}</span>
              <span className="map-hud-pct">{progress.toFixed(1)}%</span>
            </div>
            <div className="map-hud-sub">{activeZoneData.location} · {activeZoneData.danger} · 마나 농도 31%</div>
            <div className="map-hud-desc">{activeZoneData.desc}</div>
            <div className="map-hud-elapsed">◷ {fmtElapsed(elapsed)}</div>
          </div>

          {hudLogs.length > 0 && (
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

        {navView.type === "world" ? (
          <div className="region-list">
            {REGIONS.map(r => (
              <div key={r.key} className="region-row" onClick={() => navigateTo(r.key)}>
                <div className="region-row-info">
                  <div className="region-row-name">{r.label}</div>
                  <div className="zone-row-badges">
                    <span className="badge">Lv.{r.lv}</span>
                    <span className={`badge badge--danger ${DANGER_CLASS[r.danger]}`}>{r.danger}</span>
                  </div>
                  <div className="region-row-desc">{r.desc}</div>
                </div>
                <div className="zone-row-arrow">›</div>
              </div>
            ))}
          </div>
        ) : (
        <div className="zone-list">
          {visibleZones.map(z => {
            const isActive = z.id === activeZone;
            return (
              <div
                key={z.id}
                className={`zone-row${isActive ? " zone-row--active" : ""}`}
                onClick={() => !isActive && openZoneModal(z)}
              >
                <div className="zone-row-art">
                  {z.art.split("\n").map((row, i) => <div key={i}>{row}</div>)}
                </div>

                {isActive ? (
                  <div className="zone-row-expanded">
                    <div className="zone-row-expanded-header">
                      <div className="zone-row-name">{z.name}</div>
                      <div className="zone-elapsed">◷ {fmtElapsed(elapsed)}</div>
                    </div>
                    <div className="progress-bar" style={{ marginTop: 4 }}>
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="zone-row-badges" style={{ marginTop: 8 }}>
                      <span className="badge badge--loot">◈ 마나 결정 ×{14}</span>
                      <span className="badge badge--explore">▣ 탐색 {progress.toFixed(1)}%</span>
                      <span className={`badge badge--danger ${DANGER_CLASS[z.danger]}`}>{z.danger}</span>
                    </div>
                  </div>
                ) : (
                  <div className="zone-row-info">
                    <div className="zone-row-name">{z.name}</div>
                    <div className="zone-row-badges">
                      <span className="badge">Lv.{z.lv}</span>
                      <span className="badge">◷ {z.tickSec}s</span>
                      <span className={`badge badge--danger ${DANGER_CLASS[z.danger]}`}>{z.danger}</span>
                    </div>
                  </div>
                )}

                {!isActive && <div className="zone-row-arrow">›</div>}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {zoneModal && (
        <Modal
          isOpen={true}
          imageSrc={avatar}
          imageAlt={zoneModal.mode === "zone" ? `${zoneModal.zone.name} 초상` : "개체 초상"}
          label={zoneModal.mode === "zone" ? zoneModal.zone.name : "Polyxitos, Legendary Plasma Jelly"}
          sublabel={zoneModal.mode === "zone"
            ? `${zoneModal.zone.location} · Lv.${zoneModal.zone.lv} · ${zoneModal.zone.danger}`
            : "Hostile, Impossible"}
          dividerLabel={zoneModal.mode === "zone" ? "탐험 개시 확인" : "개체 기록"}
          body={zoneModal.mode === "zone"
            ? [
                `${zoneModal.zone.name} 구역으로 이동하면 현재 탐험 대상이 즉시 전환됩니다.`,
                `예상 탐험 간격은 ${zoneModal.zone.tickSec}초이며 위험도는 ${zoneModal.zone.danger}입니다. 준비가 끝났다면 아래 선택지에서 시작하세요.`,
              ]
            : [
                "불타는 이온 장미가 유리질 막 내부에서 피어난다. 꼬리를 끄는 은하의 종소리와 비취색 증기가 공기 위를 미끄러지듯 번진다.",
                "순환회는 이 개체를 살아 있는 균열의 부산물로 분류한다. 짧게 스친 잔향만으로도 피폭 수치와 환영 반응이 동시에 상승했다.",
                "관찰 결과: 접근 금지. 다만 충분한 정화막과 냉각 장비가 있다면 파편 채집은 가능할지도 모른다.",
              ]}
          choices={zoneModal.mode === "zone"
            ? [
                { id: "inspect", label: "정보만 확인", hint: `${zoneModal.zone.location}`, tone: "neutral" },
                { id: "confirm", label: "탐험 시작", hint: `${zoneModal.zone.tickSec}초 간격`, tone: "primary" },
                { id: "cancel", label: "취소", hint: "현재 구역 유지", tone: "danger" },
              ]
            : [
                { id: "track", label: "추적 시작", hint: "위치 마킹", tone: "primary" },
                { id: "prepare", label: "대비 장비 확인", hint: "정화막 / 냉각", tone: "neutral" },
                { id: "close", label: "기록 닫기", hint: "ESC", tone: "danger" },
              ]}
          onClose={closeModal}
          onChoice={(choice) => handleModalChoice(choice.id)}
          closeOnOverlayClick={zoneModal.mode !== "zone"}
        />
      )}
    </div>
  );
}
