import { useState, useMemo } from 'react';
import { useGame, RESOURCE_METADATA, type Item } from '../context/GameContext';

export default function InventoryView() {
  const { state } = useGame();
  const { inventory, resources } = state;
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const mergedInventory = useMemo(() => {
    const items: Item[] = [...inventory];
    
    Object.entries(resources).forEach(([key, qty]) => {
      if (qty <= 0) return;
      const meta = RESOURCE_METADATA[key];
      items.push({
        id: key,
        name: meta?.name ?? key,
        type: 'material',
        qty,
        grade: meta?.grade ?? 'common',
        desc: meta?.desc ?? '',
      });
    });
    
    return items;
  }, [inventory, resources]);

  const selected = mergedInventory.find(i => i.id === selectedItem);

  return (
    <div className="content">
      <div className="content-header">
        <h2 style={{ fontSize: 16, fontWeight: 'bold' }}>인벤토리</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <span className="top-res">◆ {Math.floor(resources.mana_crystal || 0)}</span>
          <span className="top-res">💎 {(resources.bss || 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="content-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', 
          gap: 8,
          padding: 16,
          backgroundColor: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color)',
          minHeight: 240,
          maxHeight: 400,
          overflowY: 'auto'
        }}>
          {mergedInventory.map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item.id)}
              style={{
                width: 48,
                height: 48,
                border: item.id === selectedItem ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: 20 }}>
                {item.id === 'bss' ? '💎' : item.type === 'material' ? '📦' : item.type === 'consumable' ? '🧪' : '🗡'}
              </div>
              {item.qty >= 1 && (
                <span style={{ 
                  position: 'absolute', 
                  bottom: 2, 
                  right: 4, 
                  fontSize: 10,
                  color: item.grade === 'epic' ? '#ffd700' : 'var(--text-dim)',
                  fontWeight: item.grade === 'epic' ? 'bold' : 'normal'
                }}>
                  {item.qty < 1 ? item.qty.toFixed(1) : Math.floor(item.qty)}
                </span>
              )}
            </div>
          ))}
          {Array.from({ length: Math.max(0, 30 - mergedInventory.length) }).map((_, i) => (
            <div key={`empty-${i}`} style={{
              width: 48,
              height: 48,
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(0,0,0,0.1)',
            }} />
          ))}
        </div>

        {selected && (
          <div style={{
            padding: 16,
            border: '1px solid var(--border-color)',
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, color: selected.grade === 'epic' ? '#ffd700' : 'var(--color-highlight)' }}>{selected.name}</h3>
              <span className={`badge`} style={{ 
                fontSize: 10, 
                backgroundColor: selected.grade === 'epic' ? '#ffd700' : undefined,
                color: selected.grade === 'epic' ? '#000' : undefined
              }}>
                {selected.grade.toUpperCase()}
              </span>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              수량: {selected.qty < 1 ? selected.qty.toFixed(2) : Math.floor(selected.qty)}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.4, marginTop: 8 }}>
              {selected.desc}
            </p>
            {selected.type === 'consumable' && (
              <button className="zone-row-expanded-header" style={{ marginTop: 12, width: 'fit-content', padding: '4px 12px', cursor: 'pointer', background: 'var(--color-primary)', color: '#000', border: 'none' }}>
                사용하기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}