export default function Topbar() {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="logo">FINAL<span>CITY</span></div>
        <div className="nav-links">
          <button className="nav-btn active">캐릭터</button>
          <button className="nav-btn">지도</button>
          <button className="nav-btn">교역</button>
          <button className="nav-btn">팩션</button>
          <button className="nav-btn">비길레스</button>
        </div>
      </div>
      <div className="topbar-right">
        <div className="soul-stone">
          <div className="ss-dot"></div>
          영혼석 &nbsp;<strong>2,340</strong> BSS
        </div>
        <div className="user-badge">
          <div className="faction-dot wanderer"></div>
          방랑자_카이 &nbsp;·&nbsp; Lv.27
        </div>
      </div>
    </div>
  );
}
