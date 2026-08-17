import { useEffect, useState } from 'react';
import { WarningCircle, Fire, ChatCircleDots, Lightning } from '@phosphor-icons/react';
import { apiGet } from '../api';
import SearchBox from '../components/SearchBox';
import ThreadCard from '../components/ThreadCard';
import OverallHeat from '../components/OverallHeat';
import HallOfFame from '../components/HallOfFame';
import DonateModal from '../components/DonateModal';
import { Reveal, CountUp } from '../components/motion';
import { useI18n } from '../i18n';
import type { ThreadRecord, OverallStats } from '../../shared/types';

export default function HomePage() {
  const { t, lang } = useI18n();
  const [threads, setThreads] = useState<ThreadRecord[]>([]);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [sort, setSort] = useState<'newest' | 'hottest' | 'most_comments'>('hottest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDonateOpen, setIsDonateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ threads: ThreadRecord[] }>(`/api/threads?sort=${sort}`)
      .then((r) => {
        if (!cancelled) {
          setThreads(r.threads);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || t('feed.error'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sort, lang, t]);

  useEffect(() => {
    let cancelled = false;
    apiGet<OverallStats>('/api/stats')
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const avg = stats?.avg_anger ?? null;

  return (
    <div className="page">
      {/* 1. HERO SECTION - split copy + live heat console */}
      <section className="hero" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-7)' }}>
        <div className="hero-grid">
          <Reveal>
            <div>
              <h1 className="hero-title">
                {lang === 'vi' ? (
                  <>Đo nhiệt độ &amp; cảm xúc <span className="accent">thảo luận</span> trên Threads</>
                ) : (
                  <>Measure sentiment &amp; <span className="accent">flame</span> on Threads</>
                )}
              </h1>
              <p className="hero-subtitle">{t('hero.subtitle')}</p>
              <div className="hero-cta">
                <a className="btn btn-primary" href="#explore">
                  <Fire weight="fill" aria-hidden="true" /> {t('hero.ctaExplore')}
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="hero-console" aria-hidden={stats == null}>
              <div className="console-head">
                <span>{t('hero.consoleLive')}</span>
                <span className="mono">{t('hero.consoleUpdated')}</span>
              </div>
              <div className="console-big">
                <span className="num">{avg != null ? <CountUp to={Math.round(avg)} /> : '--'}</span>
                <span className="unit">/100 {t('hero.consolePoints')}</span>
              </div>
              <div className="console-track" role="presentation" />
              <div className="console-ticks">
                <span>0</span>
                <span>30</span>
                <span>70</span>
                <span>100</span>
              </div>
              <div className="console-cols">
                <div className="console-chip">
                  <span className="t">{t('stats.bang')}</span>
                  <span className="v anger">{stats ? stats.breakdown.bang_no : '--'}</span>
                </div>
                <div className="console-chip">
                  <span className="t">{t('stats.trunglap')}</span>
                  <span className="v neutral">{stats ? stats.breakdown.trung_lap : '--'}</span>
                </div>
                <div className="console-chip">
                  <span className="t">{t('stats.vuive')}</span>
                  <span className="v calm">{stats ? stats.breakdown.vui_ve : '--'}</span>
                </div>
                <div className="console-chip">
                  <span className="t">{t('hero.consoleComments')}</span>
                  <span className="v">{stats ? <CountUp to={stats.comments} /> : '--'}</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="spectrum">
          <span className="spectrum-item">
            <span className="spectrum-dot anger" /> {t('stats.bang')} <span className="spectrum-range">70-100</span>
          </span>
          <span className="spectrum-item">
            <span className="spectrum-dot neutral" /> {t('stats.trunglap')} <span className="spectrum-range">30-69</span>
          </span>
          <span className="spectrum-item">
            <span className="spectrum-dot calm" /> {t('stats.vuive')} <span className="spectrum-range">0-29</span>
          </span>
        </div>
      </section>

      {/* 2. EXPLORE FEED - Thread Posts Feed */}
      <section className="section-tight" id="explore" style={{ paddingTop: 'var(--space-4)' }}>
        <div className="container">
          <Reveal>
            <div className="section-head left" style={{ maxWidth: 'none', marginBottom: 'var(--space-5)' }}>
              <h2 className="section-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
                {t('feed.title')}
              </h2>
            </div>
          </Reveal>

          <div className="sort-tabs" role="tablist">
            {(['hottest', 'newest', 'most_comments'] as const).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={sort === s}
                className={`sort-tab${sort === s ? ' active' : ''}`}
                onClick={() => setSort(s)}
              >
                {s === 'hottest'
                  ? t('feed.sort.hottest')
                  : s === 'newest'
                  ? t('feed.sort.latest')
                  : t('feed.sort.comments')}
              </button>
            ))}
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <WarningCircle aria-hidden="true" /> {error}
            </div>
          )}
          {loading ? (
            <div className="skeleton-list">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ) : (
            <>
              {threads.map((tItem, i) => (
                <Reveal key={tItem.id} delay={(i % 3) * 0.08}>
                  <ThreadCard thread={tItem} />
                </Reveal>
              ))}
              {threads.length === 0 && !error && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <ChatCircleDots size={48} weight="duotone" color="var(--accent)" />
                  </div>
                  <p className="empty-title">{t('feed.empty')}</p>
                  <p className="empty-subtitle">{t('feed.emptyHint')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* 3. VISUAL STATISTICS SECTION - Dedicated Community Heat Index */}
      {stats && (
        <section className="section" id="community-stats" style={{ paddingTop: 'var(--space-8)' }}>
          <div className="container">
            <Reveal>
              <div className="section-head">
                <span className="section-eyebrow">
                  <Lightning size={16} weight="fill" color="var(--accent)" />
                  {t('stats.eyebrow')}
                </span>
                <h2 className="section-title">{t('stats.title')}</h2>
                <p className="section-subtitle">{t('stats.subtitle')}</p>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <OverallHeat stats={stats} />
            </Reveal>
          </div>
        </section>
      )}

      {/* 4. BENTO STATS SECTION */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="section-eyebrow">{t('bento.eyebrow')}</span>
              <h2 className="section-title">{t('bento.title')}</h2>
            </div>
          </Reveal>
          <div className="bento">
            <Reveal className="bento-1">
              <div
                className="bento-card bento-plain"
                style={{ background: 'linear-gradient(135deg, var(--anger-soft), var(--surface-raised))' }}
              >
                <span className="big-num" style={{ color: 'var(--anger-ink)' }}>
                  {stats ? <CountUp to={stats.threads} /> : '--'}
                </span>
                <h3>{t('bento.totalThreads')}</h3>
                <p>{t('bento.totalThreadsDesc')}</p>
              </div>
            </Reveal>
            <Reveal className="bento-2" delay={0.08}>
              {stats?.top_threads[0] ? (
                <a
                  href={`/t/${stats.top_threads[0].id}`}
                  className="bento-card bento-plain bento-featured-dark bento-link"
                >
                  <div className="bento-body">
                    <span className="bento-kicker">
                      <Fire size={16} weight="fill" /> {t('bento.hottest')}
                    </span>
                    <h3>{stats.top_threads[0].title ?? t('sb.fallback')}</h3>
                    <p className="mono">
                      {stats.top_threads[0].avg_anger_score?.toFixed(0)}/100 {t('bento.heatScore')} · {t('bento.viewReport')}
                    </p>
                  </div>
                </a>
              ) : (
                <div className="bento-card bento-plain bento-featured-dark">
                  <div className="bento-body">
                    <span className="bento-kicker">
                      <Fire size={16} weight="fill" /> {t('bento.hottest')}
                    </span>
                    <h3>{t('bento.awaiting')}</h3>
                  </div>
                </div>
              )}
            </Reveal>
            <Reveal className="bento-3" delay={0.04}>
              <div className="bento-card bento-plain bento-featured-slate">
                <div className="bento-body">
                  <span className="bento-kicker">
                    <Lightning size={16} weight="fill" /> {t('bento.totalComments')}
                  </span>
                  <h3 className="mono">{stats ? <CountUp to={stats.comments} /> : '--'}</h3>
                  <p>{t('bento.updated')}</p>
                </div>
              </div>
            </Reveal>
            <Reveal className="bento-4" delay={0.08}>
              <div
                className="bento-card bento-plain"
                style={{ background: 'linear-gradient(135deg, var(--calm-soft), var(--surface-raised))' }}
              >
                <span className="big-num" style={{ color: 'var(--calm-ink)' }}>
                  {stats ? <CountUp to={stats.breakdown.vui_ve} /> : '--'}
                </span>
                <h3>{t('bento.positive')}</h3>
                <p>{t('bento.positiveDesc')}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section className="section" id="how">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="section-eyebrow">{t('how.eyebrow')}</span>
              <h2 className="section-title">{t('how.title')}</h2>
            </div>
          </Reveal>
          <div className="how-grid">
            {[
              {
                key: 'step1',
                icon: 'scrape',
                t: t('how.step1.title'),
                d: t('how.step1.desc'),
              },
              {
                key: 'step2',
                icon: 'score',
                t: t('how.step2.title'),
                d: t('how.step2.desc'),
              },
              {
                key: 'step3',
                icon: 'heat',
                t: t('how.step3.title'),
                d: t('how.step3.desc'),
              },
            ].map((s, i) => (
              <Reveal key={s.key} delay={i * 0.12}>
                <div className="how-step">
                  <span className="step-badge">
                    {s.icon === 'scrape' ? (
                      <ChatCircleDots size={22} weight="bold" />
                    ) : s.icon === 'score' ? (
                      <Lightning size={22} weight="bold" />
                    ) : (
                      <Fire size={22} weight="fill" />
                    )}
                  </span>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HALL OF FAME */}
      <HallOfFame onOpenDonate={() => setIsDonateOpen(true)} />

      {/* 7. ACTION CTA BANNER */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="cta-banner">
              <h2>{t('cta.title')}</h2>
              <p>{t('cta.subtitle')}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const el = document.getElementById('searchbox-input');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.focus();
                  }
                }}
              >
                <Fire weight="fill" aria-hidden="true" /> {t('cta.btn')}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <DonateModal isOpen={isDonateOpen} onClose={() => setIsDonateOpen(false)} />
    </div>
  );
}
