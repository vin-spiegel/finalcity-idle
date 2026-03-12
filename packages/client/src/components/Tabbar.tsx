import { Map, Package, User } from 'lucide-react';

export type TabbarTab = 'map' | 'inventory' | 'profile';

const TABS: { id: TabbarTab; label: string; Icon: React.ElementType }[] = [
  { id: 'map',       label: '지도',      Icon: Map     },
  { id: 'inventory', label: '인벤토리',  Icon: Package },
  { id: 'profile',   label: '프로필',    Icon: User    },
];

type Props = {
  activeTab: TabbarTab;
  onTabClick: (tab: TabbarTab) => void;
};

export default function Tabbar({ activeTab, onTabClick }: Props) {
  return (
    <div className="tabbar">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`tabbar-btn${activeTab === id ? ' active' : ''}`}
          onClick={() => onTabClick(id)}
        >
          <Icon size={20} strokeWidth={1.5} />
          <span className="tabbar-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
