import ScoreBar from './ScoreBar';
import VoteButtons from './VoteButtons';
import { LABEL_COLORS } from '../../shared/labels';
import { useI18n } from '../i18n';
import type { CommentRecord, AiScoreRecord, Label } from '../../shared/types';

type Props = {
  comment: CommentRecord & { score: AiScoreRecord | null };
  voteCounts: { correct: number; incorrect: number };
  depth?: number;
  replyToUsername?: string | null;
  isAuthor?: boolean;
};

function labelClass(label: Label): string {
  if (label === 'BÙNG NỔ') return 'label-anger';
  if (label === 'TRUNG LẬP') return 'label-neutral';
  return 'label-calm';
}

const labelText: Record<Label, 'tp.hot' | 'tp.neutral' | 'tp.calm'> = {
  'BÙNG NỔ': 'tp.hot',
  'TRUNG LẬP': 'tp.neutral',
  'VUI VẺ': 'tp.calm',
};

export default function CommentCard({ comment, voteCounts, depth = 0, replyToUsername = null, isAuthor = false }: Props) {
  const { t, tf } = useI18n();
  const label = comment.score?.label ?? null;
  return (
    <article className="commentcard" style={depth > 0 ? { marginLeft: Math.min(depth, 8) * 22 } : undefined}>
      <p className="commentcard-text">{comment.text}</p>
      <p className="commentcard-meta">
        @{comment.author_username ?? t('tp.anon')}
        {isAuthor && <span className="comment-badge-author">{t('tp.authorBadge')}</span>}
        {replyToUsername && <span className="comment-reply-hint">↳ {tf('tp.replyTo', { user: replyToUsername })}</span>}
        {comment.like_count > 0 && <> - {comment.like_count} {t('tp.likes')}</>}
      </p>
      {comment.score ? (
        <>
          <ScoreBar score={comment.score.score} label={comment.score.label} />
          <p className="commentcard-score">
            <span className={`label-pill ${labelClass(comment.score.label)}`}>{t(labelText[comment.score.label])}</span>
            {comment.score.reason && <span className="commentcard-reason">{t('tp.reason')} {comment.score.reason}</span>}
          </p>
          <VoteButtons commentId={comment.id} initial={voteCounts} />
        </>
      ) : (
        <em className="commentcard-pending">{t('tp.pending')}</em>
      )}
    </article>
  );
}
