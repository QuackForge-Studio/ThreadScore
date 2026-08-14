import ScoreBar from './ScoreBar';
import VoteButtons from './VoteButtons';
import { LABEL_DISPLAY, LABEL_COLORS } from '../../shared/labels';
import type { CommentRecord, AiScoreRecord, Label } from '../../shared/types';

type Props = {
  comment: CommentRecord & { score: AiScoreRecord | null };
  voteCounts: { correct: number; incorrect: number };
};

function labelClass(label: Label): string {
  if (label === 'BÙNG NỔ') return 'label-anger';
  if (label === 'TRUNG LẬP') return 'label-neutral';
  return 'label-calm';
}

export default function CommentCard({ comment, voteCounts }: Props) {
  const label = comment.score?.label ?? null;
  return (
    <article className="commentcard" style={label ? { borderLeftColor: LABEL_COLORS[label] } : undefined}>
      <p className="commentcard-text">{comment.text}</p>
      <p className="commentcard-meta">
        @{comment.author_username ?? 'unknown'}
        {comment.like_count > 0 && <> - {comment.like_count} thích</>}
      </p>
      {comment.score ? (
        <>
          <ScoreBar score={comment.score.score} label={comment.score.label} />
          <p className="commentcard-score">
            <span className={`label-pill ${labelClass(comment.score.label)}`}>{LABEL_DISPLAY[comment.score.label]}</span>
            {comment.score.reason && <span className="commentcard-reason">Vì sao: {comment.score.reason}</span>}
          </p>
          <VoteButtons commentId={comment.id} initial={voteCounts} />
        </>
      ) : (
        <em className="commentcard-pending">Đang chờ chấm điểm...</em>
      )}
    </article>
  );
}
