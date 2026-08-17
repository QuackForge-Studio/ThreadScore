import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { WarningCircle, ArrowLeft, ArrowSquareOut, MagnifyingGlass, X } from '@phosphor-icons/react';
import { apiGet } from '../api';
import CommentCard from '../components/CommentCard';
import DiscussionBox from '../components/DiscussionBox';
import HeatGauge from '../components/HeatGauge';
import { Reveal } from '../components/motion';
import { formatRelativeTime } from '../format';
import { useI18n } from '../i18n';
import type { ThreadRecord, CommentRecord, AiScoreRecord, UserCommentRecord } from '../../shared/types';

type ThreadDetail = {
  thread: ThreadRecord;
  comments: (CommentRecord & { score: AiScoreRecord | null })[];
  breakdown: { bang_no: number; trung_lap: number; vui_ve: number } | null;
  user_comments: UserCommentRecord[];
  vote_counts: Record<string, { correct: number; incorrect: number }>;
};

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [data, setData] = useState<ThreadDetail | null>(null);
  const [filter, setFilter] = useState<'all' | 'BÙNG NỔ' | 'TRUNG LẬP' | 'VUI VẺ'>('all');
  const [commentSearch, setCommentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setData(await apiGet<ThreadDetail>(`/api/threads/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('tp.loadError'));
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGet<ThreadDetail>(`/api/threads/${id}`)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : t('tp.loadError')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, t]);

  if (loading) {
    return (
      <div className="page thread-page">
        <div className="thread-page-inner">
          <div className="skeleton-thread-title" />
          <div className="skeleton-comment" />
          <div className="skeleton-comment" />
          <div className="skeleton-comment" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page thread-page">
        <div className="thread-page-inner">
          <div className="error-banner" role="alert">
            <WarningCircle aria-hidden="true" /> {error}
          </div>
          <Link to="/" className="btn btn-ghost"><ArrowLeft aria-hidden="true" /> {t('tp.home')}</Link>
        </div>
      </div>
    );
  }

  if (!data) return <div className="page thread-page" />;

  const displayTitle = data.thread.title && data.thread.title !== 'Thread' && data.thread.title.trim().length > 0
    ? data.thread.title
    : data.thread.content
    ? (data.thread.content.length > 140 ? data.thread.content.slice(0, 140) + '...' : data.thread.content)
    : t('tp.postFallback');

  const showFullContent = data.thread.content && data.thread.content.trim() !== displayTitle.trim();

  const scoredComments = data.comments.filter(c => c.score != null);

  const searchLower = commentSearch.trim().toLowerCase();
  const visible = data.comments.filter(c => {
    const matchFilter = filter === 'all' || c.score?.label === filter;
    const matchSearch = !searchLower || (
      c.text.toLowerCase().includes(searchLower) ||
      (c.author_username && c.author_username.toLowerCase().includes(searchLower)) ||
      (c.score?.reason && c.score.reason.toLowerCase().includes(searchLower))
    );
    return matchFilter && matchSearch;
  });

  const countBangNo = scoredComments.filter(c => c.score?.label === 'BÙNG NỔ').length;
  const countTrungLap = scoredComments.filter(c => c.score?.label === 'TRUNG LẬP').length;
  const countVuiVe = scoredComments.filter(c => c.score?.label === 'VUI VẺ').length;

  return (
    <div className="page thread-page">
      <div className="thread-detail-grid">
        {/* Cột trái (Chính): Chi tiết bài viết + Tóm tắt nhiệt độ + Danh sách bình luận */}
        <div className="thread-main-column">
          <Reveal>
            <Link to="/" className="thread-back">
              <ArrowLeft size={18} weight="bold" aria-hidden="true" /> {t('tp.back')}
            </Link>

            <div className="thread-post-card">
              <h1 className="thread-title" style={{ fontSize: '22px', fontWeight: '800', lineHeight: '1.4', margin: '0 0 12px', color: 'var(--ink)' }}>
                {displayTitle}
              </h1>

              {showFullContent && (
                <p className="thread-content" style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>
                  {data.thread.content}
                </p>
              )}

              <p className="thread-meta" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--muted)' }}>
                <span style={{ fontWeight: '700', color: 'var(--ink)' }}>@{data.thread.author_username ?? t('tp.anon')}</span>
                {data.thread.posted_at != null && <span>· {formatRelativeTime(data.thread.posted_at)}</span>}
                <span>· {data.thread.total_comments} {t('tp.commentsCount')}</span>
                <a href={data.thread.url} target="_blank" rel="noreferrer" className="thread-link" style={{ color: 'var(--accent)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {t('tp.onThreads')} <ArrowSquareOut size={13} />
                </a>
              </p>
            </div>
          </Reveal>

          {data.thread.scoring_status === 'scored' && data.breakdown && (
            <Reveal>
              <div className="thread-summary" style={{ marginBottom: '24px' }}>
                <HeatGauge breakdown={data.breakdown} />
                <div className="thread-summary-stats">
                  <span className="stat-chip anger">{t('tp.hot')} <span className="stat-n">{data.breakdown.bang_no}</span></span>
                  <span className="stat-chip neutral">{t('tp.neutral')} <span className="stat-n">{data.breakdown.trung_lap}</span></span>
                  <span className="stat-chip calm">{t('tp.calm')} <span className="stat-n">{data.breakdown.vui_ve}</span></span>
                </div>
                {data.thread.avg_anger_score != null && (
                  <p className="thread-avg">
                    {t('tp.avgLabel')}
                    <strong className="mono thread-avg-value" style={{ marginLeft: '8px' }}>
                      {data.thread.avg_anger_score.toFixed(1)}/100
                    </strong>
                  </p>
                )}
              </div>
            </Reveal>
          )}

          {/* Header Bình luận + Search Box + Filter Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '20px 0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                {t('tp.allComments')} ({visible.length})
              </h2>

              {/* Input tìm kiếm nhanh trong bình luận */}
              <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                <MagnifyingGlass size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                <input
                  type="search"
                  placeholder={t('tp.searchComments')}
                  value={commentSearch}
                  onChange={e => setCommentSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 32px 7px 34px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: '13.5px',
                    color: 'var(--ink)',
                    outline: 'none',
                    boxShadow: 'var(--shadow-sm)',
                    boxSizing: 'border-box',
                  }}
                />
                {commentSearch && (
                  <button
                    type="button"
                    onClick={() => setCommentSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="filter-tabs" style={{ margin: 0 }} role="tablist">
              <button className={`filter-tab${filter === 'all' ? ' active' : ''}`} role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>
                {t('tp.all')} ({data.comments.length})
              </button>
              <button className={`filter-tab${filter === 'BÙNG NỔ' ? ' active' : ''}`} role="tab" aria-selected={filter === 'BÙNG NỔ'} onClick={() => setFilter('BÙNG NỔ')}>
                {t('tp.hot')} ({countBangNo})
              </button>
              <button className={`filter-tab${filter === 'TRUNG LẬP' ? ' active' : ''}`} role="tab" aria-selected={filter === 'TRUNG LẬP'} onClick={() => setFilter('TRUNG LẬP')}>
                {t('tp.neutral')} ({countTrungLap})
              </button>
              <button className={`filter-tab${filter === 'VUI VẺ' ? ' active' : ''}`} role="tab" aria-selected={filter === 'VUI VẺ'} onClick={() => setFilter('VUI VẺ')}>
                {t('tp.calm')} ({countVuiVe})
              </button>
            </div>
          </div>

          {visible.map((c, i) => (
            <Reveal key={c.id} delay={(i % 3) * 0.04}>
              <CommentCard comment={c} voteCounts={data.vote_counts[c.id] ?? { correct: 0, incorrect: 0 }} />
            </Reveal>
          ))}

          {visible.length === 0 && (
            <div className="empty-state">
              <p className="empty-title">{t('tp.noComments')}</p>
              <p className="empty-subtitle">{t('tp.tryOther')}</p>
            </div>
          )}
        </div>

        {/* Cột phải (Phụ): Khung Thảo luận cộng đồng scroll độc lập dạng Sticky */}
        <aside className="thread-discussion-sidebar" style={{ paddingTop: '42px' }}>
          <div className="thread-discussion-sticky">
            <DiscussionBox threadId={data.thread.id} userComments={data.user_comments} onPosted={load} />
          </div>
        </aside>
      </div>
    </div>
  );
}
