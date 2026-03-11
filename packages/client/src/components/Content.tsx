export default function Content() {
  return (
    <div className="content">
      <div className="content-header">
        <div>
          <div className="page-title">키르타스 평원 — 야영지 3구역</div>
          <div className="page-sub">현재 위치 · 마나 농도 31% · 비교적 안전</div>
        </div>
        <div className="nearby-topbar">
          <div className="top-avatar blue">🧥</div>
          <div className="top-avatar red">🐺</div>
          <div className="top-avatar white">⚙️</div>
          <div className="top-avatar yellow">💎</div>
          <div className="top-avatar blue">🗺️</div>
          <div className="top-avatar-more">+29</div>
        </div>
      </div>

      <div className="alert-banner">
        <span className="alert-icon">⚠</span>
        마나 폭풍 경보 — 북서 방향 접근 중. 도달 예상: <strong>&nbsp;1시간 47분</strong>. 야영지 내 정화수 확보 권장.
      </div>

      <div className="activity-card">
        <div className="activity-header">
          <div className="activity-title">🔍 폐허 탐색 — 상업 구획 폐건물</div>
          <div className="activity-status">
            <div className="status-dot"></div>
            자동 진행 중
          </div>
        </div>
        <div className="progress-section">
          <div className="progress-label">
            <span>구획 탐색률</span>
            <span>67%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
        <div className="activity-meta">
          <div className="meta-item">⏱ 경과 <span className="meta-val">&nbsp;04:32:17</span></div>
          <div className="meta-item">💎 획득 <span className="meta-val">&nbsp;마나 결정 ×14</span></div>
          <div className="meta-item">📦 유물 <span className="meta-val">&nbsp;3점 발견</span></div>
          <div className="meta-item" style={{ color: '#bfa04a' }}>⚡ 다음 아이템 <span className="meta-val">&nbsp;&nbsp;0:08</span></div>
        </div>
      </div>

      <div className="log-card">
        <div style={{ fontSize: '12px', color: '#6a7588', marginBottom: '10px' }}>최근 활동 로그</div>
        <div className="log-item">
          <span className="log-time">17:51</span>
          <span className="log-text"><span className="highlight">마나 결정(중급)</span> ×2 획득 — <span className="reward">+120 BSS 상당</span></span>
        </div>
        <div className="log-item">
          <span className="log-time">17:48</span>
          <span className="log-text">폐허 탐색 중 <span className="danger">변이체(2단계) 조우</span> — 자동 회피 성공</span>
        </div>
        <div className="log-item">
          <span className="log-time">17:44</span>
          <span className="log-text"><span className="highlight">고대 유물 파편</span> 발견 — 유물 복원 스킬 적용 중</span>
        </div>
        <div className="log-item">
          <span className="log-time">17:38</span>
          <span className="log-text">폐허 탐색 <span className="good">Lv.12 달성</span> — 탐색 속도 +5%</span>
        </div>
        <div className="log-item">
          <span className="log-time">17:21</span>
          <span className="log-text">순환_기공사_렌 에게 <span className="highlight">정화수 ×1</span> 수령 — <span className="good">마나 피폭 -8%</span></span>
        </div>
      </div>
    </div>
  );
}
