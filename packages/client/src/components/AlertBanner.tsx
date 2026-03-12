import { X } from 'lucide-react';

export type AlertEvent = {
  id: number;
  kind: 'storm' | 'npc' | 'system';
  text: string;
  sub?: string;
};

type Props = {
  events: AlertEvent[];
  onDismiss: (id: number) => void;
};

const KIND_ICON: Record<AlertEvent['kind'], string> = {
  storm:  '⚡',
  npc:    '◈',
  system: '▣',
};

const KIND_CLASS: Record<AlertEvent['kind'], string> = {
  storm:  'alert-banner--storm',
  npc:    'alert-banner--npc',
  system: 'alert-banner--system',
};

export default function AlertBanner({ events, onDismiss }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="alert-banner-stack">
      {events.map(ev => (
        <div key={ev.id} className={`alert-banner ${KIND_CLASS[ev.kind]}`}>
          <span className="alert-banner-icon">{KIND_ICON[ev.kind]}</span>
          <div className="alert-banner-body">
            <span className="alert-banner-text">{ev.text}</span>
            {ev.sub && <span className="alert-banner-sub">{ev.sub}</span>}
          </div>
          <button className="alert-banner-close" onClick={() => onDismiss(ev.id)}>
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
