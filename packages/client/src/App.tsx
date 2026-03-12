import { useCallback, useEffect, useRef, useState } from 'react';
import Topbar from './components/Topbar';
import Content from './components/Content';
import InventoryView from './components/InventoryView';
import ProfileView from './components/ProfileView';
import SidebarRight from './components/SidebarRight';
import Tabbar from './components/Tabbar';
import CRTOverlay from './components/CRTOverlay';
import { GameProvider, useGame } from './context/GameContext';

import type { TabbarTab } from './components/Tabbar';

export type SidebarTab = 'notif' | 'chat';

const SIDEBAR_RIGHT_DEFAULT = 280;
const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;

export default function App() {
  return (
    <GameProvider>
      <AppLayout />
    </GameProvider>
  );
}

function AppLayout() {
  const { globalBarRef } = useGame();
  const [rightW,      setRightW]      = useState(SIDEBAR_RIGHT_DEFAULT);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab,   setActiveTab]   = useState<SidebarTab>('chat');
  const [tabbarTab,   setTabbarTab]   = useState<TabbarTab>('map');

  const savedRightW = useRef(SIDEBAR_RIGHT_DEFAULT);

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

  const dragging    = useRef(false);
  const startX      = useRef(0);
  const startW      = useRef(0);
  const appRightRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      startX.current   = e.clientX;
      startW.current   = rightW;
      e.preventDefault();
    },
    [rightW]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !appRightRef.current) return;
      const delta = e.clientX - startX.current;
      const next  = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW.current - delta));
      appRightRef.current.style.width = `${next}px`;
    };
    const onUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const delta = e.clientX - startX.current;
      const next  = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW.current - delta));
      setRightW(next);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []);

  return (
    <div className="app-container">
      <div className="app-body">
        <div className="app-left">
          <Topbar
            sidebarOpen={sidebarOpen}
            activeTab={activeTab}
            onTabClick={handleTabClick}
          />
          <div className="global-tick-bar">
            <div ref={globalBarRef} className="global-tick-fill" />
          </div>
          <div className="main">
            {tabbarTab === 'map' && <Content />}
            {tabbarTab === 'inventory' && <InventoryView />}
            {tabbarTab === 'profile' && <ProfileView />}
          </div>
          <Tabbar activeTab={tabbarTab} onTabClick={setTabbarTab} />
        </div>

        <div
          ref={appRightRef}
          className="app-right"
          style={{ width: sidebarOpen ? rightW : 0 }}
        >
          {sidebarOpen && (
            <div
              className="resize-handle resize-handle--right"
              style={{ left: -2 }}
              onMouseDown={onMouseDown}
            />
          )}
          <SidebarRight activeTab={activeTab} />
        </div>
      </div>
      <CRTOverlay />
    </div>
  );
}
