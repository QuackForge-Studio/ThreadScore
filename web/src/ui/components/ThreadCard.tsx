import { Link } from 'react-router-dom';
import HeatGauge from './HeatGauge';
import { formatRelativeTime } from '../format';
import type { ThreadRecord } from '../../shared/types';

export default function ThreadCard({ thread }: { thread: ThreadRecord }) {
  const breakdown = thread.score_breakdown ? JSON.parse(thread.score_breakdown) : null;
  return (
    <article className="threadcard">
      <Link to={`/t/${thread.id}`} className="threadcard-title">
        {thread.title ?? 'Bài viết Threads'}
      </Link>
      <p className="threadcard-meta">
        @{thread.author_username ?? 'unknown'} - {thread.total_comments} bình luận
        {thread.posted_at != null && <> - {formatRelativeTime(thread.posted_at)}</>}
        {thread.scoring_status !== 'scored' && <span className="pill">Đang chấm điểm...</span>}
      </p>
      {breakdown && <HeatGauge breakdown={breakdown} />}
      {thread.avg_anger_score != null && (
        <p className="threadcard-score">
          Điểm tức giận trung bình: <strong className="mono">{thread.avg_anger_score.toFixed(1)}/100</strong>
        </p>
      )}
    </article>
  );
}
