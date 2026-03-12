import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import avatar from "../assets/image.png";
import mapPreview from "../assets/map-preview.png";
import Modal from "./Modal";
import type { LogEntry } from "../types/log";

type Crumb = { label: string; key: string };

const ROOT_CRUMBS: Crumb[] = [
  { label: "지도",          key: "world" },
  { label: "키르타스 평원", key: "region" },
  { label: "야영지 3구역",  key: "zone" },
];

type Zone = {
  id: string;
  name: string;
  location: string;
  lv: number;
  tickSec: number;
  danger: "안전" | "보통" | "위험" | "극한";
  art: string;
};

type ZoneModalState = {
  mode: "zone" | "lore";
  zone: Zone;
};

const ZONES: Zone[] = [
  { id: "ruin-commercial", name: "상업 구획 폐건물",  location: "키르타스 평원",  lv: 1,  tickSec: 12, danger: "안전", art: "░▒▓█▓▒░\n▒▓████▓▒\n▓██████▓\n▒▓████▓▒\n░▒▓█▓▒░" },
  { id: "ruin-factory",    name: "구 제조 공장 지하", location: "키르타스 평원",  lv: 5,  tickSec: 18, danger: "보통", art: "▒░▒▓▒░▒\n░▓████▓░\n▓██▓███▓\n░▓████▓░\n▒░▒▓▒░▒" },
  { id: "mana-rift",       name: "마나 균열 지대",    location: "붉은 협곡",      lv: 12, tickSec: 25, danger: "위험", art: "░▒░▓░▒░\n▒▓▒█▒▓▒\n▓█▓▓▓█▓\n▒▓▒█▒▓▒\n░▒░▓░▒░" },
  { id: "ancient-lab",     name: "고대 연구소 잔해",  location: "회색 고원",      lv: 20, tickSec: 35, danger: "위험", art: "▓▒░▒░▒▓\n▒▓▒▓▒▓▒\n░▒▓███▒░\n▒▓▒▓▒▓▒\n▓▒░▒░▒▓" },
  { id: "void-sector",     name: "공허 구역 심층부",  location: "파이널 시티 외곽", lv: 30, tickSec: 50, danger: "극한", art: "█▓▒░▒▓█\n▓█▓▒▓█▓\n▒▓█▓█▓▒\n▓█▓▒▓█▓\n█▓▒░▒▓█" },
];

const DANGER_CLASS: Record<Zone["danger"], string> = {
  "안전": "danger--safe",
  "보통": "danger--normal",
  "위험": "danger--danger",
  "극한": "danger--extreme",
};

const ITEM_TICK_MS      = 12_000;
const PROGRESS_PER_ITEM = 1.5;
const HUD_LOG_COUNT     = 4;

const LOOT_POOL: LogEntry[] = [
  { time: "", segments: [{ type: "highlight", text: "마나 결정(중급)" }, { type: "plain", text: " ×2 획득 — " }, { type: "reward", text: "+120 BSS 상당" }] },
  { time: "", segments: [{ type: "plain", text: "폐허 탐색 중 " }, { type: "danger", text: "변이체(2단계) 조우" }, { type: "plain", text: " — 자동 회피 성공" }] },
  { time: "", segments: [{ type: "highlight", text: "고대 유물 파편" }, { type: "plain", text: " 발견 — 유물 복원 스킬 적용 중" }] },
  { time: "", segments: [{ type: "plain", text: "폐허 탐색 " }, { type: "good", text: "Lv.12 달성" }, { type: "plain", text: " — 탐색 속도 +5%" }] },
  { time: "", segments: [{ type: "plain", text: "마나 결정(기본) ×3 획득 — " }, { type: "reward", text: "+45 BSS 상당" }] },
  { time: "", segments: [{ type: "highlight", text: "잠긴 금고" }, { type: "plain", text: " 발견 — 해제 시도 중" }] },
  { time: "", segments: [{ type: "plain", text: "구역 탐색 중 " }, { type: "danger", text: "마나 결정 폭발" }, { type: "plain", text: " 위험 감지 — 우회 경로 선택" }] },
  { time: "", segments: [{ type: "plain", text: "고철 부품 ×5 획득 — " }, { type: "good", text: "유물 복원 경험치 +12" }] },
];

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtElapsed(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}


