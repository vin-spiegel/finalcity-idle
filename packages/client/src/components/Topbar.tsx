import { Bell, ScrollText, MessageSquare } from 'lucide-react';
import avatar from '../assets/image.png';
import type { LogEntry } from '../types/log';
import type { SidebarTab } from '../App';

const NOTIF_COUNT = 3;

type Props = {
  logs: LogEntry[];
  sidebarOpen: boolean;
  activeTab: SidebarTab;
  onTabClick: (tab: SidebarTab) => void;
};

export default function Topbar({ logs, sidebarOpen, activeTab, onTabClick }: Props) {
  const isActive = (tab: SidebarTab) => sidebarOpen && activeTab === tab;

  return (
    <div className="topbar">
      <div className="top-stat-group">
        <div className="top-char-img">
          <img src={avatar} alt="Profile" />
        </div>
        <span className="top-name">방랑자_카이 Lv.27</span>
        <span className="top-sep">::</span>
        <span className="top-stat">HP 720/1000</span>
        <span className="top-sep">::</span>
        <span className="top-stat">피로 38%</span>
        <span className="top-sep">::</span>
        <span className="top-stat">영혼 3/5</span>
      </div>

      <div className="top-spacer" />

      <div className="top-stat-group">
        <span className="top-res">◆ 14</span>
        <span className="top-res">💎 2,340 BSS</span>
      </div>

      <div className="top-divider">|</div>

      <div className="top-loc">키르타스 평원 3구역</div>

      <div className="top-divider">|</div>

      <div className="topbar-actions">
        <button
          className={`topbar-icon-btn${isActive('notif') ? ' active' : ''}`}
          onClick={() => onTabClick('notif')}
          title="알림"
        >
          <Bell size={13} />
          <span className="topbar-badge topbar-badge--alert">{NOTIF_COUNT}</span>
        </button>

        <button
          className={`topbar-icon-btn${isActive('log') ? ' active' : ''}`}
          onClick={() => onTabClick('log')}
          title="활동 로그"
        >
          <ScrollText size={13} />
          <span className="topbar-badge">{logs.length}</span>
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
