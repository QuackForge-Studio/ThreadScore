import { useEffect, useState } from 'react';
import {
  WarningCircle,
  Fire,
  ChatCircleDots,
  Lightning,
  CaretLeft,
  CaretRight,
  Question,
} from '@phosphor-icons/react';
import { apiGet } from '../api';
import SearchBox from '../components/SearchBox';
import ThreadCard from '../components/ThreadCard';
import HallOfFame from '../components/HallOfFame';
import DonateModal from '../components/DonateModal';
import HowScoreWorksModal from '../components/HowScoreWorksModal';
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
  const [isHowOpen, setIsHowOpen] = useState(false);

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

  // Tạo danh sách số trang thông minh
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxP = Math.max(1, totalPages);
    if (maxP <= 7) {
      for (let i = 1; i <= maxP; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(maxP - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < maxP - 2) pages.push('...');
      pages.push(maxP);
    }
    return pages;
  };

  return (
    <div className="page">
      {/* 1. HERO SECTION - Clean Headline + Search Box + Heat Reactor */}
      <section className="hero-v2">
        <div className="container hero-container">
          <div className="hero-grid">
            {/* Cột Trái: Main Headline & Search Box */}
            <div className="hero-info-col">
              <Reveal className="hero-title-reveal">
                <h1 className="hero-main-title">
                  {t('hero.mainHeadline')}
                </h1>
              </Reveal>

              <Reveal delay={0.06} className="hero-search-reveal">
                <div className="hero-search-container">
                  <SearchBox />
                </div>
              </Reveal>
            </div>

            {/* Cột Phải: Heat Reactor & AI Mood Pill */}
            <div className="hero-reactor-col">
              <Reveal delay={0.08} className="hero-reactor-reveal">
                <div className="hero-reactor-box">
                  {/* Visual Hero Graphic: Heat Reactor */}
                  <div className="hero-heat-stage-wrap">
                    <div className={`hero-heat-stage theme-${heatTier} ${isHot ? 'is-hot' : ''}`}>
                      {/* 1. 3 lớp Radial Glow: Lõi cam/đỏ mờ, Vàng kem, Ambient tan vào nền */}
                      <div className="reactor-glow-ambient" aria-hidden="true" />
                      <div className="reactor-glow-mid" aria-hidden="true" />
                      <div className="reactor-glow-core" aria-hidden="true" />

                      {/* 2. Vòng nhiệt hữu cơ bất đối xứng (broken wave / morphing contour) */}
                      <div className="reactor-heat-contour" aria-hidden="true">
                        <svg className="contour-svg" viewBox="0 0 260 260" fill="none">
                          <path
                            className="contour-path-1"
                            d="M130 18 C192 12, 244 68, 238 134 C232 198, 182 244, 122 240 C60 236, 16 186, 22 124 C28 64, 72 24, 130 18 Z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeDasharray="28 16 72 20 40 14 96 18"
                            strokeLinecap="round"
                          />
                          <path
                            className="contour-path-2"
                            d="M134 34 C182 28, 224 74, 218 128 C212 182, 172 222, 126 220 C78 216, 40 176, 44 124 C48 76, 88 38, 134 34 Z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeDasharray="44 22 16 18 64 24"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>

                      {/* 3. 8 Hạt than hồng (embers) phân bố bất đối xứng */}
                      <div className="hero-heat-sparks" aria-hidden="true">
                        <span className="spark spark-1" />
                        <span className="spark spark-2" />
                        <span className="spark spark-3" />
                        <span className="spark spark-4" />
                        <span className="spark spark-5" />
                        <span className="spark spark-6" />
                        <span className="spark spark-7" />
                        <span className="spark spark-8" />
                      </div>

                      <div className="hero-heat-inner">
                        {/* 4. Visual Anchor: Flame-Orb (Living Fire Animation) */}
                        <div className="hero-flame-visual-wrap">
                          <div className="hero-flame-icon-box">
                            <svg className="hero-flame-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <filter id="fireHeatFilter" x="-20%" y="-20%" width="140%" height="140%">
                                  <feTurbulence type="fractalNoise" baseFrequency="0.04 0.08" numOctaves="2" result="noise">
                                    <animate attributeName="baseFrequency" values="0.03 0.07; 0.05 0.11; 0.03 0.08; 0.04 0.06; 0.03 0.07" dur="3.6s" repeatCount="indefinite" />
                                  </feTurbulence>
                                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.8" xChannelSelector="R" yChannelSelector="G" />
                                </filter>

                                <clipPath id="flameBodyClip">
                                  <path d="M32 4C32 4 37 14 34 22C38 18 42 12 42 12C42 12 52 24 50 38C48 51 38 58 32 58C26 58 16 51 14 38C12 26 22 14 26 10C26 10 24 18 28 22C30 14 32 4 32 4Z" />
                                </clipPath>

                                <linearGradient id="flameBodyGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                                  <stop offset="0%" stopColor={heatTier === 'low' ? '#1E5874' : heatTier === 'mid' ? '#D63F15' : '#BD2429'} />
                                  <stop offset="35%" stopColor={heatTier === 'low' ? '#2A6F8E' : heatTier === 'mid' ? '#F05A28' : '#E5484D'} />
                                  <stop offset="70%" stopColor={heatTier === 'low' ? '#3B8FB5' : heatTier === 'mid' ? '#FF7A45' : '#FF453A'} />
                                  <stop offset="100%" stopColor={heatTier === 'low' ? '#78C4E0' : heatTier === 'mid' ? '#FFD166' : '#FFA26B'} />
                                </linearGradient>

                                <linearGradient id="flameMidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                                  <stop offset="0%" stopColor={heatTier === 'low' ? '#F05A28' : '#FF7A45'} stopOpacity="0.85" />
                                  <stop offset="50%" stopColor={heatTier === 'low' ? '#FFA26B' : '#FFD166'} stopOpacity="0.9" />
                                  <stop offset="100%" stopColor={heatTier === 'low' ? '#FFF4E0' : '#FFFFFF'} stopOpacity="0.95" />
                                </linearGradient>

                                <linearGradient id="flameCoreGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                                  <stop offset="0%" stopColor={heatTier === 'low' ? '#FFA26B' : '#FFE5A3'} stopOpacity="0.9" />
                                  <stop offset="60%" stopColor="#FFF4E0" stopOpacity="0.95" />
                                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
                                </linearGradient>

                                <radialGradient id="flameEmberRoot" cx="50%" cy="90%" r="52%">
                                  <stop offset="0%" stopColor="#FF5722" stopOpacity="0.95" />
                                  <stop offset="40%" stopColor="#F05A28" stopOpacity="0.65" />
                                  <stop offset="85%" stopColor="#2A6F8E" stopOpacity="0" />
                                </radialGradient>

                                <linearGradient id="sheenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                                  <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.08" />
                                  <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.5" />
                                  <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.1" />
                                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                                </linearGradient>
                              </defs>

                              <g className="flame-body-group" filter="url(#fireHeatFilter)">
                                <path
                                  className="flame-body-path"
                                  d="M32 4C32 4 37 14 34 22C38 18 42 12 42 12C42 12 52 24 50 38C48 51 38 58 32 58C26 58 16 51 14 38C12 26 22 14 26 10C26 10 24 18 28 22C30 14 32 4 32 4Z"
                                  fill="url(#flameBodyGrad)"
                                />
                                <path
                                  className="flame-ember-root-path"
                                  d="M32 4C32 4 37 14 34 22C38 18 42 12 42 12C42 12 52 24 50 38C48 51 38 58 32 58C26 58 16 51 14 38C12 26 22 14 26 10C26 10 24 18 28 22C30 14 32 4 32 4Z"
                                  fill="url(#flameEmberRoot)"
                                  opacity={heatTier === 'low' ? '0.88' : '0.45'}
                                />
                                <path
                                  className="flame-mid-tongue"
                                  d="M32 16C32 16 38 23 35 30C39 26 42 22 42 22C42 22 47 30 45 39C43 49 37 53 32 53C27 53 21 49 19 39C17 30 23 22 23 22C23 22 26 26 29 30C26 23 32 16 32 16Z"
                                  fill="url(#flameMidGrad)"
                                />
                                <path
                                  className="flame-core-flame"
                                  d="M32 26C32 26 36 32 34 38C37 35 39 31 39 31C39 31 43 38 41 46C39 52 35 55 32 55C29 55 25 52 23 46C21 38 25 31 25 31C25 31 27 35 30 38C28 32 32 26 32 26Z"
                                  fill="url(#flameCoreGrad)"
                                />
                              </g>

                              <g clipPath="url(#flameBodyClip)">
                                <rect
                                  className="flame-sheen-sweep"
                                  x="-35"
                                  y="-35"
                                  width="134"
                                  height="134"
                                  fill="url(#sheenGrad)"
                                />
                              </g>
                            </svg>
                          </div>
                        </div>

                        {/* 5. Con số lớn + /100 độ drama */}
                        <div className="hero-heat-metric">
                          <span className="hero-heat-num">
                            {avg != null ? <CountUp to={Math.round(avg)} /> : '--'}
                          </span>
                          <span className="hero-heat-unit">{t('hero.flameUnit')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DISCOVERY & FEED SECTION - 2-Column Responsive Layout */}
      <section className="section-feed" id="explore">
        <div className="container">
          {/* Hàng phân cách / Tabs chạy dài ngang toàn bộ chiều rộng */}
          <div className="feed-header-bar">
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
          </div>

          <div className="feed-grid-layout">
            {/* Cột Trái: Feed Bài Viết */}
            <div className="feed-main-col">

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
                  {threads.map((tItem, i) => {
                    const isFeatured = i === 0 && page === 1;
                    const rankNum = i + 1 + (page - 1) * PAGE_SIZE;
                    return (
                      <Reveal key={tItem.id} delay={(i % 4) * 0.04}>
                        <ThreadCard
                          thread={tItem}
                          rank={rankNum}
                          variant={isFeatured ? 'featured' : 'compact'}
                        />
                      </Reveal>
                    );
                  })}

                  {threads.length === 0 && !error && (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <ChatCircleDots size={48} weight="duotone" color="var(--accent)" />
                      </div>
                      <p className="empty-title">{t('feed.empty')}</p>
                      <p className="empty-subtitle">{t('feed.emptyHint')}</p>
                    </div>
                  )}

                  {/* Phân trang Pagination */}
                  {threads.length > 0 && (
                    <div className="feed-pagination">
                      <div className="pagination-info">
                        {t('feed.pageInfo')
                          .replace('{page}', String(page))
                          .replace('{totalPages}', String(Math.max(1, totalPages)))
                          .replace('{total}', String(totalCount || threads.length))}
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
                                disabled={loading || totalPages <= 1}
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

            {/* Cột Phải: Sidebar Widgets (Top Spotlight, Thống kê nhanh, Chrome Extension) */}
            <aside className="feed-sidebar-col">
              {/* Widget 1: Spotlight Drama Nóng Nhất */}
              {stats?.top_threads && stats.top_threads[0] && (
                <div className="sidebar-widget spotlight-widget">
                  <div className="widget-header">
                    <span className="widget-kicker">
                      <Fire size={16} weight="fill" color="var(--anger)" />
                      {t('sidebar.hottestTitle')}
                    </span>
                    <span className="spotlight-badge">
                      {stats.top_threads[0].avg_anger_score?.toFixed(0)}/100
                    </span>
                  </div>
                  <a href={`/t/${stats.top_threads[0].id}`} className="spotlight-link">
                    <h4 className="spotlight-title">
                      {stats.top_threads[0].title || t('sb.fallback')}
                    </h4>
                    <div className="spotlight-footer">
                      <span>@{stats.top_threads[0].author_username || t('tc.anon')}</span>
                      <span>· {stats.top_threads[0].total_comments} {t('tc.comments')}</span>
                    </div>
                  </a>
                </div>
              )}

              {/* Widget 2: Thống kê hệ thống */}
              {stats && (
                <div className="sidebar-widget stats-widget">
                  <div className="widget-header">
                    <span className="widget-kicker">
                      <Lightning size={16} weight="fill" color="var(--accent)" />
                      {t('sidebar.statsTitle')}
                    </span>
                  </div>
                  <div className="sidebar-stats-content">
                    {/* 1. Trạng thái bài viết & yêu cầu */}
                    <div className="sidebar-stat-item">
                      <div className="stat-item-left">
                        <span className="stat-bullet scored" />
                        <span>{t('sidebar.scoredThreads')}</span>
                      </div>
                      <b className="stat-item-val">{stats.scored_threads ?? stats.threads ?? 0}</b>
                    </div>
                    <div className="sidebar-stat-item">
                      <div className="stat-item-left">
                        <span className="stat-bullet pending" />
                        <span>{t('sidebar.pendingThreads')}</span>
                      </div>
                      <b className="stat-item-val">{stats.pending_threads ?? 0}</b>
                    </div>
                    <div className="sidebar-stat-item">
                      <div className="stat-item-left">
                        <span className="stat-bullet review" />
                        <span>{t('sidebar.pendingRequests')}</span>
                      </div>
                      <b className="stat-item-val">{stats.pending_requests ?? 0}</b>
                    </div>

                    <div className="sidebar-stats-divider" />

                    {/* 2. Cảm xúc bình luận */}
                    <div className="sidebar-stat-item">
                      <div className="stat-item-left">
                        <span className="stat-bullet scored" />
                        <span>{t('sidebar.scoredComments')}</span>
                      </div>
                      <b className="stat-item-val">
                        {stats.scored_comments ??
                          (stats.breakdown?.bang_no ?? 0) +
                            (stats.breakdown?.trung_lap ?? 0) +
                            (stats.breakdown?.vui_ve ?? 0)}
                      </b>
                    </div>

                    {/* Thanh phân bố tỷ lệ cảm xúc trực quan (Stacked Sentiment Bar) */}
                    {(() => {
                      const totalScored =
                        (stats.breakdown?.bang_no ?? 0) +
                        (stats.breakdown?.trung_lap ?? 0) +
                        (stats.breakdown?.vui_ve ?? 0);
                      if (totalScored <= 0) return null;
                      const pBang = ((stats.breakdown?.bang_no ?? 0) / totalScored) * 100;
                      const pTrung = ((stats.breakdown?.trung_lap ?? 0) / totalScored) * 100;
                      const pVui = ((stats.breakdown?.vui_ve ?? 0) / totalScored) * 100;
                      return (
                        <div
                          className="sidebar-sentiment-bar"
                          title={`${pBang.toFixed(0)}% Bùng nổ · ${pTrung.toFixed(0)}% Trung lập · ${pVui.toFixed(0)}% Vui vẻ`}
                        >
                          <div className="sentiment-seg anger" style={{ width: `${pBang}%` }} />
                          <div className="sentiment-seg neutral" style={{ width: `${pTrung}%` }} />
                          <div className="sentiment-seg calm" style={{ width: `${pVui}%` }} />
                        </div>
                      );
                    })()}

                    <div className="sidebar-stat-item">
                      <div className="stat-item-left">
                        <span className="stat-bullet anger" />
                        <span>{t('stats.bang')}</span>
                      </div>
                      <b className="stat-item-val">{stats.breakdown?.bang_no ?? 0}</b>
                    </div>
                    <div className="sidebar-stat-item">
                      <div className="stat-item-left">
                        <span className="stat-bullet neutral" />
                        <span>{t('stats.trunglap')}</span>
                      </div>
                      <b className="stat-item-val">{stats.breakdown?.trung_lap ?? 0}</b>
                    </div>
                    <div className="sidebar-stat-item">
                      <div className="stat-item-left">
                        <span className="stat-bullet calm" />
                        <span>{t('stats.vuive')}</span>
                      </div>
                      <b className="stat-item-val">{stats.breakdown?.vui_ve ?? 0}</b>
                    </div>

                    <button
                      type="button"
                      className="sidebar-how-link"
                      onClick={() => setIsHowOpen(true)}
                    >
                      <Question size={14} weight="bold" /> {t('how.eyebrow')} & {t('how.step2.title')} ↗
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* 3. HALL OF FAME */}
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
      <HowScoreWorksModal isOpen={isHowOpen} onClose={() => setIsHowOpen(false)} />
    </div>
  );
}
