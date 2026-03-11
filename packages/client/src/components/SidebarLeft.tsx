export default function SidebarLeft() {
  return (
    <div className="sidebar-left">
      <div className="char-card">
        <div className="char-portrait">🧥</div>
        <div className="char-name">방랑자_카이</div>
        <div className="char-faction">● 무소속 방랑자 · Lv.27</div>

        <div className="stat-row"><span className="stat-label">체력</span><span>720 / 1000</span></div>
        <div className="stat-bar"><div className="stat-fill hp-fill"></div></div>

        <div className="stat-row"><span className="stat-label">마나 피폭</span><span style={{ color: '#bf4a4a' }}>38%</span></div>
        <div className="stat-bar"><div className="stat-fill mana-fill"></div></div>

        <div className="stat-row"><span className="stat-label">영혼</span><span style={{ color: '#9a6adf' }}>3 / 5</span></div>
        <div className="stat-bar"><div className="stat-fill soul-fill"></div></div>
      </div>

      <div className="divider"></div>
      <div className="section-title">생존 기술</div>

      <div className="skill-item active-skill">
        <span>🔍 폐허 탐색</span>
        <span className="skill-lv">Lv.12</span>
      </div>
      <div className="skill-progress"><div className="skill-progress-fill" style={{ width: '67%' }}></div></div>

      <div className="skill-item active-skill">
        <span>⚗️ 마나 결정 채굴</span>
        <span className="skill-lv">Lv.8</span>
      </div>
      <div className="skill-progress"><div className="skill-progress-fill" style={{ width: '30%' }}></div></div>

      <div className="skill-item">
        <span>🌿 변이 식물 채집</span>
        <span className="skill-lv">Lv.5</span>
      </div>
      <div className="skill-progress"><div className="skill-progress-fill" style={{ width: '55%' }}></div></div>

      <div className="skill-item">
        <span>🔧 유물 복원</span>
        <span className="skill-lv">Lv.3</span>
      </div>
      <div className="skill-progress"><div className="skill-progress-fill" style={{ width: '12%' }}></div></div>

      <div className="skill-item">
        <span>🍖 변이 조리</span>
        <span className="skill-lv">Lv.6</span>
      </div>
      <div className="skill-progress"><div className="skill-progress-fill" style={{ width: '80%' }}></div></div>

      <div className="divider"></div>
      <div className="section-title">메뉴</div>

      <div className="menu-item active"><span className="menu-icon">⊞</span> 개요</div>
      <div className="menu-item"><span className="menu-icon">🎒</span> 인벤토리</div>
      <div className="menu-item"><span className="menu-icon">⚔️</span> 장비</div>
      <div className="menu-item"><span className="menu-icon">🗺️</span> 탐사 로그</div>
      <div className="menu-item"><span className="menu-icon">👥</span> 팩션 평판</div>
      <div className="menu-item"><span className="menu-icon">🏅</span> 업적</div>
    </div>
  );
}
