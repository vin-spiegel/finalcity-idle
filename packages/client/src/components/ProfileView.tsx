import { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import avatar from '../assets/image.png';

const SKILL_NAMES: Record<string, string> = {
  searcher: '탐험 (수색자)',
  technician: '작업 (기술자)',
  scholar: '조사 (학자)',
  lumberjack: '벌목 (벌목꾼)',
  miner: '채굴 (채굴꾼)',
};

const SKILL_MILESTONES: Record<string, { level: number; label: string }[]> = {
  searcher: [{ level: 20, label: '공허 구역' }],
  scholar: [{ level: 15, label: '고대 연구소' }],
  lumberjack: [
    { level: 10, label: '변이 식물' },
    { level: 30, label: '금단의 숲' },
  ],
  miner: [
    { level: 15, label: '마나석 광맥' },
    { level: 35, label: '심층 동굴' },
  ],
};

export default function ProfileView() {
  const { state, zones } = useGame();
  const { character, equipment, skills } = state;

  // jobType → display label from zone data (fallback for names not in SKILL_NAMES)
  const jobLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const z of zones) {
      if (z.jobType && z.actionType && !map[z.jobType]) {
        map[z.jobType] = z.actionType;
      }
    }
    return map;
  }, [zones]);

  const hpPct = (character.hp / character.maxHp) * 100;
  const expPct = (character.exp / character.maxExp) * 100;

  return (
    <div className="content">
      <div className="content-header" style={{ padding: '16px', display: 'flex', gap: 16 }}>
        <img src={avatar} alt="Avatar" style={{ width: 80, height: 80, border: '1px solid var(--border-color)', objectFit: 'cover' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>{character.name}</div>
          <div style={{ color: 'var(--color-highlight)' }}>순환회 탐색자</div>
        </div>
      </div>

      <div className="content-body" style={{ padding: '0 16px 24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
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
          <h3 style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>스킬 숙련도</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(SKILL_NAMES).map(([id, name]) => {
              const level = skills[id] ?? 0;
              const milestones = SKILL_MILESTONES[id] || [];
              const nextMilestone = milestones.find(m => m.level > level);
              const milestoneLevel = nextMilestone ? nextMilestone.level : (Math.floor(level / 10) + 1) * 10;
              const progressPct = Math.min((level / milestoneLevel) * 100, 100);
              const isLocked = level === 0;
              const displayName = name || jobLabels[id] || id;

              return (
                <div key={id} style={{ opacity: isLocked ? 0.45 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{displayName}</span>
                    <span style={{ color: 'var(--color-highlight)' }}>Lv.{level.toFixed(2)}</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6, marginBottom: 4 }}>
                    <div className="progress-fill" style={{ width: `${progressPct}%`, backgroundColor: 'var(--cyan-dim)' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'right' }}>
                    {nextMilestone ? `${nextMilestone.label}까지 Lv.${(nextMilestone.level - level).toFixed(2)} 남음` : '최대 숙련'}
                  </div>
                </div>
              );
            })}
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

      </div>
    </div>
  );
}
