import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { WarningCircle } from '@phosphor-icons/react';
import { apiGet } from '../api';
import CommentCard from '../components/CommentCard';
import DiscussionBox from '../components/DiscussionBox';
import HeatGauge from '../components/HeatGauge';
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
      <div className="page">
        <div className="skeleton-thread-title" />
        <div className="skeleton-comment" />
        <div className="skeleton-comment" />
        <div className="skeleton-comment" />
        <div className="skeleton-comment" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="error-banner" role="alert">
          <WarningCircle aria-hidden="true" /> {error}
        </div>
      </div>
    );
  }

  if (!data) return <div className="page" />;

  const scoredComments = data.comments.filter(c => c.score != null);

  const inScoreRange = (score: number): boolean => {
    if (scoreFilter === '70-100') return score >= 70 && score <= 100;
    if (scoreFilter === '30-69') return score >= 30 && score <= 69;
    if (scoreFilter === '0-29') return score >= 0 && score <= 29;
    return true;
  };

  const visible = data.comments.filter(c =>
    (filter === 'all' || (c.score?.label === filter)) &&
    (c.score == null || inScoreRange(c.score.score)),
  );

  const topBangNo = scoredComments
    .filter(c => c.score!.label === 'BÙNG NỔ')
    .sort((a, b) => b.score!.score - a.score!.score)
    .slice(0, 3);
  const topVuiVe = scoredComments
    .filter(c => c.score!.label === 'VUI VẺ')
    .sort((a, b) => a.score!.score - b.score!.score)
    .slice(0, 3);

  return (
    <div className="page">
      <h1 className="thread-title">{data.thread.title ?? 'Bài viết Threads'}</h1>
      <p className="thread-meta">
        @{data.thread.author_username ?? 'unknown'}
        {data.thread.posted_at != null && <> - {formatRelativeTime(data.thread.posted_at)}</>}
        {' '}- <a href={data.thread.url} target="_blank" rel="noreferrer" className="thread-link">Xem trên Threads</a>
      </p>
      {data.thread.content && <p className="thread-content">{data.thread.content}</p>}
      {data.thread.scoring_status === 'scored' && data.breakdown && (
        <div className="thread-summary">
          <HeatGauge breakdown={data.breakdown} />
          <div className="thread-summary-stats">
            <span className="stat-chip anger">Bùng nổ <span className="stat-n">{data.breakdown.bang_no}</span></span>
            <span className="stat-chip neutral">Trung lập <span className="stat-n">{data.breakdown.trung_lap}</span></span>
            <span className="stat-chip calm">Vui vẻ <span className="stat-n">{data.breakdown.vui_ve}</span></span>
          </div>
          {data.thread.avg_anger_score != null && (
            <p className="thread-avg">
              Điểm tức giận trung bình
              <strong className="mono thread-avg-value">{data.thread.avg_anger_score.toFixed(1)}/100</strong>
            </p>
          )}
        </div>
      )}

      <div className="filter-controls">
        <select
          className="filter-select"
          aria-label="Lọc theo điểm"
          value={scoreFilter}
          onChange={e => setScoreFilter(e.target.value as typeof scoreFilter)}
        >
          <option value="all">Tất cả mức điểm</option>
          <option value="70-100">70-100 Bùng nổ</option>
          <option value="30-69">30-69 Trung lập</option>
          <option value="0-29">0-29 Vui vẻ</option>
        </select>
      </div>

      {topBangNo.length > 0 && (
        <section className="ranking-section bang">
          <h2 className="ranking-title">Top Bùng nổ</h2>
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
          <h2 className="ranking-title">Top Vui vẻ</h2>
          {topVuiVe.map(c => (
            <div key={c.id} className="ranking-item">
              <span className="ranking-text">{c.text}</span>
              <span className="mono ranking-score">{c.score!.score.toFixed(0)}/100</span>
            </div>
          ))}
        </section>
      )}

      <div className="filter-tabs">
        {(['all', 'BÙNG NỔ', 'TRUNG LẬP', 'VUI VẺ'] as const).map(f => (
          <button key={f} className={`filter-tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Tất cả' : f === 'BÙNG NỔ' ? 'Bùng nổ' : f === 'TRUNG LẬP' ? 'Trung lập' : 'Vui vẻ'}
          </button>
        ))}
      </div>

      {visible.map(c => (
        <CommentCard key={c.id} comment={c} voteCounts={data.vote_counts[c.id] ?? { correct: 0, incorrect: 0 }} />
      ))}

      <DiscussionBox threadId={data.thread.id} userComments={data.user_comments} onPosted={load} />
    </div>
  );
}
