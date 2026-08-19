import { useEffect, useState } from 'react';
import {
  WarningCircle,
  Fire,
  ChatCircleDots,
  CaretLeft,
  CaretRight,
  XCircle,
  CalendarBlank,
} from '@phosphor-icons/react';
import { apiGet } from '../api';
import SearchBox from '../components/SearchBox';
import ThreadCard from '../components/ThreadCard';
import DateCalendarFilter from '../components/DateCalendarFilter';
import HallOfFame from '../components/HallOfFame';
import DonateModal from '../components/DonateModal';
import HowScoreWorksModal from '../components/HowScoreWorksModal';
import { Reveal } from '../components/motion';
import { useI18n } from '../i18n';
import type { ThreadRecord, OverallStats } from '../../shared/types';

const PAGE_SIZE = 10;

export default function HomePage() {
  const { t, lang } = useI18n();
  const [threads, setThreads] = useState<ThreadRecord[]>([]);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [sort, setSort] = useState<'newest' | 'hottest' | 'most_comments'>('hottest');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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

  // Khi đổi ngày thì reset về trang 1
  function handleDateChange(date: string | null) {
    setSelectedDate(date);
    setPage(1);
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
    const dateParam = selectedDate ? `&date=${encodeURIComponent(selectedDate)}` : '';
    apiGet<{ threads: ThreadRecord[]; total?: number; totalPages?: number }>(
      `/api/threads?sort=${sort}&page=${page}&limit=${PAGE_SIZE}${dateParam}`
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
  }, [sort, page, selectedDate, lang, t]);

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

  const formattedSelectedDate = (() => {
    if (!selectedDate) return '';
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return selectedDate;
    } catch {
      return selectedDate;
    }
  })();

  return (
    <div className="page">
      {/* 1. HERO SECTION - Clean, Short & Focused */}
      <section className="hero-streamlined">
        <div className="container hero-streamlined-container">
          <Reveal>
            <h1 className="hero-main-title">
              {t('hero.mainHeadline')}
            </h1>
          </Reveal>

          <Reveal delay={0.04}>
            <div className="hero-search-box-wrap">
              <SearchBox />
            </div>
          </Reveal>

          {/* Clean Summary Stats Bar */}
          <Reveal delay={0.08}>
            <div className="hero-summary-bar">
              <span className="summary-flame-icon">
                <Fire size={15} weight="fill" />
              </span>
              <div className="summary-items-inline">
                {stats ? (
                  <>
                    <span className="summary-item">
                      <b>{avg != null ? Math.round(avg) : 29}</b> {t('tc.dramaScore')} {t('calendar.today').toLowerCase()}
                    </span>
                    <span className="summary-sep">·</span>
                    <span className="summary-item">
                      <b>{stats.scored_threads ?? stats.threads ?? 0}</b> {t('sidebar.scoredThreads').toLowerCase()}
                    </span>
                    <span className="summary-sep">·</span>
                    <span className="summary-item">
                      <b>
                        {stats.scored_comments ??
                          (stats.breakdown?.bang_no ?? 0) +
                            (stats.breakdown?.trung_lap ?? 0) +
                            (stats.breakdown?.vui_ve ?? 0)}
                      </b> {t('sidebar.scoredComments').toLowerCase()}
                    </span>
                  </>
                ) : (
                  <span>{t('hero.flameNoData')}</span>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. DISCOVERY & FEED SECTION - Feed-First Focused Column */}
      <section className="section-feed" id="explore">
        <div className="container feed-container">
          {/* Feed Controls Header Bar: Sort Tabs + Date Calendar Filter */}
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

            {/* Date Calendar Filter */}
            <div className="feed-filter-actions">
              <DateCalendarFilter
                selectedDate={selectedDate}
                onSelectDate={handleDateChange}
              />
            </div>
          </div>

          {/* Active Date Filter Notice Banner */}
          {selectedDate && (
            <div className="active-filter-banner">
              <div className="active-filter-text">
                <CalendarBlank size={16} weight="fill" />
                <span>
                  {t('calendar.filteringBy').replace('{date}', formattedSelectedDate)}
                  {totalCount > 0 && ` (${totalCount} ${t('tc.postsCount')})`}
                </span>
              </div>
              <button
                type="button"
                className="btn-clear-date-filter"
                onClick={() => handleDateChange(null)}
                title={t('calendar.clearFilter')}
              >
                <XCircle size={15} weight="fill" />
                <span>{t('calendar.clearFilter')}</span>
              </button>
            </div>
          )}

          {/* Main Feed List */}
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
                <div className="feed-cards-list">
                  {threads.map((tItem, i) => {
                    const rankNum = i + 1 + (page - 1) * PAGE_SIZE;
                    return (
                      <Reveal key={tItem.id} delay={(i % 4) * 0.03}>
                        <ThreadCard
                          thread={tItem}
                          rank={rankNum}
                        />
                      </Reveal>
                    );
                  })}
                </div>

                {threads.length === 0 && !error && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <ChatCircleDots size={44} weight="duotone" color="var(--accent)" />
                    </div>
                    <p className="empty-title">
                      {selectedDate
                        ? t('calendar.noPostsOnDate').replace('{date}', formattedSelectedDate)
                        : t('feed.empty')}
                    </p>
                    <p className="empty-subtitle">
                      {selectedDate ? (
                        <button
                          type="button"
                          className="btn-link-highlight"
                          onClick={() => handleDateChange(null)}
                        >
                          {t('calendar.allDates')}
                        </button>
                      ) : (
                        t('feed.emptyHint')
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Phân trang */}
          {threads.length > 0 && (
            <div className="feed-pagination-row">
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
            </div>
          )}
        </div>
      </section>

      {/* 3. HALL OF FAME - Clean, Subtle Supporter Section */}
      <HallOfFame onOpenDonate={() => setIsDonateOpen(true)} />

      {/* 4. ACTION CTA BANNER */}
      <section className="section section-cta-compact">
        <div className="container">
          <Reveal>
            <div className="cta-banner cta-banner-refined">
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
