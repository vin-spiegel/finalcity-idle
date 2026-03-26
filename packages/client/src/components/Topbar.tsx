import { Bell, MessageSquare, Twitter, Volume2, VolumeX } from 'lucide-react';
import avatar from '../assets/image.png';
import type { SidebarTab } from '../App';
import { useGame, CIRCLE_CIRCUMFERENCE } from '../context/GameContext';
import { useState, useRef, useEffect } from 'react'; // useState: volOpen용

const NOTIF_COUNT = 3;

type Props = {
  sidebarOpen: boolean;
  activeTab: SidebarTab;
  onTabClick: (tab: SidebarTab) => void;
  partySlot1: string | null;
  onNavigateToActive: () => void;
  volume: number;
  muted: boolean;
  setVolume: (v: number) => void;
  setMuted: (m: boolean | ((prev: boolean) => boolean)) => void;
};

export default function Topbar({ sidebarOpen, activeTab, onTabClick, partySlot1, onNavigateToActive, volume, muted, setVolume, setMuted }: Props) {
  const { state, circleTickRef, zones, navigateToActiveRef } = useGame();
  const { character, resources, currentAction, isExploring } = state;

  const [volOpen, setVolOpen] = useState(false);
  const volRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!volOpen) return;
    const handler = (e: MouseEvent) => {
      if (volRef.current && !volRef.current.contains(e.target as Node)) {
        setVolOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [volOpen]);

  const isActive = (tab: SidebarTab) => sidebarOpen && activeTab === tab;

  const activeZone = isExploring
    ? zones.find(z => z.id === currentAction.zoneId)
    : null;

  return (
    <div className="topbar">
      <div className="top-stat-group">
        <div className="top-char-img">
          <img src={avatar} alt="Profile" />
        </div>
        <span className="top-name">{character.name}</span>
      </div>

      <div className="top-spacer" />

      {activeZone && (
        <div className="top-action-status" onClick={() => { onNavigateToActive(); navigateToActiveRef.current?.(); }} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="top-action-dot">◉</span>
            <span className="top-action-label">{activeZone.actionType ?? '탐험'}</span>
            <span className="top-action-sep">·</span>
            <span className="top-action-zone">{activeZone.name}</span>
          </div>
          {partySlot1 && partySlot1 !== "__player__" && (
            <div style={{ fontSize: 9, color: "var(--amber-dim)", opacity: 0.6, paddingLeft: 2 }}>
              동행 · {partySlot1.split("_")[1] ?? partySlot1}
            </div>
          )}
        </div>
      )}

      <svg className="top-circle-tick" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="12" fill="none" stroke="var(--border-dim)" strokeWidth="2" />
        <circle
          ref={circleTickRef}
          cx="14" cy="14" r="12"
          fill="none"
          stroke="var(--amber-dim)"
          strokeWidth="2"
          strokeDasharray={CIRCLE_CIRCUMFERENCE}
          strokeDashoffset={CIRCLE_CIRCUMFERENCE}
          strokeLinecap="round"
          transform="rotate(-90 14 14)"
        />
      </svg>

      <div className="top-divider">|</div>

      <div className="top-stat-group">
        <span className="top-res">◆ {(resources.mana_crystal ?? 0).toLocaleString()}</span>
        <span className="top-res">💎 {(resources.bss ?? 0).toLocaleString()}</span>
      </div>

      <div className="top-divider">|</div>

      <div className="topbar-actions">
        <div className="topbar-vol-wrap" ref={volRef}>
          <button
            className={`topbar-icon-btn${volOpen ? ' active' : ''}`}
            onClick={() => setVolOpen(v => !v)}
            title="볼륨"
          >
            {muted || volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          {volOpen && (
            <div className="topbar-vol-popup">
              <button
                className={`vol-mute-btn${muted ? ' muted' : ''}`}
                onClick={() => setMuted(m => !m)}
                title={muted ? '음소거 해제' : '음소거'}
              >
                {muted || volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
              <input
                className="vol-slider"
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
              />
              <span className="vol-label">{muted ? 0 : volume}</span>
            </div>
          )}
        </div>

        <button
          className="topbar-icon-btn"
          onClick={() => window.open('https://x.com/finalcity_game', '_blank')}
          title="About Us"
        >
          <Twitter size={13} />
        </button>

        <button
          className={`topbar-icon-btn${isActive('notif') ? ' active' : ''}`}
          onClick={() => onTabClick('notif')}
          title="알림"
        >
          <Bell size={13} />
          <span className="topbar-badge topbar-badge--alert">{NOTIF_COUNT}</span>
        </button>

        <button
          className={`topbar-icon-btn${isActive('chat') ? ' active' : ''}`}
          onClick={() => onTabClick('chat')}
          title="채팅"
        >
          <MessageSquare size={13} />
        </button>
      </div>
    </div>
  );
}
