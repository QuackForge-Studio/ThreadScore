import { Link } from 'react-router-dom';
import HeatGauge from './HeatGauge';
import { labelFromScore, LABEL_COLORS } from '../../shared/labels';
import { formatRelativeTime } from '../format';
import type { ThreadRecord } from '../../shared/types';

export default function ThreadCard({ thread }: { thread: ThreadRecord }) {
  const breakdown = thread.score_breakdown ? JSON.parse(thread.score_breakdown) : null;
  const avg = thread.avg_anger_score;
  const cls = avg != null ? labelFromScore(avg) : null;
  const scoreBigClass = cls === 'BÙNG NỔ' ? 'anger' : cls === 'VUI VẺ' ? 'calm' : 'neutral';
  const heat = cls ? LABEL_COLORS[cls] : 'var(--neutral)';

  return (
    <article className="threadcard" style={{ '--card-heat': heat } as React.CSSProperties}>
      <div className="threadcard-head">
        <Link to={`/t/${thread.id}`} className="threadcard-title">
          {thread.title ?? 'Bài viết Threads'}
        </Link>
        {avg != null && (
          <span className={`threadcard-scorebig ${scoreBigClass}`} title="Điểm tức giận trung bình">
            {avg.toFixed(0)}
          </span>
        )}
      </div>
      <p className="threadcard-meta">
        @{thread.author_username ?? 'unknown'}
        {' '}- {thread.total_comments} bình luận
        {thread.posted_at != null && <> - {formatRelativeTime(thread.posted_at)}</>}
        {thread.scoring_status !== 'scored' && <span className="pill">Đang chấm điểm</span>}
      </p>
      {breakdown && <HeatGauge breakdown={breakdown} />}
      {avg != null && (
        <div className="threadcard-foot">
          <span className="commentcard-reason">Điểm tức giận TB <strong className="mono">{avg.toFixed(1)}/100</strong></span>
        </div>
      )}
    </article>
  );
}
