import { useState } from "react";
import type { LogEntry } from "../types/log";

type ChannelTab = { label: string; active?: boolean };
type MsgColor   = "blue" | "red" | "white" | "yellow" | "brown";
type ChatMsg    =
  | { type: "system"; text: string }
  | { type: "msg"; name: string; color: MsgColor; time: string; body: string };

const CHANNEL_TABS: ChannelTab[] = [
  { label: "공용",   active: true },
  { label: "야영지" },
  { label: "순환회" },
  { label: "적야" },
  { label: "카르자트" },
];

const MESSAGES: ChatMsg[] = [
  { type: "system", text: "═══ 마나 폭풍 경보 발령 — 북서 방향 ═══" },
  { type: "msg", name: "방랑자_카이",     color: "blue",   time: "17:42", body: "야영지 3구역 모닥불 자리 남았음\n변이 염소 치즈도 구웠는데 가져갈 사람" },
  { type: "msg", name: "적야_세리온",     color: "red",    time: "17:43", body: "Khai-misu mata? 치즈 같은 걸 먹어\n고기나 가져와" },
  { type: "msg", name: "방랑자_카이",     color: "blue",   time: "17:43", body: "Khai-misu mata는 네가 더 어울리는데" },
  { type: "msg", name: "순환_기공사_렌",  color: "white",  time: "17:45", body: "폭풍 전에 마나 피폭 수치 확인들 하세요\n정화수 나눠드릴게요 야영지 3구역으로" },
  { type: "msg", name: "카르자트_하이루", color: "yellow", time: "17:46", body: "정화수라니. 순환회 물은 믿을 수가 없음" },
  { type: "msg", name: "순환_기공사_렌",  color: "white",  time: "17:46", body: "...드시기 싫으시면 안 드셔도 됩니다" },
  { type: "msg", name: "방랑자_카이",     color: "blue",   time: "17:48", body: "ㅋㅋㅋ 렌 참을성 늘었네\n아무튼 모닥불 쪽으로들 와요\n오늘 폭풍 꽤 클 것 같으니까" },
  { type: "msg", name: "적야_세리온",     color: "red",    time: "17:49", body: "...가긴 감" },
  { type: "system", text: "═══ 방랑 상인이 야영지 3구역에 도착했습니다 ═══" },
  { type: "msg", name: "??? 방랑상인",    color: "brown",  time: "17:50", body: "Rakh sin khai! 오늘 특산품 많이 가져왔어요~\n파이널 시티 지도도 있습니다" },
  { type: "msg", name: "방랑자_카이",     color: "blue",   time: "17:50", body: "또 가짜 지도지?" },
  { type: "msg", name: "??? 방랑상인",    color: "brown",  time: "17:51", body: "이번엔 진짜임을 제 영혼석에 맹세합니다" },
  { type: "msg", name: "적야_세리온",     color: "red",    time: "17:51", body: "ㅋㅋㅋㅋㅋ" },
];

type Props = { logs: LogEntry[] };

export default function SidebarRight({ logs }: Props) {
  const [tab, setTab] = useState<"log" | "chat">("log");

  return (
    <div className="sidebar-right">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab${tab === "log" ? " sidebar-tab--active" : ""}`}
          onClick={() => setTab("log")}
        >
          로그
        </button>
        <button
          className={`sidebar-tab${tab === "chat" ? " sidebar-tab--active" : ""}`}
          onClick={() => setTab("chat")}
        >
          채팅
        </button>
      </div>

      {tab === "log" ? (
        <div className="sidebar-log">
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
      ) : (
        <>
          <div className="chat-messages">
            {MESSAGES.map((m, i) =>
              m.type === "system" ? (
                <div key={i} className="msg-system">{m.text}</div>
              ) : (
                <div key={i} className="msg">
                  <div className="msg-header">
                    <span className={`msg-name ${m.color}`}>{m.name}</span>
                    <span className="msg-time">{m.time}</span>
                  </div>
                  <div className="msg-body">
                    {m.body.split("\n").map((line, j) => (
                      <span key={j}>{line}{j < m.body.split("\n").length - 1 && <br />}</span>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

          <div className="chat-input-area">
            <div className="channel-tabs">
              {CHANNEL_TABS.map(({ label, active }) => (
                <button key={label} className={`ch-tab${active ? " active" : ""}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="input-row">
              <input className="chat-input" placeholder="메시지 입력... (공용 채널)" />
              <button className="send-btn">전송</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
