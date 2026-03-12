import { useCallback, useEffect, useRef, useState } from "react";
import Topbar from "./components/Topbar";
import SidebarLeft from "./components/SidebarLeft";
import Content from "./components/Content";
import SidebarRight from "./components/SidebarRight";
import { INITIAL_LOGS } from "./types/log";
import type { LogEntry } from "./types/log";

const SIDEBAR_LEFT_DEFAULT  = 220;
const SIDEBAR_RIGHT_DEFAULT = 280;
const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;

export default function App() {
  const [leftW,  setLeftW]  = useState(SIDEBAR_LEFT_DEFAULT);
  const [rightW, setRightW] = useState(SIDEBAR_RIGHT_DEFAULT);
  const [logs,   setLogs]   = useState<LogEntry[]>(INITIAL_LOGS);

  const handleLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [entry, ...prev].slice(0, 20));
  }, []);

  const dragging = useRef<"left" | "right" | null>(null);
  const startX   = useRef(0);
  const startW   = useRef(0);

  const onMouseDown = useCallback(
    (side: "left" | "right") =>
      (e: React.MouseEvent) => {
        dragging.current = side;
        startX.current   = e.clientX;
        startW.current   = side === "left" ? leftW : rightW;
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
        Math.max(SIDEBAR_MIN, startW.current + (dragging.current === "left" ? delta : -delta))
      );
      if (dragging.current === "left")  setLeftW(next);
      else                              setRightW(next);
    };
    const onUp = () => { dragging.current = null; };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  return (
    <>
      <Topbar />
      <div
        className="main"
        style={{ gridTemplateColumns: `${leftW}px 1fr ${rightW}px` }}
      >
        <SidebarLeft />
        <Content onLog={handleLog} />
        <SidebarRight logs={logs} />

        <div
          className="resize-handle resize-handle--left"
          style={{ left: leftW - 2 }}
          onMouseDown={onMouseDown("left")}
        />
        <div
          className="resize-handle resize-handle--right"
          style={{ right: rightW - 2 }}
          onMouseDown={onMouseDown("right")}
        />
      </div>
    </>
  );
}
