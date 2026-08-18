import { useEffect, useState } from 'react';
import {
  WarningCircle,
  Fire,
  ChatCircleDots,
  Lightning,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { apiGet } from '../api';
import SearchBox from '../components/SearchBox';
import ThreadCard from '../components/ThreadCard';
import OverallHeat from '../components/OverallHeat';
import HallOfFame from '../components/HallOfFame';
import DonateModal from '../components/DonateModal';
import { Reveal, CountUp } from '../components/motion';
import { useI18n } from '../i18n';
import type { ThreadRecord, OverallStats } from '../../shared/types';

const PAGE_SIZE = 10;

export default function HomePage() {
  const { t, lang } = useI18n();
  const [threads, setThreads] = useState<ThreadRecord[]>([]);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [sort, setSort] = useState<'newest' | 'hottest' | 'most_comments'>('hottest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDonateOpen, setIsDonateOpen] = useState(false);

  // Khi đổi sort thì reset về trang 1
  function handleSortChange(newSort: 'newest' | 'hottest' | 'most_comments') {
    if (newSort !== sort) {
      setSort(newSort);
      setPage(1);
    }
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    const el = document.getElementById('explore');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGet<{ threads: ThreadRecord[]; total?: number; totalPages?: number }>(
      `/api/threads?sort=${sort}&page=${page}&limit=${PAGE_SIZE}`
    )
      .then((r) => {
        if (!cancelled) {
          setThreads(r.threads);
          if (r.totalPages !== undefined) setTotalPages(r.totalPages);
          if (r.total !== undefined) setTotalCount(r.total);
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
  }, [sort, page, lang, t]);

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
  const heatTier: 'low' | 'mid' | 'high' = avg == null ? 'mid' : avg < 30 ? 'low' : avg < 70 ? 'mid' : 'high';
  const isHot = (avg ?? 0) >= 60;
  const statusText = avg == null
    ? t('hero.flameNoData')
    : avg < 30
    ? t('hero.flameStatusLow')
    : avg < 70
    ? t('hero.flameStatusMid')
    : t('hero.flameStatusHigh');

  // Tạo danh sách số trang thông minh
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="page">
      {/* 1. HERO SECTION - Minimalist single flame heat metric */}
      <section className="hero" style={{ paddingTop: 'var(--space-7)', paddingBottom: 'var(--space-6)' }}>
        {/* Visual Hero Graphic: Ngọn lửa & Điểm nóng trực tiếp trên nền */}
        <Reveal>
          <div className="hero-heat-stage-wrap">
            <div className={`hero-heat-stage theme-${heatTier} ${isHot ? 'is-hot' : ''}`}>
              {/* Quầng nhiệt radial gradient phía sau ngọn lửa */}
              <div className="hero-heat-glow" />

              {/* Sóng nhiệt uốn lượn hữu cơ (organic heat ripples / waves) */}
              <div className="hero-heat-waves" aria-hidden="true">
                <div className="heat-wave wave-1" />
                <div className="heat-wave wave-2" />
                <div className="heat-wave wave-3" />
              </div>

              {/* Hạt than hồng / sparks bay lên khi điểm nóng tăng */}
              <div className="hero-heat-sparks" aria-hidden="true">
                <span className="spark spark-1" />
                <span className="spark spark-2" />
                <span className="spark spark-3" />
                <span className="spark spark-4" />
                <span className="spark spark-5" />
                <span className="spark spark-6" />
              </div>

              <div className="hero-heat-inner">
                {/* 1. Label trung tâm: ĐIỂM NÓNG HÔM NAY · ˚ */}
                <div className="hero-heat-label">
                  <span>{t('hero.flameLabel')}</span>
                  <span className="hero-heat-sparkle" aria-hidden="true">· ˚</span>
                </div>

                {/* 2. Visual Ngọn lửa trung tâm */}
                <div className="hero-flame-visual-wrap">
                  <div className="hero-flame-icon-box">
                    <svg className="hero-flame-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="flameGradHot" x1="0%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor={heatTier === 'low' ? '#2A6F8E' : heatTier === 'mid' ? '#F05A28' : '#E5484D'} />
                          <stop offset="60%" stopColor={heatTier === 'low' ? '#3B8FB5' : heatTier === 'mid' ? '#E5484D' : '#FF453A'} />
                          <stop offset="100%" stopColor={heatTier === 'low' ? '#70BCD8' : heatTier === 'mid' ? '#FFD166' : '#FFA26B'} />
                        </linearGradient>
                        <radialGradient id="flameCoreGlow" cx="50%" cy="60%" r="50%">
                          <stop offset="0%" stopColor="#FFF9E6" stopOpacity="0.95" />
                          <stop offset="100%" stopColor="#FFF4E0" stopOpacity="0.75" />
                        </radialGradient>
                      </defs>
                      <path
                        d="M32 4C32 4 37 14 34 22C38 18 42 12 42 12C42 12 52 24 50 38C48 51 38 58 32 58C26 58 16 51 14 38C12 26 22 14 26 10C26 10 24 18 28 22C30 14 32 4 32 4Z"
                        fill="url(#flameGradHot)"
                      />
                      <path
                        d="M32 26C32 26 36 32 34 38C37 35 39 31 39 31C39 31 44 38 42 46C40 53 35 56 32 56C29 56 24 53 22 46C20 40 26 33 28 30C28 30 27 34 29 36C30 32 32 26 32 26Z"
                        fill="url(#flameCoreGlow)"
                      />
                    </svg>
                  </div>
                </div>

                {/* 3. Con số lớn + /100 ĐIỂM NÓNG */}
                <div className="hero-heat-metric">
                  <span className="hero-heat-num">
                    {avg != null ? <CountUp to={Math.round(avg)} /> : '--'}
                  </span>
                  <span className="hero-heat-unit">{t('hero.flameUnit')}</span>
                </div>

                {/* 4. Dòng trạng thái trong pill nhỏ dạng kính mờ */}
                <div className="hero-heat-pill">
                  <span className="hero-heat-pill-dot" aria-hidden="true" />
                  <span className="hero-heat-pill-text">{statusText}</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Thanh tìm kiếm & Dán link bài viết Threads */}
        <Reveal delay={0.08}>
          <div style={{ padding: '0 var(--space-5)', maxWidth: '780px', margin: 'var(--space-6) auto 0' }}>
            <SearchBox />
          </div>
        </Reveal>
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
                onClick={() => handleSortChange(s)}
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

              {/* Thanh phân trang Pagination */}
              {totalPages > 1 && (
                <div className="feed-pagination">
                  <div className="pagination-info">
                    {t('feed.pageInfo')
                      .replace('{page}', String(page))
                      .replace('{totalPages}', String(totalPages))
                      .replace('{total}', String(totalCount))}
                  </div>

                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="btn-page btn-page-nav"
                      disabled={page <= 1 || loading}
                      onClick={() => handlePageChange(page - 1)}
                      title={t('feed.prevPage')}
                    >
                      <CaretLeft size={16} weight="bold" />
                      <span>{t('feed.prevPage')}</span>
                    </button>

                    <div className="pagination-numbers">
                      {getPageNumbers().map((p, idx) =>
                        typeof p === 'number' ? (
                          <button
                            key={`page-${p}`}
                            type="button"
                            className={`btn-page btn-page-num${p === page ? ' active' : ''}`}
                            onClick={() => handlePageChange(p)}
                            disabled={loading}
                          >
                            {p}
                          </button>
                        ) : (
                          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                            ...
                          </span>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn-page btn-page-nav"
                      disabled={page >= totalPages || loading}
                      onClick={() => handlePageChange(page + 1)}
                      title={t('feed.nextPage')}
                    >
                      <span>{t('feed.nextPage')}</span>
                      <CaretRight size={16} weight="bold" />
                    </button>
                  </div>
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
