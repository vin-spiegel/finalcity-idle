import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from './context/GameContext';
import Topbar from './components/Topbar';
import Content from './components/Content';
import InventoryView from './components/InventoryView';
import ProfileView from './components/ProfileView';
import SidebarRight from './components/SidebarRight';
import Tabbar from './components/Tabbar';
import CRTOverlay from './components/CRTOverlay';
import { GameProvider } from './context/GameContext';
import bgm from './assets/audio/Dunes of the Fifth Moon (1).mp3';
import { authClient } from './lib/auth-client';
import { api, type UserRow, type ExplorationStatus, type ZoneRow } from './lib/api';

import type { TabbarTab } from './components/Tabbar';

export type SidebarTab = 'notif' | 'chat';

const SIDEBAR_RIGHT_DEFAULT = 280;
const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;

export default function App() {
  const [ready,            setReady]            = useState(false);
  const [loggedIn,         setLoggedIn]         = useState(false);
  const [gameUser,         setGameUser]         = useState<UserRow | null>(null);
  const [initialStatus,    setInitialStatus]    = useState<ExplorationStatus>(null);
  const [initialResources, setInitialResources] = useState<Record<string, number>>({});
  const [initialSkills,    setInitialSkills]    = useState<Record<string, number>>({});
  const [initialZones,     setInitialZones]     = useState<ZoneRow[]>([]);

  useEffect(() => {
    // Single roundtrip: auth check + user + status + resources + zones
    api.init()
      .then(({ user, status, resources, skills, zones }) => {
        setGameUser(user);
        setInitialStatus(status);
        setInitialResources(resources);
        setInitialSkills(skills);
        setInitialZones(zones);
        setLoggedIn(true);
      })
      .catch(() => {
        // 401 = not logged in, other errors treated as logged out
        setLoggedIn(false);
      })
      .finally(() => setReady(true));
  }, []);

  // Show skeleton layout while loading (not a full-page blocker)
  if (!ready) return <AppSkeleton />;

  if (!loggedIn) return <LoginScreen />;

  return (
    <GameProvider
      username={gameUser?.username}
      initialStatus={initialStatus}
      initialResources={initialResources}
      initialSkills={initialSkills}
      initialZones={initialZones}
    >
      <AppLayout />
    </GameProvider>
  );
}

function AppSkeleton() {
  return (
    <div className="app-container">
      <div className="app-body">
        <div className="app-left">
          <div className="topbar">
            <div className="topbar-left">
              <div className="skeleton-line" style={{ width: 120, height: 12, margin: '4px 0' }} />
            </div>
            <div className="topbar-right">
              <div className="skeleton-line" style={{ width: 80, height: 12 }} />
            </div>
          </div>
          <div className="global-tick-bar" />
          <div className="main">
            <div className="content">
              <div className="content-header">
                <div className="breadcrumb-row">
                  <div className="skeleton-line" style={{ width: 100, height: 10 }} />
                </div>
              </div>
              <div className="content-body">
                <div className="map-preview-wrap">
                  <div style={{ width: '100%', height: '100%', background: 'var(--border)', opacity: 0.3 }} />
                </div>
                <div className="nav-list">
                  {[0.85, 0.6, 0.72, 0.5].map((w, i) => (
                    <div key={i} className="nav-row nav-row--skeleton">
                      <div className="nav-row-info">
                        <div className="skeleton-line" style={{ width: `${w * 100}%` }} />
                        <div className="skeleton-line skeleton-line--sm" style={{ width: '40%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="tabbar">
            {[0,1,2].map(i => (
              <div key={i} className="tabbar-btn">
                <div className="skeleton-line" style={{ width: 20, height: 20, margin: '0 auto' }} />
              </div>
            ))}
          </div>
        </div>
        <div className="app-right" style={{ width: SIDEBAR_RIGHT_DEFAULT }}>
          <div className="skeleton-line" style={{ width: '80%', height: 12, margin: 16 }} />
        </div>
      </div>
      <CRTOverlay />
    </div>
  );
}

function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setLoading(true);
    // In dev mode, reloading will trigger api.init() again.
    // The server's requireAuth bypass will then pick up the first user in the DB.
    window.location.reload();
  };

  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-title">FINAL CITY</div>
        <div className="login-subtitle">파이널 시티</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="login-btn" onClick={handleGoogleLogin} disabled={loading}>
            {loading ? '연결 중…' : 'Google로 로그인'}
          </button>
          <button 
            className="login-btn" 
            onClick={handleGuestLogin} 
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}
            disabled={loading}
          >
            게스트로 시작 (개발용)
          </button>
        </div>
      </div>
      <CRTOverlay />
    </div>
  );
}

function AppLayout() {
  const { state: { logs } } = useGame();

  type LogEntry = (typeof logs)[0];
  const [logToast,      setLogToast]      = useState<LogEntry | null>(null);
  const prevFirstLogRef = useRef<LogEntry | null>(null);

  // 새 로그 오면 바로 현재 토스트 교체 (queue 없음)
  useEffect(() => {
    if (logs.length === 0) { prevFirstLogRef.current = null; return; }
    if (logs[0] === prevFirstLogRef.current) return;
    prevFirstLogRef.current = logs[0];
    setLogToast(logs[0]);
  }, [logs]);

  useEffect(() => {
    if (!logToast) return;
    const t = setTimeout(() => setLogToast(null), 2200);
    return () => clearTimeout(t);
  }, [logToast]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState(80);
  const [muted,  setMuted]  = useState(false);

  useEffect(() => {
    const audio = new Audio(bgm);
    audio.loop = true;
    audio.volume = volume / 100;
    audioRef.current = audio;
    const play = () => { audio.play().catch(() => {}); };
    document.addEventListener('click', play, { once: true });
    return () => { document.removeEventListener('click', play); audio.pause(); };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = muted ? 0 : volume / 100;
  }, [volume, muted]);

  const [rightW,      setRightW]      = useState(SIDEBAR_RIGHT_DEFAULT);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab,   setActiveTab]   = useState<SidebarTab>('chat');
  const [tabbarTab,   setTabbarTab]   = useState<TabbarTab>('map');
  const [partySlot1,  setPartySlot1]  = useState<string | null>(null);

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
            partySlot1={partySlot1}
            onNavigateToActive={() => setTabbarTab('map')}
            volume={volume}
            muted={muted}
            setVolume={setVolume}
            setMuted={setMuted}
          />
          <div className="main">
            {logToast && (
              <div className="entry-toast entry-toast--log" aria-live="polite">
                {logToast.segments.map((seg, j) =>
                  seg.type === "plain"
                    ? <span key={j}>{seg.text}</span>
                    : <span key={j} className={seg.type}>{seg.text}</span>
                )}
              </div>
            )}
            {tabbarTab === 'map' && <Content partySlot1={partySlot1} setPartySlot1={setPartySlot1} />}
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
