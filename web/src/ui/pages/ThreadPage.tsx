import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { WarningCircle, ArrowLeft } from '@phosphor-icons/react';
import { apiGet } from '../api';
import CommentCard from '../components/CommentCard';
import DiscussionBox from '../components/DiscussionBox';
import HeatGauge from '../components/HeatGauge';
import { Reveal } from '../components/motion';
import { formatRelativeTime } from '../format';
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
  const [data, setData] = useState<ThreadDetail | null>(null);
  const [filter, setFilter] = useState<'all' | 'BÙNG NỔ' | 'TRUNG LẬP' | 'VUI VẺ'>('all');
  const [scoreFilter, setScoreFilter] = useState<'all' | '70-100' | '30-69' | '0-29'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setData(await apiGet<ThreadDetail>(`/api/threads/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải bài viết');
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGet<ThreadDetail>(`/api/threads/${id}`)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi tải bài viết'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

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
          <Link to="/" className="btn btn-ghost"><ArrowLeft aria-hidden="true" /> Về trang chủ</Link>
        </div>
      </div>
    );
  }

  if (!data) return <div className="page thread-page" />;

  const displayTitle = data.thread.title && data.thread.title !== 'Thread' && data.thread.title.trim().length > 0
    ? data.thread.title
    : data.thread.content
    ? (data.thread.content.length > 140 ? data.thread.content.slice(0, 140) + '...' : data.thread.content)
    : 'Bài viết Threads';

  const showFullContent = data.thread.content && data.thread.content.trim() !== displayTitle.trim();

  const scoredComments = data.comments.filter(c => c.score != null);

  const visible = data.comments.filter(c => filter === 'all' || c.score?.label === filter);

  const countBangNo = scoredComments.filter(c => c.score?.label === 'BÙNG NỔ').length;
  const countTrungLap = scoredComments.filter(c => c.score?.label === 'TRUNG LẬP').length;
  const countVuiVe = scoredComments.filter(c => c.score?.label === 'VUI VẺ').length;

  const topBangNo = scoredComments
    .filter(c => c.score!.label === 'BÙNG NỔ')
    .sort((a, b) => b.score!.score - a.score!.score)
    .slice(0, 3);
  const topVuiVe = scoredComments
    .filter(c => c.score!.label === 'VUI VẺ')
    .sort((a, b) => a.score!.score - b.score!.score)
    .slice(0, 3);

  return (
    <div className="page thread-page">
      <div className="thread-page-inner">
        <Reveal>
          <Link to="/" className="thread-back">
            <ArrowLeft size={16} aria-hidden="true" /> Bảng nhiệt
          </Link>

          {/* Post Header with Author & Title */}
          <div className="thread-post-card" style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg, 16px)', border: '1px solid var(--border)', marginBottom: '20px' }}>
            <h1 className="thread-title" style={{ fontSize: '22px', fontWeight: '800', lineHeight: '1.4', margin: '0 0 12px', color: 'var(--ink)' }}>
              {displayTitle}
            </h1>
            
            {showFullContent && (
              <p className="thread-content" style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>
                {data.thread.content}
              </p>
            )}

            <p className="thread-meta" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--muted)' }}>
              <span style={{ fontWeight: '700', color: 'var(--ink)' }}>@{data.thread.author_username ?? 'unknown'}</span>
              {data.thread.posted_at != null && <span>• {formatRelativeTime(data.thread.posted_at)}</span>}
              <span>• {data.thread.total_comments} bình luận</span>
              <a href={data.thread.url} target="_blank" rel="noreferrer" className="thread-link" style={{ color: 'var(--accent)', fontWeight: '600' }}>
                Xem trên Threads ↗
              </a>
            </p>
          </div>
        </Reveal>

        {/* AI Score Summary Gauge */}
        {data.thread.scoring_status === 'scored' && data.breakdown && (
          <Reveal>
            <div className="thread-summary" style={{ marginBottom: '24px' }}>
              <HeatGauge breakdown={data.breakdown} />
              <div className="thread-summary-stats">
                <span className="stat-chip anger">Bùng nổ <span className="stat-n">{data.breakdown.bang_no}</span></span>
                <span className="stat-chip neutral">Trung lập <span className="stat-n">{data.breakdown.trung_lap}</span></span>
                <span className="stat-chip calm">Vui vẻ <span className="stat-n">{data.breakdown.vui_ve}</span></span>
              </div>
              {data.thread.avg_anger_score != null && (
                <p className="thread-avg">
                  Điểm cảm xúc tức giận trung bình:
                  <strong className="mono thread-avg-value" style={{ marginLeft: '8px' }}>
                    {data.thread.avg_anger_score.toFixed(1)}/100
                  </strong>
                </p>
              )}
            </div>
          </Reveal>
        )}

        {/* Community Discussion Box: Placed conveniently right above comments list */}
        <Reveal>
          <div style={{ marginBottom: '28px' }}>
            <DiscussionBox threadId={data.thread.id} userComments={data.user_comments} onPosted={load} />
          </div>
        </Reveal>

        {/* Top Highlights */}
        {topBangNo.length > 0 && (
          <section className="ranking-section bang">
            <h2 className="ranking-title">Top Bùng nổ tiêu biểu</h2>
            {topBangNo.map(c => (
              <div key={c.id} className="ranking-item">
                <span className="ranking-text">{c.text}</span>
                <span className="mono ranking-score">{c.score!.score.toFixed(0)}/100</span>
              </div>
            ))}
          </section>
        )}

        {topVuiVe.length > 0 && (
          <section className="ranking-section vui">
            <h2 className="ranking-title">Top Vui vẻ tiêu biểu</h2>
            {topVuiVe.map(c => (
              <div key={c.id} className="ranking-item">
                <span className="ranking-text">{c.text}</span>
                <span className="mono ranking-score">{c.score!.score.toFixed(0)}/100</span>
              </div>
            ))}
          </section>
        )}

        {/* Clean Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
            Tất cả bình luận ({visible.length})
          </h2>
          <div className="filter-tabs" style={{ margin: 0 }}>
            <button className={`filter-tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
              Tất cả ({data.comments.length})
            </button>
            <button className={`filter-tab${filter === 'BÙNG NỔ' ? ' active' : ''}`} onClick={() => setFilter('BÙNG NỔ')}>
              Bùng nổ ({countBangNo})
            </button>
            <button className={`filter-tab${filter === 'TRUNG LẬP' ? ' active' : ''}`} onClick={() => setFilter('TRUNG LẬP')}>
              Trung lập ({countTrungLap})
            </button>
            <button className={`filter-tab${filter === 'VUI VẺ' ? ' active' : ''}`} onClick={() => setFilter('VUI VẺ')}>
              Vui vẻ ({countVuiVe})
            </button>
          </div>
        </div>

        {/* Comment Cards with individual AI accuracy Voting */}
        {visible.map((c, i) => (
          <Reveal key={c.id} delay={(i % 3) * 0.04}>
            <CommentCard comment={c} voteCounts={data.vote_counts[c.id] ?? { correct: 0, incorrect: 0 }} />
          </Reveal>
        ))}

        {visible.length === 0 && (
          <div className="empty-state">
            <p className="empty-title">Không có bình luận nào trong danh mục này</p>
            <p className="empty-subtitle">Thử chuyển sang bộ lọc khác để xem bình luận.</p>
          </div>
        )}
      </div>
    </div>
  );
}
