import { useState, useEffect } from 'react';
import { Trophy, Heart, Coffee, Sparkle, Fire } from '@phosphor-icons/react';
import { Reveal } from './motion';
import { useI18n } from '../i18n';

export interface Supporter {
  id: string;
  name: string;
  avatar?: string;
  tier: 'legend' | 'hero' | 'backer';
  amount?: string;
  message?: string;
  date: string;
}

// Danh sách mẫu ban đầu
export const DEFAULT_SUPPORTERS: Supporter[] = [
  {
    id: '1',
    name: 'QuackForge Founder',
    tier: 'legend',
    amount: 'Founder Tier',
    message: 'Tiếp lửa máy chủ & AI hạ tầng ban đầu cho ThreadScore.',
    date: '2026',
  },
  {
    id: '2',
    name: 'ModelMart.io.vn',
    tier: 'legend',
    amount: 'Community Partner',
    message: 'Đồng hành phát triển và tối ưu trải nghiệm AI.',
    date: '2026',
  },
  {
    id: '3',
    name: 'Ẩn danh đáng yêu 🦆',
    tier: 'hero',
    amount: '10 ☕ Cà phê',
    message: 'Tool quét Threads quá tiện, chúc dự án phát triển!',
    date: '2026',
  },
  {
    id: '4',
    name: 'Threads Fan 007',
    tier: 'backer',
    amount: '5 ☕ Cà phê',
    message: 'Ủng hộ nhóm tác giả duy trì API DeepSeek!',
    date: '2026',
  },
];

export function getStoredSupporters(): Supporter[] {
  if (typeof window === 'undefined') return DEFAULT_SUPPORTERS;
  try {
    const raw = localStorage.getItem('ts_supporters');
    if (!raw) return DEFAULT_SUPPORTERS;
    const parsed = JSON.parse(raw) as Supporter[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SUPPORTERS;
  } catch {
    return DEFAULT_SUPPORTERS;
  }
}

interface HallOfFameProps {
  onOpenDonate?: () => void;
}

export default function HallOfFame({ onOpenDonate }: HallOfFameProps) {
  const { t } = useI18n();
  const [supporters, setSupporters] = useState<Supporter[]>(getStoredSupporters);

  useEffect(() => {
    const handleStorage = () => setSupporters(getStoredSupporters());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <section className="section" id="hall-of-fame">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className="section-eyebrow">
              <Trophy size={16} weight="fill" color="var(--accent)" />{' '}
              {t('hof.eyebrow')}
            </span>
            <h2 className="section-title">{t('hof.title')}</h2>
            <p className="section-subtitle">{t('hof.subtitle')}</p>
          </div>
        </Reveal>

        <div className="hof-grid">
          {supporters.map((supporter, idx) => (
            <Reveal key={supporter.id} delay={idx * 0.08}>
              <div className={`hof-card hof-${supporter.tier}`}>
                <div className="hof-card-head">
                  <div className="hof-avatar">
                    {supporter.tier === 'legend' ? (
                      <Fire size={22} weight="fill" color="#F05A28" />
                    ) : supporter.tier === 'hero' ? (
                      <Sparkle size={20} weight="fill" color="#E5484D" />
                    ) : (
                      <Coffee size={20} weight="fill" color="var(--calm-ink)" />
                    )}
                  </div>
                  <div className="hof-meta">
                    <h4 className="hof-name">{supporter.name}</h4>
                    <span className="hof-tier-badge">
                      {supporter.amount || (supporter.tier === 'legend' ? 'Legend' : 'Supporter')}
                    </span>
                  </div>
                </div>
                {supporter.message && <p className="hof-message">“{supporter.message}”</p>}
                <div className="hof-footer">
                  <span className="hof-date">{supporter.date}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3}>
          <div className="hof-cta-box">
            <p>{t('hof.cta')}</p>
            {onOpenDonate && (
              <button type="button" className="btn btn-primary" onClick={onOpenDonate}>
                <Heart size={16} weight="fill" /> {t('hof.ctaBtn')}
              </button>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
