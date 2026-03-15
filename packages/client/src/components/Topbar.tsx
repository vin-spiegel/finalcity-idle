import { Bell, MessageSquare, Twitter } from 'lucide-react';
import avatar from '../assets/image.png';
import type { SidebarTab } from '../App';
import { useGame, CIRCLE_CIRCUMFERENCE } from '../context/GameContext';

const NOTIF_COUNT = 3;

type Props = {
  sidebarOpen: boolean;
  activeTab: SidebarTab;
  onTabClick: (tab: SidebarTab) => void;
};

export default function Topbar({ sidebarOpen, activeTab, onTabClick }: Props) {
  const { state, circleTickRef, zones } = useGame();
  const { character, resources, currentAction, isExploring } = state;

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

      {activeZone && (
        <div className="top-action-status">
          <span className="top-action-dot">◉</span>
          <span className="top-action-label">{activeZone.actionType ?? '탐험'}</span>
          <span className="top-action-sep">·</span>
          <span className="top-action-zone">{activeZone.name}</span>
        </div>
      )}

      <div className="top-spacer" />

      <svg className="top-circle-tick" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="12" fill="none" stroke="var(--border-dim)" strokeWidth="2" />
        <circle
          ref={circleTickRef}
          cx="14" cy="14" r="12"
          fill="none"
          stroke="var(--cyan)"
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
