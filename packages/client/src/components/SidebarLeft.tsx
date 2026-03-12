import { useState, useRef, Fragment } from 'react';
import {
  GripVertical, ChevronDown, ChevronUp,
  User, Backpack, Map,
  Axe, Pickaxe, Fish, FlaskConical, Flame, UtensilsCrossed, Hammer, Sparkles,
} from 'lucide-react';

// dataTransfer keys — readable in onDragEnter/onDragOver via .types[]
const DT_ITEM    = 'application/x-menu-item';
const DT_SECTION = 'application/x-menu-section';

// ── Types ──────────────────────────────────────────────────

type MenuItem  = { id: string; label: string; Icon: React.ElementType; active?: boolean };
type SkillItem = { id: string; label: string; Icon: React.ElementType; level: number; active?: boolean };
type SectionId = 'character' | 'party' | 'skills';
type Section   = { id: SectionId; label: string };

// ── Data ───────────────────────────────────────────────────

const INITIAL_SECTIONS: Section[] = [
  { id: 'character', label: 'Character' },
  { id: 'party',     label: 'Party' },
  { id: 'skills',    label: 'Skills' },
];

const INITIAL_CHAR: MenuItem[] = [
  { id: 'profile',   label: 'Profile',   Icon: User },
  { id: 'inventory', label: 'Inventory', Icon: Backpack },
  { id: 'map',       label: 'Map',       Icon: Map },
];

const INITIAL_SKILLS: SkillItem[] = [
  { id: 'woodcutting', label: 'Woodcutting', Icon: Axe,             level: 30, active: true },
  { id: 'mining',      label: 'Mining',      Icon: Pickaxe,         level: 1 },
  { id: 'fishing',     label: 'Fishing',     Icon: Fish,            level: 1 },
  { id: 'alchemy',     label: 'Alchemy',     Icon: FlaskConical,    level: 1 },
  { id: 'smelting',    label: 'Smelting',    Icon: Flame,           level: 1 },
  { id: 'cooking',     label: 'Cooking',     Icon: UtensilsCrossed, level: 1 },
  { id: 'forge',       label: 'Forge',       Icon: Hammer,          level: 1 },
  { id: 'meditation',  label: 'Meditation',  Icon: Sparkles,        level: 3 },
];

// ── Hooks ──────────────────────────────────────────────────

function useItemSort<T extends { id: string }>(initial: T[]) {
  const [items, setItems] = useState(initial);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fromRef = useRef<number | null>(null);
  const overRef = useRef<number | null>(null);

  const handlers = (i: number) => ({
    draggable: true as const,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(DT_ITEM, String(i));
      e.dataTransfer.effectAllowed = 'move';
      fromRef.current = i;
      setDragFrom(i);
    },
    onDragEnter: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DT_ITEM)) return;
      overRef.current = i;
      setDragOver(i);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DT_ITEM)) return;
      e.preventDefault();
    },
    onDragEnd: () => {
      if (
        fromRef.current !== null &&
        overRef.current !== null &&
        fromRef.current !== overRef.current
      ) {
        setItems(prev => {
          const next = [...prev];
          const [moved] = next.splice(fromRef.current!, 1);
          next.splice(overRef.current!, 0, moved);
          return next;
        });
      }
      fromRef.current = null;
      overRef.current = null;
      setDragFrom(null);
      setDragOver(null);
    },
  });

  return { items, handlers, dragFrom, dragOver };
}

function useSectionSort(initial: Section[]) {
  const [sections, setSections] = useState(initial);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fromRef = useRef<number | null>(null);
  const overRef = useRef<number | null>(null);

  // Put on the <span> grip wrapper (drag source)
  const gripHandlers = (i: number) => ({
    draggable: true as const,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.setData(DT_SECTION, String(i));
      e.dataTransfer.effectAllowed = 'move';
      fromRef.current = i;
    },
    onDragEnd: (e: React.DragEvent) => {
      e.stopPropagation();
      if (
        fromRef.current !== null &&
        overRef.current !== null &&
        fromRef.current !== overRef.current
      ) {
        setSections(prev => {
          const next = [...prev];
          const [moved] = next.splice(fromRef.current!, 1);
          next.splice(overRef.current!, 0, moved);
          return next;
        });
      }
      fromRef.current = null;
      overRef.current = null;
      setDragOver(null);
    },
    // Prevent click from toggling the parent button
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  });

  // Put on the section header button (drop target)
  const dropHandlers = (i: number) => ({
    onDragEnter: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DT_SECTION)) return;
      overRef.current = i;
      setDragOver(i);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DT_SECTION)) return;
      e.preventDefault();
    },
  });

  return { sections, gripHandlers, dropHandlers, dragOver };
}

// ── Component ──────────────────────────────────────────────

export default function SidebarLeft() {
  const [open, setOpen] = useState<Record<SectionId, boolean>>(
    { character: true, party: false, skills: true }
  );
  const toggle = (id: SectionId) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  const sec    = useSectionSort(INITIAL_SECTIONS);
  const chars  = useItemSort(INITIAL_CHAR);
  const skills = useItemSort(INITIAL_SKILLS);

  return (
    <div className="sidebar-left">
      {sec.sections.map((section, si) => {
        const isOpen = open[section.id];
        return (
          <Fragment key={section.id}>
            {sec.dragOver === si && (
              <div className="drag-divider drag-divider--section" />
            )}

            <div className="menu-section">
              <button
                className="menu-group-title"
                onClick={() => toggle(section.id)}
                {...sec.dropHandlers(si)}
              >
                {/* <span> wrapper as drag source — more reliable than SVG draggable */}
                <span className="menu-group-grip" {...sec.gripHandlers(si)}>
                  <GripVertical size={12} className="menu-group-icon" />
                </span>
                <span className="menu-group-name">{section.label}</span>
                {isOpen
                  ? <ChevronDown size={12} className="menu-group-arrow" />
                  : <ChevronUp   size={12} className="menu-group-arrow" />}
              </button>

              <div className={`menu-section-content${isOpen ? ' open' : ''}`}>
                <div className="menu-section-inner">

                  {section.id === 'character' && (
                    <div className="menu-list">
                      {chars.items.map((item, i) => (
                        <Fragment key={item.id}>
                          {chars.dragOver === i && chars.dragFrom !== i && (
                            <div className="drag-divider" />
                          )}
                          <div
                            className={`menu-item${item.active ? ' active' : ''}${chars.dragFrom === i ? ' is-dragging' : ''}`}
                            {...chars.handlers(i)}
                          >
                            <GripVertical size={13} className="menu-handle" />
                            <item.Icon size={14} className="menu-icon" />
                            <span className="menu-label">{item.label}</span>
                            {item.active && <div className="menu-active-dot" />}
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  )}

                  {section.id === 'party' && (
                    <div className="menu-list">
                      <div className="menu-empty">— 파티원 없음 —</div>
                    </div>
                  )}

                  {section.id === 'skills' && (
                    <div className="menu-list">
                      {skills.items.map((item, i) => (
                        <Fragment key={item.id}>
                          {skills.dragOver === i && skills.dragFrom !== i && (
                            <div className="drag-divider" />
                          )}
                          <div
                            className={`menu-item${item.active ? ' active' : ''}${skills.dragFrom === i ? ' is-dragging' : ''}`}
                            {...skills.handlers(i)}
                          >
                            <GripVertical size={13} className="menu-handle" />
                            <item.Icon size={14} className="menu-icon" />
                            <span className="menu-label">{item.label}</span>
                            <span className="menu-skill-level">Lv. {item.level}</span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
