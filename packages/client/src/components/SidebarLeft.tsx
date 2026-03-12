import avatar from '../assets/image.png';

type Skill = { name: string; lv: number; pct: number; active?: boolean };

const SKILLS: Skill[] = [
  { name: "폐허 탐색",    lv: 12, pct: 67, active: true },
  { name: "마나 결정 채굴", lv: 8,  pct: 30, active: true },
  { name: "변이 식물 채집", lv: 5,  pct: 55 },
  { name: "유물 복원",    lv: 3,  pct: 12 },
  { name: "변이 조리",    lv: 6,  pct: 80 },
];

export default function SidebarLeft() {
  return (
    <div className="sidebar-left">
      <div className="char-card">
        <div className="char-portrait">
          <img src={avatar} alt="캐릭터" />
        </div>
        <div className="char-name">방랑자_카이</div>
        <div className="char-level">Lv.27</div>
      </div>

      <div className="divider" />
      <div className="section-title">생존 기술</div>

      {SKILLS.map(({ name, lv, pct, active }) => (
        <div key={name}>
          <div className={`skill-item${active ? " active-skill" : ""}`}>
            <span>{name}</span>
            <span className="skill-lv">Lv.{lv}</span>
          </div>
          <div className="skill-progress">
            <div className="skill-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ))}

    </div>
  );
}
