import { useState } from 'react';
import type { SidebarTab } from '../App';

// ── Notifications ────────────────────────────────────────

const NOTIFS = [
  { id: 1, kind: 'alert',  icon: '⚠', label: 'STORM ALERT', text: '마나 폭풍 북서 방향 접근 중',       sub: '도달 예상 1시간 47분',  time: '17:45' },
  { id: 2, kind: 'loot',   icon: '◆', label: '아이템',       text: '마나 결정(중급) ×2 획득',           sub: '+120 BSS 상당',          time: '17:51' },
  { id: 3, kind: 'combat', icon: '⚡', label: '전투',         text: '변이체(2단계) 자동 회피 성공',      sub: '',                       time: '17:48' },
];

// ── Chat ─────────────────────────────────────────────────

type ChannelTab = string;
type MsgColor   = 'blue' | 'red' | 'white' | 'yellow' | 'brown';
type ChatMsg    =
  | { type: 'system'; text: string }
  | { type: 'msg'; name: string; color: MsgColor; time: string; body: string };

const CHANNEL_TABS: ChannelTab[] = ['공용', '야영지', '순환회', '적야', '카르자트'];

const MESSAGES: ChatMsg[] = [
  { type: 'system', text: '═══ 마나 폭풍 경보 발령 — 북서 방향 ═══' },
  { type: 'msg', name: '방랑자_카이',     color: 'blue',   time: '17:42', body: '야영지 3구역 모닥불 자리 남았음\n변이 염소 치즈도 구웠는데 가져갈 사람' },
  { type: 'msg', name: '적야_세리온',     color: 'red',    time: '17:43', body: 'Khai-misu mata? 치즈 같은 걸 먹어\n고기나 가져와' },
  { type: 'msg', name: '방랑자_카이',     color: 'blue',   time: '17:43', body: 'Khai-misu mata는 네가 더 어울리는데' },
  { type: 'msg', name: '순환_기공사_렌',  color: 'white',  time: '17:45', body: '폭풍 전에 마나 피폭 수치 확인들 하세요\n정화수 나눠드릴게요 야영지 3구역으로' },
  { type: 'msg', name: '카르자트_하이루', color: 'yellow', time: '17:46', body: '정화수라니. 순환회 물은 믿을 수가 없음' },
  { type: 'msg', name: '순환_기공사_렌',  color: 'white',  time: '17:46', body: '...드시기 싫으시면 안 드셔도 됩니다' },
  { type: 'msg', name: '방랑자_카이',     color: 'blue',   time: '17:48', body: 'ㅋㅋㅋ 렌 참을성 늘었네\n아무튼 모닥불 쪽으로들 와요\n오늘 폭풍 꽤 클 것 같으니까' },
  { type: 'msg', name: '적야_세리온',     color: 'red',    time: '17:49', body: '...가긴 감' },
  { type: 'system', text: '═══ 방랑 상인이 야영지 3구역에 도착했습니다 ═══' },
  { type: 'msg', name: '??? 방랑상인',    color: 'brown',  time: '17:50', body: 'Rakh sin khai! 오늘 특산품 많이 가져왔어요~\n파이널 시티 지도도 있습니다' },
  { type: 'msg', name: '방랑자_카이',     color: 'blue',   time: '17:50', body: '또 가짜 지도지?' },
  { type: 'msg', name: '??? 방랑상인',    color: 'brown',  time: '17:51', body: '이번엔 진짜임을 제 영혼석에 맹세합니다' },
  { type: 'msg', name: '적야_세리온',     color: 'red',    time: '17:51', body: 'ㅋㅋㅋㅋㅋ' },
];

// ── Component ────────────────────────────────────────────

type Props = {
  activeTab: SidebarTab;
};

export default function SidebarRight({ activeTab }: Props) {
  const [channel, setChannel] = useState('공용');

  return (
    <div className="sidebar-right">

      {/* ── Notifications ── */}
      {activeTab === 'notif' && (
        <div className="sidebar-panel">
          <div className="sidebar-panel-header">알림</div>
          {NOTIFS.map(n => (
            <div key={n.id} className={`notif-item notif-item--${n.kind}`}>
              <span className="notif-icon">{n.icon}</span>
              <div className="notif-body">
                <span className="notif-label">{n.label}</span>
                <span className="notif-text">{n.text}</span>
                {n.sub && <span className="notif-sub">{n.sub}</span>}
              </div>
              <span className="notif-time">{n.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Chat ── */}
      {activeTab === 'chat' && (
        <>
          <div className="chat-messages">
            {MESSAGES.map((m, i) =>
              m.type === 'system' ? (
                <div key={i} className="msg-system">{m.text}</div>
              ) : (
                <div key={i} className="msg">
                  <div className="msg-header">
                    <span className={`msg-name ${m.color}`}>{m.name}</span>
                    <span className="msg-time">{m.time}</span>
                  </div>
                  <div className="msg-body">
                    {m.body.split('\n').map((line, j, arr) => (
                      <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

          <div className="chat-input-area">
            <div className="channel-tabs">
              {CHANNEL_TABS.map(label => (
                <button
                  key={label}
                  className={`ch-tab${channel === label ? ' active' : ''}`}
                  onClick={() => setChannel(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="input-row">
              <input className="chat-input" placeholder={`메시지 입력... (${channel} 채널)`} />
              <button className="send-btn">전송</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
