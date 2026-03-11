import avatar from '../assets/image.png';

type Stat = { label: string; value: string; fillClass: string; pct: number };
type Skill = { name: string; lv: number; pct: number; active?: boolean };
type MenuItem = { icon: string; label: string; active?: boolean };

const STATS: Stat[] = [
  { label: "HP",    value: "720 / 1000", fillClass: "hp-fill",   pct: 72 },
  { label: "피폭",  value: "38%",        fillClass: "mana-fill", pct: 38 },
  { label: "영혼",  value: "3 / 5",      fillClass: "soul-fill", pct: 60 },
];

const STAT_VALUE_CLASS: Record<string, string> = {
  "hp-fill":   "",
  "mana-fill": "stat-val--danger",
  "soul-fill": "stat-val--soul",
};

const SKILLS: Skill[] = [
  { name: "폐허 탐색",    lv: 12, pct: 67, active: true },
  { name: "마나 결정 채굴", lv: 8,  pct: 30, active: true },
  { name: "변이 식물 채집", lv: 5,  pct: 55 },
  { name: "유물 복원",    lv: 3,  pct: 12 },
  { name: "변이 조리",    lv: 6,  pct: 80 },
];

const MENU_ITEMS: MenuItem[] = [
  { icon: "◎", label: "개요",     active: true },
  { icon: "▣", label: "인벤토리" },
  { icon: "◈", label: "장비" },
  { icon: "▤", label: "탐사 로그" },
  { icon: "◉", label: "팩션 평판" },
  { icon: "◆", label: "업적" },
];

export default function SidebarLeft() {
  return (
    <div className="sidebar-left">
      <div className="char-card">
        <div className="char-portrait">
          <img src={avatar} alt="캐릭터" />
        </div>
        <div className="char-name">방랑자_카이</div>
        <div className="char-faction">◈ 무소속 방랑자 · Lv.27</div>

        {STATS.map(({ label, value, fillClass, pct }) => (
          <div key={label}>
            <div className="stat-row">
              <span className="stat-label">{label}</span>
              <span className={`stat-value ${STAT_VALUE_CLASS[fillClass]}`}>{value}</span>
            </div>
            <div className="stat-bar">
              <div
                className={`stat-fill ${fillClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
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

      <div className="divider" />
      <div className="section-title">메뉴</div>

      {MENU_ITEMS.map(({ icon, label, active }) => (
        <div key={label} className={`menu-item${active ? " active" : ""}`}>
          <span className="menu-icon">{icon}</span>
          {label}
        </div>
      ))}
    </div>
  );
}
