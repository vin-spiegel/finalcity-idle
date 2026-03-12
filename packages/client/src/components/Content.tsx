import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "../types/log";

type Zone = {
  id: string;
  name: string;
  location: string;
  lv: number;
  tickSec: number;
  danger: "안전" | "보통" | "위험" | "극한";
  art: string;
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
};

export default function Content({ onLog }: Props) {
  const [activeZone,  setActiveZone]  = useState<string>("ruin-commercial");
  const [elapsed,     setElapsed]     = useState(4 * 3600 + 32 * 60 + 17);
  const [progress,    setProgress]    = useState(67);
  const [itemPct,     setItemPct]     = useState(0);

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
      setItemPct(pct * 100);

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

  return (
    <div className="content">
      <div className="content-header">
        <div>
          <div className="page-title">키르타스 평원 — 야영지 3구역</div>
          <div className="page-sub">현재 위치 · 마나 농도 31% · 비교적 안전</div>
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
        <div className="alert-banner">
          <span className="alert-icon">⚠</span>
          <strong>STORM ALERT</strong> — 마나 폭풍 북서 방향 접근 중. 도달 예상:{" "}
          <strong>&nbsp;1시간 47분</strong>. 야영지 내 정화수 확보 권장.
        </div>

        <div className="zone-list">
          {ZONES.map(z => {
            const isActive = z.id === activeZone;
            return (
              <div
                key={z.id}
                className={`zone-row${isActive ? " zone-row--active" : ""}`}
                onClick={() => setActiveZone(z.id)}
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
                    <div className="progress-bar progress-bar--item">
                      <div className="progress-fill--item" style={{ width: `${itemPct}%` }} />
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
    </div>
  );
}
