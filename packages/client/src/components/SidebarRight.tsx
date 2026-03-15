import { useState, useEffect, useRef, useCallback } from 'react';
import type { SidebarTab } from '../App';
import { useGame } from '../context/GameContext';

// ── Notifications ────────────────────────────────────────

const NOTIFS = [
  { id: 1, kind: 'alert',  icon: '⚠', label: 'STORM ALERT', text: '마나 폭풍 북서 방향 접근 중',       sub: '도달 예상 1시간 47분',  time: '17:45' },
  { id: 2, kind: 'loot',   icon: '◆', label: '아이템',       text: '마나 결정(중급) ×2 획득',           sub: '+120 BSS 상당',          time: '17:51' },
  { id: 3, kind: 'combat', icon: '⚡', label: '전투',         text: '변이체(2단계) 자동 회피 성공',      sub: '',                       time: '17:48' },
];

// ── Chat ─────────────────────────────────────────────────

type ChatMsg = { id: number; username: string; body: string; time: string };
type S2C = { type: 'history'; messages: ChatMsg[] } | { type: 'message'; msg: ChatMsg };

function buildWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws`;
}

// ── Component ────────────────────────────────────────────

type Props = { activeTab: SidebarTab };

export default function SidebarRight({ activeTab }: Props) {
  const { state } = useGame();
  const username = state.character.name;

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input,    setInput]    = useState('');
  const wsRef      = useRef<WebSocket | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);

  // Connect WS once
  useEffect(() => {
    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      const data: S2C = JSON.parse(evt.data);
      if (data.type === 'history') {
        setMessages(data.messages);
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, data.msg]);
      }
    };

    return () => ws.close();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(() => {
    const body = input.trim();
    if (!body || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'send', userId: null, username, body }));
    setInput('');
  }, [input, username]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

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
            {messages.map(m => (
              <div key={m.id} className="msg">
                <div className="msg-header">
                  <span className="msg-name white">{m.username}</span>
                  <span className="msg-time">{m.time}</span>
                </div>
                <div className="msg-body">{m.body}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-area">
            <div className="input-row">
              <input
                className="chat-input"
                placeholder="메시지 입력..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
              />
              <button className="send-btn" onClick={send}>전송</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
