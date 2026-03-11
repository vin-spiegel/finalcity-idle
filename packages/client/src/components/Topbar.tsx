type ResourceItem = {
  cls: string;
  icon: string;
  label: string;
  value: string;
  unit?: string;
};

const RESOURCES: ResourceItem[] = [
  { cls: "resource-soul",    icon: "◈", label: "영혼석",   value: "2,340", unit: "BSS" },
  { cls: "resource-crystal", icon: "◆", label: "마나 결정", value: "14" },
  { cls: "resource-mana",    icon: "▲", label: "피폭",     value: "38%" },
];

type NavItem = { label: string; active?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "캐릭터", active: true },
  { label: "지도" },
  { label: "교역" },
  { label: "팩션" },
  { label: "비길레스" },
];

export default function Topbar() {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="logo">
          <span className="logo-final">FINAL</span>
          <span className="logo-sep">▓</span>
          <span className="logo-city">CITY</span>
        </div>
        <nav className="nav-links">
          {NAV_ITEMS.map(({ label, active }) => (
            <button key={label} className={`nav-btn${active ? " active" : ""}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="topbar-center">
        <div className="online-info">
          <span className="online-dot" />
          키르타스 평원 · 1,847명
        </div>
      </div>

      <div className="topbar-right">
        <div className="resource-bar">
          {RESOURCES.map(({ cls, icon, label, value, unit }, i) => (
            <>
              {i > 0 && <div key={`div-${i}`} className="resource-divider">│</div>}
              <div key={cls} className={`resource-item ${cls}`}>
                <span className="resource-icon">{icon}</span>
                <span className="resource-label">{label}</span>
                <span className="resource-val">{value}</span>
                {unit && <span className="resource-unit">{unit}</span>}
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