type Props = {
  onLog: (entry: LogEntry) => void;
  logs: LogEntry[];
};

export default function Content({ onLog, logs }: Props) {
  const [activeZone,  setActiveZone]  = useState<string>("ruin-commercial");
  const [elapsed,     setElapsed]     = useState(4 * 3600 + 32 * 60 + 17);
  const [progress,    setProgress]    = useState(67);
  const [zoneModal,   setZoneModal]   = useState<ZoneModalState | null>(null);

  const tickFillRef  = useRef<HTMLDivElement>(null);
  const lootIdx      = useRef(0);
  const tickStart    = useRef(performance.now());
  const elapsedStart = useRef(performance.now());
  const rafId        = useRef(0);

  useEffect(() => {
    const tick = (now: number) => {
      const elapsedDelta = now - elapsedStart.current;
      if (elapsedDelta >= 1000) {
        setElapsed(e => e + Math.floor(elapsedDelta / 1000));
        elapsedStart.current = now - (elapsedDelta % 1000);
      }

      const sinceStart = now - tickStart.current;
      const pct = Math.min(sinceStart / ITEM_TICK_MS, 1);
      if (tickFillRef.current) tickFillRef.current.style.width = `${pct * 100}%`;

      if (sinceStart >= ITEM_TICK_MS) {
        const entry = { ...LOOT_POOL[lootIdx.current % LOOT_POOL.length], time: nowHHMM() };
        lootIdx.current += 1;
        onLog(entry);
        setProgress(p => Math.min(100, +(p + PROGRESS_PER_ITEM).toFixed(1)));
        tickStart.current = now;
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  const openZoneModal = (zone: Zone) => setZoneModal({ mode: "zone", zone });
  const closeModal = () => setZoneModal(null);

  const handleModalChoice = (choiceId: string) => {
    if (!zoneModal) return;
    if (zoneModal.mode === "zone") {
      if (choiceId === "confirm") setActiveZone(zoneModal.zone.id);
      if (choiceId !== "inspect") closeModal();
      return;
    }
    closeModal();
  };

  const hudLogs    = logs.slice(0, HUD_LOG_COUNT);
  const crumbs     = ROOT_CRUMBS;
  const activeZoneData = ZONES.find(z => z.id === activeZone)!;

  return (
    <div className="content">
      <div className="content-header">
        <div className="breadcrumb-row">
          {crumbs.length > 1 && (
            <button className="back-btn" title="뒤로">
              <ChevronLeft size={14} />
            </button>
          )}
          <nav className="breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c.key} className="breadcrumb-item">
                {i < crumbs.length - 1 ? (
                  <button className="breadcrumb-link">{c.label}</button>
                ) : (
                  <span className="breadcrumb-current">{c.label}</span>
                )}
                {i < crumbs.length - 1 && <span className="breadcrumb-sep">›</span>}
              </span>
            ))}
          </nav>
          <div className="page-sub" style={{ marginLeft: 'auto' }}>마나 농도 31% · 비교적 안전</div>
        </div>
        <div className="nearby-topbar">
          <div className="top-avatar blue">◎</div>
          <div className="top-avatar red">◈</div>
          <div className="top-avatar white">◉</div>
          <div className="top-avatar yellow">◆</div>
          <div className="top-avatar blue">▣</div>
          <div className="top-avatar-more">+29</div>
        </div>
      </div>

      <div className="content-body">
        <div className="map-preview-wrap">
          <img src={mapPreview} alt="구역 지도" className="map-preview" />
          <div className="map-hud-top">
            <div className="map-hud-top-info">
              <span className="map-hud-zone-name">{activeZoneData.name}</span>
              <span className="map-hud-elapsed">◷ {fmtElapsed(elapsed)}</span>
              <span className="map-hud-pct">{progress.toFixed(1)}%</span>
            </div>
            <div className="map-hud-tick-bar">
              <div ref={tickFillRef} className="map-hud-tick-fill" />
            </div>
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
            </div>
          )}
        </div>
        <div className="zone-list">
          {ZONES.map(z => {
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
                      <span className="badge badge--loot">◈ 마나 결정 ×{14 + lootIdx.current}</span>
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
