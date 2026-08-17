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
          setError(e.message || (lang === 'vi' ? 'Lỗi tải danh sách' : 'Failed to load feed'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sort, lang]);

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

  return (
    <div className="page">
      {/* 1. HERO SECTION — Spacious, Headline, Tagline, & Search Box */}
      <section className="hero" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-7)' }}>
        <div className="container" style={{ maxWidth: '840px', margin: '0 auto', textAlign: 'center' }}>
          <Reveal>
            <span
              className="section-eyebrow"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '12px',
                padding: '4px 12px',
                background: 'var(--anger-soft)',
                color: 'var(--accent)',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              <Fire size={16} weight="fill" color="var(--accent)" />
              {lang === 'vi' ? 'AI Sentiment & Heat Index for Threads' : 'AI Sentiment & Heat Index for Threads'}
            </span>
            <h1
              className="hero-title"
              style={{
                fontSize: 'clamp(2.2rem, 5.5vw, 3.6rem)',
                fontWeight: '900',
                letterSpacing: '-0.035em',
                lineHeight: '1.18',
                margin: '0 0 16px',
                color: 'var(--ink)',
              }}
            >
              {lang === 'vi' ? 'Đo Nhiệt Độ & Cảm Xúc Thảo Luận Trên Threads' : 'Measure Sentiment & Flame on Threads'}
            </h1>
            <p
              className="hero-subtitle"
              style={{
                fontSize: 'clamp(15px, 2.2vw, 17.5px)',
                color: 'var(--muted)',
                maxWidth: '620px',
                margin: '0 auto 28px',
                lineHeight: '1.6',
              }}
            >
              {lang === 'vi'
                ? 'Phân tích hàng trăm bình luận trong tích tắc bằng AI. Nhìn thấu sắc thái bùng nổ, tranh cãi và những góc nhìn thú vị.'
                : 'Analyze hundreds of comments in seconds with AI. Uncover outrage levels, sentiment patterns, and community voices.'}
            </p>
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <SearchBox />
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. EXPLORE FEED — Thread Posts Feed */}
      <section className="section-tight" id="explore" style={{ paddingTop: 'var(--space-4)' }}>
        <div className="container">
          <div className="sort-tabs">
            {(['hottest', 'newest', 'most_comments'] as const).map((s) => (
              <button key={s} className={`sort-tab${sort === s ? ' active' : ''}`} onClick={() => setSort(s)}>
                {s === 'hottest'
                  ? lang === 'vi'
                    ? '🔥 Nóng nhất'
                    : '🔥 Hottest'
                  : s === 'newest'
                  ? lang === 'vi'
                    ? '✨ Mới nhất'
                    : '✨ Latest'
                  : lang === 'vi'
                  ? '💬 Nhiều bình luận'
                  : '💬 Most comments'}
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
                  <p className="empty-subtitle">
                    {lang === 'vi'
                      ? 'Dán liên kết Threads bất kỳ vào ô tìm kiếm ở trên để gửi yêu cầu đo nhiệt độ bài viết đầu tiên!'
                      : 'Paste any Threads post link into the search box above to measure its sentiment temperature!'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* 3. VISUAL STATISTICS SECTION — Dedicated Community Heat Index */}
      {stats && (
        <section className="section" id="community-stats" style={{ paddingTop: 'var(--space-8)' }}>
          <div className="container">
            <Reveal>
              <div className="section-head">
                <span className="section-eyebrow">
                  <Lightning size={16} weight="fill" color="var(--accent)" />
                  {lang === 'vi' ? 'Thống Kê Trực Quan' : 'Visual Statistics'}
                </span>
                <h2 className="section-title">
                  {lang === 'vi' ? 'Bức Tranh Nhiệt Độ Toàn Nền Tảng' : 'Community Sentiment Landscape'}
                </h2>
                <p className="section-subtitle">
                  {lang === 'vi'
                    ? 'Chỉ số cảm xúc trung bình tổng hợp từ toàn bộ các bài viết và bình luận đã được AI chấm điểm.'
                    : 'Aggregated sentiment metrics across all analyzed threads and community discussions.'}
                </p>
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
                <p>
                  {lang === 'vi'
                    ? 'Mỗi bài là một ngọn lửa được đo bằng AI.'
                    : 'Every post is a discussion measured by AI.'}
                </p>
              </div>
            </Reveal>
            <Reveal className="bento-2" delay={0.08}>
              <div className="bento-card bento-plain bento-featured-dark">
                <div className="bento-body">
                  <span className="bento-kicker">
                    <Fire size={16} weight="fill" /> {lang === 'vi' ? 'Bùng nổ nhất' : 'Hottest Thread'}
                  </span>
                  {stats?.top_threads[0] ? (
                    <>
                      <h3>{stats.top_threads[0].title ?? 'Threads Post'}</h3>
                      <p className="mono">
                        {stats.top_threads[0].avg_anger_score?.toFixed(0)}/100{' '}
                        {lang === 'vi' ? 'điểm tức giận' : 'heat score'}
                      </p>
                    </>
                  ) : (
                    <h3>{lang === 'vi' ? 'Chờ bài viết đầu tiên' : 'Awaiting first thread'}</h3>
                  )}
                </div>
              </div>
            </Reveal>
            <Reveal className="bento-3" delay={0.04}>
              <div className="bento-card bento-plain bento-featured-slate">
                <div className="bento-body">
                  <span className="bento-kicker">
                    <Lightning size={16} weight="fill" /> {t('bento.totalComments')}
                  </span>
                  <h3 className="mono">{stats ? <CountUp to={stats.comments} /> : '--'}</h3>
                  <p>{lang === 'vi' ? 'dữ liệu cập nhật liên tục' : 'updated in real-time'}</p>
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
                <h3>{lang === 'vi' ? 'Bình luận tích cực' : 'Positive comments'}</h3>
                <p>
                  {lang === 'vi'
                    ? 'Không phải lúc nào cũng nóng — vẫn có chốn bình yên.'
                    : 'Not always fiery — calm spots still exist.'}
                </p>
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
                n: '01',
                t: t('how.step1.title'),
                d: t('how.step1.desc'),
              },
              {
                n: '02',
                t: t('how.step2.title'),
                d: t('how.step2.desc'),
              },
              {
                n: '03',
                t: t('how.step3.title'),
                d: t('how.step3.desc'),
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.12}>
                <div className="how-step">
                  <span className="step-num">{lang === 'vi' ? `Bước ${s.n}` : `Step ${s.n}`}</span>
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
              <h2>{lang === 'vi' ? 'Đo ngay bài viết đang làm bạn tò mò' : 'Analyze the threads you are curious about'}</h2>
              <p>
                {lang === 'vi'
                  ? 'Dán link, chờ AI chấm điểm, rồi xem cộng đồng thực sự nghĩ gì.'
                  : 'Paste a link, let AI score the sentiment, and see what the community truly feels.'}
              </p>
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
                <Fire weight="fill" aria-hidden="true" />{' '}
                {lang === 'vi' ? 'Dán link bài viết ngay' : 'Paste thread link now'}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <DonateModal isOpen={isDonateOpen} onClose={() => setIsDonateOpen(false)} />
    </div>
  );
}
