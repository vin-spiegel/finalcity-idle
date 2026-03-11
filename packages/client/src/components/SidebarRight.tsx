export default function SidebarRight() {
  return (
    <div className="sidebar-right">
      <div className="chat-header">
        <div className="chat-tabs">
          <button className="chat-tab active">공용</button>
          <button className="chat-tab">야영지</button>
          <button className="chat-tab">순환회</button>
          <button className="chat-tab">귓속말</button>
        </div>
        <div className="chat-info">
          <span><span className="online-dot"></span>키르타스 평원 · 1,847명 접속</span>
          <span style={{ color: '#2a3545' }}>≋ 공용 주파수</span>
        </div>
      </div>

      <div className="chat-messages">
        <div className="msg-system">⚠ 마나 폭풍 경보 발령 — 북서 방향</div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name blue">방랑자_카이</span>
            <span className="msg-time">17:42</span>
          </div>
          <div className="msg-body">야영지 3구역 모닥불 자리 남았음<br />변이 염소 치즈도 구웠는데 가져갈 사람</div>
        </div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name red">적야_세리온</span>
            <span className="msg-time">17:43</span>
          </div>
          <div className="msg-body"><em>Khai-misu mata?</em> 치즈 같은 걸 먹어<br />고기나 가져와</div>
        </div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name blue">방랑자_카이</span>
            <span className="msg-time">17:43</span>
          </div>
          <div className="msg-body">Khai-misu mata는 네가 더 어울리는데</div>
        </div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name white">순환_기공사_렌</span>
            <span className="msg-time">17:45</span>
          </div>
          <div className="msg-body">폭풍 전에 마나 피폭 수치 확인들 하세요<br />정화수 나눠드릴게요 야영지 3구역으로</div>
        </div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name yellow">카르자트_하이루</span>
            <span className="msg-time">17:46</span>
          </div>
          <div className="msg-body">정화수라니. 순환회 물은 믿을 수가 없음</div>
        </div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name white">순환_기공사_렌</span>
            <span className="msg-time">17:46</span>
          </div>
          <div className="msg-body">...드시기 싫으시면 안 드셔도 됩니다</div>
        </div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name blue">방랑자_카이</span>
            <span className="msg-time">17:48</span>
          </div>
          <div className="msg-body">ㅋㅋㅋ 렌 참을성 늘었네<br />아무튼 모닥불 쪽으로들 와요<br />오늘 폭풍 꽤 클 것 같으니까</div>
        </div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name red">적야_세리온</span>
            <span className="msg-time">17:49</span>
          </div>
          <div className="msg-body">...가긴 감</div>
        </div>

        <div className="msg-system">🟤 방랑 상인이 야영지 3구역에 도착했습니다</div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name brown">??? 방랑상인</span>
            <span className="msg-time">17:50</span>
          </div>
          <div className="msg-body"><em>Rakh sin khai!</em> 오늘 특산품 많이 가져왔어요~<br />파이널 시티 지도도 있습니다</div>
        </div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name blue">방랑자_카이</span>
            <span className="msg-time">17:50</span>
          </div>
          <div className="msg-body">또 가짜 지도지?</div>
        </div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name brown">??? 방랑상인</span>
            <span className="msg-time">17:51</span>
          </div>
          <div className="msg-body">이번엔 진짜임을 제 영혼석에 맹세합니다</div>
        </div>

        <div className="msg">
          <div className="msg-header">
            <span className="msg-name red">적야_세리온</span>
            <span className="msg-time">17:51</span>
          </div>
          <div className="msg-body">ㅋㅋㅋㅋㅋ</div>
        </div>
      </div>

      <div className="chat-input-area">
        <div className="channel-tabs">
          <button className="ch-tab active">공용</button>
          <button className="ch-tab">야영지</button>
          <button className="ch-tab">순환회</button>
          <button className="ch-tab">적야</button>
          <button className="ch-tab">카르자트</button>
        </div>
        <div className="input-row">
          <input className="chat-input" placeholder="메시지 입력... (공용 채널)" />
          <button className="send-btn">전송</button>
        </div>
      </div>
    </div>
  );
}
