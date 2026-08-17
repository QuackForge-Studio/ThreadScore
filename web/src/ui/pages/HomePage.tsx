import { useEffect, useState } from 'react';
import { WarningCircle, Fire, Eye, NewspaperClipping, ChatCircleDots, Lightning } from '@phosphor-icons/react';
import { apiGet } from '../api';
import SearchBox from '../components/SearchBox';
import ThreadCard from '../components/ThreadCard';
import OverallHeat from '../components/OverallHeat';
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

  useEffect(() => {
    let cancelled = false;
    apiGet<{ threads: ThreadRecord[] }>(`/api/threads?sort=${sort}`)
      .then(r => { if (!cancelled) { setThreads(r.threads); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message || (lang === 'vi' ? 'Lỗi tải danh sách' : 'Failed to load feed')); setLoading(false); } });
    return () => { cancelled = true; };
  }, [sort, lang]);

  useEffect(() => {
    let cancelled = false;
    apiGet<OverallStats>('/api/stats')
      .then(s => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) setStats(null); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page">
      {/* INTEREST — Thermometer + Search + Explore */}
      <section className="section-tight" id="explore">
        <div className="container">
          {stats && <Reveal><OverallHeat stats={stats} /></Reveal>}
          <SearchBox />

          <div className="sort-tabs">
            {(['hottest', 'newest', 'most_comments'] as const).map(s => (
              <button key={s} className={`sort-tab${sort === s ? ' active' : ''}`} onClick={() => setSort(s)}>
                {s === 'hottest'
                  ? (lang === 'vi' ? 'Nóng nhất' : 'Hottest')
                  : s === 'newest'
                  ? (lang === 'vi' ? 'Mới nhất' : 'Latest')
                  : (lang === 'vi' ? 'Nhiều bình luận' : 'Most comments')}
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
              {threads.map((tItem, i) => <Reveal key={tItem.id} delay={(i % 3) * 0.08}><ThreadCard thread={tItem} /></Reveal>)}
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

      {/* Bento stats */}
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
              <div className="bento-card bento-plain" style={{ background: 'linear-gradient(135deg, var(--anger-soft), var(--surface-raised))' }}>
                <span className="big-num" style={{ color: 'var(--anger-ink)' }}>
                  {stats ? <CountUp to={stats.threads} /> : '--'}
                </span>
                <h3>{t('bento.totalThreads')}</h3>
                <p>{lang === 'vi' ? 'Mỗi bài là một ngọn lửa được đo bằng AI.' : 'Every post is a discussion measured by AI.'}</p>
              </div>
            </Reveal>
            <Reveal className="bento-2" delay={0.08}>
              <div className="bento-card bento-plain bento-featured-dark">
                <div className="bento-body">
                  <span className="bento-kicker"><Fire size={16} weight="fill" /> {lang === 'vi' ? 'Bùng nổ nhất' : 'Hottest Thread'}</span>
                  {stats?.top_threads[0] ? (
                    <>
                      <h3>{stats.top_threads[0].title ?? 'Threads Post'}</h3>
                      <p className="mono">{stats.top_threads[0].avg_anger_score?.toFixed(0)}/100 {lang === 'vi' ? 'điểm tức giận' : 'heat score'}</p>
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
                  <span className="bento-kicker"><Lightning size={16} weight="fill" /> {t('bento.totalComments')}</span>
                  <h3 className="mono">{stats ? <CountUp to={stats.comments} /> : '--'}</h3>
                  <p>{lang === 'vi' ? 'dữ liệu cập nhật liên tục' : 'updated in real-time'}</p>
                </div>
              </div>
            </Reveal>
            <Reveal className="bento-4" delay={0.08}>
              <div className="bento-card bento-plain" style={{ background: 'linear-gradient(135deg, var(--calm-soft), var(--surface-raised))' }}>
                <span className="big-num" style={{ color: 'var(--calm-ink)' }}>
                  {stats ? <CountUp to={stats.breakdown.vui_ve} /> : '--'}
                </span>
                <h3>{lang === 'vi' ? 'Bình luận tích cực' : 'Positive comments'}</h3>
                <p>{lang === 'vi' ? 'Không phải lúc nào cũng nóng — vẫn có chốn bình yên.' : 'Not always fiery — calm spots still exist.'}</p>
              </div>
            </Reveal>
            <Reveal className="bento-5" delay={0.12}>
              <div className="bento-card bento-plain bento-featured-dark">
                <div className="bento-body">
                  <span className="bento-kicker">{lang === 'vi' ? 'Theo dõi' : 'Monitoring'}</span>
                  <h3>{lang === 'vi' ? 'Nhiệt độ cập nhật liên tục' : 'Real-time Heat Index'}</h3>
                  <p>{lang === 'vi' ? 'Mỗi đợt chấm điểm làm mới bức tranh cảm xúc.' : 'Fresh scoring batches update sentiment landscapes.'}</p>
                </div>
              </div>
            </Reveal>
            <Reveal className="bento-6" delay={0.16}>
              <div className="bento-card bento-plain">
                <Eye size={30} weight="duotone" color="var(--ember)" />
                <h3>{lang === 'vi' ? 'Nhìn thấu tranh cãi' : 'Conflict Insights'}</h3>
                <p>{lang === 'vi' ? 'Phát hiện sớm những cuộc tranh cãi đang leo thang.' : 'Identify escalating community disputes early.'}</p>
              </div>
            </Reveal>
            <Reveal className="bento-7" delay={0.2}>
              <div className="bento-card bento-plain">
                <NewspaperClipping size={30} weight="duotone" color="var(--calm)" />
                <h3>{lang === 'vi' ? 'Trích dẫn tiêu biểu' : 'Representative Quotes'}</h3>
                <p>{lang === 'vi' ? 'Đọc những bình luận đại diện cho từng sắc thái.' : 'Discover benchmark comments across sentiment tones.'}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* AI Scoring Algorithm Section */}
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

      {/* ACTION — CTA */}
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
                <Fire weight="fill" aria-hidden="true" /> {lang === 'vi' ? 'Dán link bài viết ngay' : 'Paste thread link now'}
              </button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
