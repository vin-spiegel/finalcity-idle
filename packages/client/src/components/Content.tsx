import { useEffect, useRef, useState } from "react";

type LogSegment =
  | { type: "plain"; text: string }
  | { type: "highlight"; text: string }
  | { type: "reward"; text: string }
  | { type: "danger"; text: string }
  | { type: "good"; text: string };

type LogEntry = { time: string; segments: LogSegment[] };

const ITEM_TICK_MS   = 12_000;
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

const INITIAL_LOGS: LogEntry[] = [
  { time: "17:51", segments: [{ type: "highlight", text: "마나 결정(중급)" }, { type: "plain", text: " ×2 획득 — " }, { type: "reward", text: "+120 BSS 상당" }] },
  { time: "17:48", segments: [{ type: "plain", text: "폐허 탐색 중 " }, { type: "danger", text: "변이체(2단계) 조우" }, { type: "plain", text: " — 자동 회피 성공" }] },
  { time: "17:44", segments: [{ type: "highlight", text: "고대 유물 파편" }, { type: "plain", text: " 발견 — 유물 복원 스킬 적용 중" }] },
  { time: "17:38", segments: [{ type: "plain", text: "폐허 탐색 " }, { type: "good", text: "Lv.12 달성" }, { type: "plain", text: " — 탐색 속도 +5%" }] },
  { time: "17:21", segments: [{ type: "plain", text: "순환_기공사_렌 에게 " }, { type: "highlight", text: "정화수 ×1" }, { type: "plain", text: " 수령 — " }, { type: "good", text: "마나 피폭 -8%" }] },
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

function fmtCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Content() {
  const [elapsed,      setElapsed]      = useState(4 * 3600 + 32 * 60 + 17);
  const [progress,     setProgress]     = useState(67);
  const [itemPct,      setItemPct]      = useState(0);
  const [countdownMs,  setCountdownMs]  = useState(ITEM_TICK_MS);
  const [logs,         setLogs]         = useState<LogEntry[]>(INITIAL_LOGS);

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
      setCountdownMs(Math.max(0, ITEM_TICK_MS - sinceStart));

      if (sinceStart >= ITEM_TICK_MS) {
        const entry = { ...LOOT_POOL[lootIdx.current % LOOT_POOL.length], time: nowHHMM() };
        lootIdx.current += 1;
        setLogs(prev => [entry, ...prev].slice(0, 20));
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

        <div className="activity-card">
          <div className="activity-elapsed">◷ {fmtElapsed(elapsed)}</div>
          <div className="activity-card-inner">

            <div className="activity-zone">
              <div className="activity-zone-art">
                {"░▒▓█▓▒░\n▒▓████▓▒\n▓██████▓\n▒▓████▓▒\n░▒▓█▓▒░"
                  .split("\n").map((row, i) => <div key={i}>{row}</div>)}
              </div>
              <div className="activity-zone-label">상업 구획</div>
            </div>

            <div className="activity-main">
              <div className="activity-name">상업 구획 폐건물</div>

              <div className="activity-gauge-item">
                <div className="progress-bar progress-bar--item">
                  <div className="progress-fill--item" style={{ width: `${itemPct}%` }} />
                </div>
              </div>

              <div className="activity-gauge-explore">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="activity-badges">
                <span className="badge badge--loot">◈ 마나 결정 ×{14 + lootIdx.current}</span>
                <span className="badge badge--explore">▣ 탐색 {progress.toFixed(1)}%</span>
              </div>
            </div>

          </div>
        </div>

        <div className="log-card">
          <div className="log-card-title">══ 최근 활동 로그 ══</div>
          <div className="log-card-inner">
            {logs.map((entry, i) => (
              <div key={i} className={`log-item${i === 0 ? " log-item--new" : ""}`}>
                <span className="log-time">{entry.time}</span>
                <span className="log-text">
                  {entry.segments.map((seg, j) =>
                    seg.type === "plain"
                      ? <span key={j}>{seg.text}</span>
                      : <span key={j} className={seg.type}>{seg.text}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
