import { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import avatar from '../assets/image.png';

export default function ProfileView() {
  const { state, zones } = useGame();
  const { character, equipment, skills } = state;

  // jobType → display label from zone data
  const jobLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const z of zones) {
      if (z.jobType && z.actionType && !map[z.jobType]) {
        map[z.jobType] = z.actionType;
      }
    }
    return map;
  }, [zones]);

  const skillEntries = Object.entries(skills).filter(([, v]) => v > 0);

  const hpPct = (character.hp / character.maxHp) * 100;
  const expPct = (character.exp / character.maxExp) * 100;

  return (
    <div className="content">
      <div className="content-header" style={{ padding: '16px', display: 'flex', gap: 16 }}>
        <img src={avatar} alt="Avatar" style={{ width: 80, height: 80, border: '1px solid var(--border-color)', objectFit: 'cover' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>{character.name}</div>
          <div style={{ color: 'var(--color-highlight)' }}>탐색자</div>
        </div>
      </div>

      <div className="content-body" style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        <div style={{ border: '1px solid var(--border-color)', padding: 16, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <h3 style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>상태</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
            <span>체력 (HP)</span>
            <span>{character.hp} / {character.maxHp}</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 12 }}>
            <div className="progress-fill" style={{ width: `${hpPct}%`, background: 'var(--color-danger)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
            <span>경험치 (EXP)</span>
            <span>{character.exp} / {character.maxExp}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${expPct}%` }} />
          </div>
        </div>

        <div style={{ border: '1px solid var(--border-color)', padding: 16, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <h3 style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>장비</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ width: 40, height: 40, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🗡
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>무기</div>
                <div style={{ fontSize: 14 }}>{equipment.weapon ? equipment.weapon.name : '장착 안 됨'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ width: 40, height: 40, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🛡
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>방어구</div>
                <div style={{ fontSize: 14 }}>{equipment.armor ? equipment.armor.name : '장착 안 됨'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ width: 40, height: 40, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                💍
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>장신구</div>
                <div style={{ fontSize: 14 }}>{equipment.accessory ? equipment.accessory.name : '장착 안 됨'}</div>
              </div>
            </div>

          </div>
        </div>

        {skillEntries.length > 0 && (
          <div style={{ border: '1px solid var(--border-color)', padding: 16, backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>잡포 (직업 숙련도)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {skillEntries.map(([jobType, level]) => (
                <div key={jobType}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span>{jobLabels[jobType] ?? jobType}</span>
                    <span style={{ color: 'var(--color-highlight)' }}>Lv.{level.toFixed(2)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(level % 1) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}