import { useCallback, useEffect, useRef, useState } from 'react';
import Topbar from './components/Topbar';
import SidebarLeft from './components/SidebarLeft';
import Content from './components/Content';
import SidebarRight from './components/SidebarRight';
import CRTOverlay from './components/CRTOverlay';

import { INITIAL_LOGS } from './types/log';
import type { LogEntry } from './types/log';

export type SidebarTab = 'notif' | 'log' | 'chat';

const SIDEBAR_LEFT_DEFAULT  = 220;
const SIDEBAR_RIGHT_DEFAULT = 280;
const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;

export default function App() {
  const [leftW,       setLeftW]       = useState(SIDEBAR_LEFT_DEFAULT);
  const [rightW,      setRightW]      = useState(SIDEBAR_RIGHT_DEFAULT);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab,   setActiveTab]   = useState<SidebarTab>('chat');
  const [logs,        setLogs]        = useState<LogEntry[]>(INITIAL_LOGS);

  const savedRightW = useRef(SIDEBAR_RIGHT_DEFAULT);

  const handleLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [entry, ...prev].slice(0, 20));
  }, []);

  // Clicking a topbar icon:
  //   closed             → open + switch tab
  //   open + same tab    → close
  //   open + other tab   → switch tab
  const handleTabClick = useCallback((tab: SidebarTab) => {
    setSidebarOpen(prev => {
      if (!prev) {
        setRightW(savedRightW.current);
        setActiveTab(tab);
        return true;
      }
      if (activeTab === tab) {
        savedRightW.current = rightW;
        setRightW(0);
        return false;
      }
      setActiveTab(tab);
      return true;
    });
  }, [activeTab, rightW]);

  const dragging = useRef<'left' | 'right' | null>(null);
  const startX   = useRef(0);
  const startW   = useRef(0);

  const onMouseDown = useCallback(
    (side: 'left' | 'right') => (e: React.MouseEvent) => {
      dragging.current = side;
      startX.current   = e.clientX;
      startW.current   = side === 'left' ? leftW : rightW;
      e.preventDefault();
    },
    [leftW, rightW]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const next  = Math.min(
        SIDEBAR_MAX,
        Math.max(SIDEBAR_MIN, startW.current + (dragging.current === 'left' ? delta : -delta))
      );
      if (dragging.current === 'left')  setLeftW(next);
      else                              setRightW(next);
    };
    const onUp = () => { dragging.current = null; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []);

  return (
    <div className="app-container">
      <Topbar
        logs={logs}
        sidebarOpen={sidebarOpen}
        activeTab={activeTab}
        onTabClick={handleTabClick}
      />
      <div
        className="main"
        style={{ gridTemplateColumns: `${leftW}px 1fr ${sidebarOpen ? rightW : 0}px` }}
      >
        <SidebarLeft />
        <Content onLog={handleLog} />
        <SidebarRight logs={logs} activeTab={activeTab} />

        <div
          className="resize-handle resize-handle--left"
          style={{ left: leftW - 2 }}
          onMouseDown={onMouseDown('left')}
        />
        {sidebarOpen && (
          <div
            className="resize-handle resize-handle--right"
            style={{ right: rightW - 2 }}
            onMouseDown={onMouseDown('right')}
          />
        )}
      </div>
      <CRTOverlay />
    </div>
  );
}
