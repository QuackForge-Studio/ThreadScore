import { useState, useEffect } from 'react';
import { Trophy, Heart, Coffee, Sparkle, Fire, Crown, Quotes, CalendarBlank, HandHeart, Star } from '@phosphor-icons/react';
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
          <div className="section-head hof-section-head">
            <span className="section-eyebrow hof-eyebrow-badge">
              <Trophy size={16} weight="fill" /> {t('hof.eyebrow')}
            </span>
            <h2 className="section-title">{t('hof.title')}</h2>
            <p className="section-subtitle">{t('hof.subtitle')}</p>
          </div>
        </Reveal>

        <div className="hof-grid">
          {supporters.map((supporter, idx) => {
            const isLegend = supporter.tier === 'legend';
            const isHero = supporter.tier === 'hero';

            return (
              <Reveal key={supporter.id} delay={idx * 0.07}>
                <div className={`hof-card hof-tier-${supporter.tier}`}>
                  <div className="hof-card-glow" />
                  
                  <div className="hof-card-head">
                    <div className={`hof-avatar hof-avatar-${supporter.tier}`}>
                      {supporter.avatar ? (
                        <img src={supporter.avatar} alt={supporter.name} className="hof-avatar-img" />
                      ) : isLegend ? (
                        <Crown size={22} weight="fill" />
                      ) : isHero ? (
                        <Sparkle size={20} weight="fill" />
                      ) : (
                        <Coffee size={20} weight="fill" />
                      )}
                    </div>
                    <div className="hof-meta">
                      <div className="hof-name-row">
                        <h4 className="hof-name">{supporter.name}</h4>
                        {isLegend && <span className="hof-vip-pill">VIP</span>}
                      </div>
                      <span className={`hof-tier-badge hof-badge-${supporter.tier}`}>
                        {isLegend ? (
                          <Fire size={12} weight="fill" />
                        ) : isHero ? (
                          <Star size={12} weight="fill" />
                        ) : (
                          <Coffee size={12} weight="fill" />
                        )}
                        {supporter.amount || (isLegend ? 'Legend' : isHero ? 'Hero' : 'Supporter')}
                      </span>
                    </div>
                  </div>

                  <div className="hof-card-body">
                    {supporter.message ? (
                      <div className="hof-message-box">
                        <Quotes size={15} weight="fill" className="hof-quote-icon" />
                        <p className="hof-message">{supporter.message}</p>
                      </div>
                    ) : (
                      <div className="hof-message-box hof-message-empty">
                        <p className="hof-message-placeholder">
                          {t('hof.silentSupporter')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="hof-footer">
                    <span className="hof-date">
                      <CalendarBlank size={13} weight="bold" /> {supporter.date}
                    </span>
                    <span className="hof-rank-tag">
                      {isLegend ? '🔥 Flame Sponsor' : isHero ? '⭐ Warm Backer' : '☕ Coffee Supporter'}
                    </span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.25}>
          <div className="hof-cta-box">
            <div className="hof-cta-glow-bg" />
            <div className="hof-cta-content">
              <div className="hof-cta-icon-wrap">
                <HandHeart size={26} weight="fill" />
              </div>
              <div className="hof-cta-text">
                <h3 className="hof-cta-title">{t('hof.cta')}</h3>
                <p className="hof-cta-desc">{t('hof.ctaDesc')}</p>
              </div>
            </div>
            {onOpenDonate && (
              <button type="button" className="btn btn-primary hof-cta-btn" onClick={onOpenDonate}>
                <Heart size={18} weight="fill" />
                <span>{t('hof.ctaBtn')}</span>
              </button>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
