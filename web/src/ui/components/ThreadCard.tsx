import { useNavigate } from 'react-router-dom';
import { Fire, Sparkle, Coffee, ChatCircleDots, ArrowRight, ArrowSquareOut, Lightning } from '@phosphor-icons/react';
import { labelFromScore, LABEL_COLORS } from '../../shared/labels';
import { formatRelativeTime } from '../format';
import { useI18n } from '../i18n';
import type { ThreadRecord } from '../../shared/types';

function getAvatarStyle(username: string | null) {
  if (!username) {
    return {
      background: 'linear-gradient(135deg, #F0ECE1 0%, #E2DBD0 100%)',
      color: 'var(--ink-2)',
    };
  }
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palettes = [
    { bg: 'linear-gradient(135deg, #FFE8D6 0%, #FFD6BA 100%)', color: '#B34A1B' },
    { bg: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)', color: '#0369A1' },
    { bg: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)', color: '#7E22CE' },
    { bg: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)', color: '#15803D' },
    { bg: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', color: '#B45309' },
    { bg: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)', color: '#B91C1C' },
  ];
  const idx = Math.abs(hash) % palettes.length;
  return {
    background: palettes[idx].bg,
    color: palettes[idx].color,
  };
}

export default function ThreadCard({
  thread,
  rank,
}: {
  thread: ThreadRecord;
  rank?: number;
  variant?: 'featured' | 'compact';
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const avg = thread.avg_anger_score;
  const isScored = thread.scoring_status === 'scored' && avg != null;
  const cls = avg != null ? labelFromScore(avg) : null;
  const scoreClass = cls === 'BÙNG NỔ' ? 'anger' : cls === 'VUI VẺ' ? 'calm' : 'neutral';
  const heat = cls ? LABEL_COLORS[cls] : 'var(--border-soft)';

  const displayTitle = thread.title && thread.title !== 'Thread'
    ? thread.title
    : thread.content
    ? (thread.content.length > 180 ? thread.content.slice(0, 180) + '...' : thread.content)
    : t('sb.fallback');

  const authorName = thread.author_username || t('tc.anon');
  const avatarInitial = thread.author_username ? thread.author_username.charAt(0).toUpperCase() : 'TS';
  const avatarStyle = getAvatarStyle(thread.author_username);

  function handleCardClick() {
    navigate(`/t/${thread.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/t/${thread.id}`);
    }
  }

  return (
    <article
      className="threadcard threadcard-refined"
      style={{ '--card-heat': heat } as React.CSSProperties}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`${displayTitle} - ${isScored ? `${Math.round(avg!)}/100 ${t('tc.dramaScore')}` : t('tc.pending')}`}
    >
      {/* TẦNG 1: Rank, Avatar, Account, Timestamp, Secondary Threads Outlink */}
      <div className="threadcard-head-tier">
        <div className="threadcard-author-group">
          {rank != null && (
            <span className="threadcard-rank-badge">
              #{rank < 10 ? `0${rank}` : rank}
            </span>
          )}

          <div className="threadcard-avatar" style={avatarStyle}>
            {thread.author_avatar_url ? (
              <img
                src={thread.author_avatar_url}
                alt={authorName}
                className="threadcard-avatar-img"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span>{avatarInitial}</span>
            )}
          </div>

          <span className="threadcard-username">@{authorName}</span>

          {thread.posted_at != null && (
            <span className="threadcard-time-sep">· {formatRelativeTime(thread.posted_at)}</span>
          )}
        </div>

        {thread.url && (
          <a
            href={thread.url}
            target="_blank"
            rel="noreferrer"
            className="threadcard-outlink-subtle"
            title={t('tc.onThreads')}
            onClick={(e) => e.stopPropagation()}
          >
            <span>Threads</span>
            <ArrowSquareOut size={13} weight="bold" />
          </a>
        )}
      </div>

      {/* TẦNG 2: Nội dung / Tiêu đề bài viết giới hạn 2-3 dòng */}
      <div className="threadcard-content-tier">
        <h3 className="threadcard-content-text">
          {displayTitle}
        </h3>
      </div>

      {/* TẦNG 3: Drama Score + Số bình luận + CTA xem chi tiết */}
      <div className="threadcard-footer-tier">
        <div className="threadcard-meta-left">
          {/* Drama Score Pill */}
          {isScored ? (
            <div
              className={`threadcard-drama-pill ${scoreClass}`}
              title={`${Math.round(avg!)}/100 - ${cls}`}
            >
              {cls === 'BÙNG NỔ' ? (
                <Fire size={14} weight="fill" />
              ) : cls === 'VUI VẺ' ? (
                <Coffee size={14} weight="fill" />
              ) : (
                <Sparkle size={14} weight="fill" />
              )}
              <span className="drama-score-num">{Math.round(avg!)}/100</span>
              <span className="drama-score-text">{t('tc.dramaScore')}</span>
            </div>
          ) : (
            <div className="threadcard-drama-pill pending" title={t('tc.pending')}>
              <Lightning size={13} weight="fill" />
              <span className="drama-score-text">{t('tc.pending')}</span>
            </div>
          )}

          {/* Comment Count */}
          <span className="threadcard-comment-stat">
            <ChatCircleDots size={15} weight="regular" />
            <span>{thread.total_comments}</span>
            <span className="stat-label">{t('tc.comments')}</span>
          </span>
        </div>

        {/* Primary CTA */}
        <div className="threadcard-primary-cta">
          <span>{t('tc.viewAnalysis')}</span>
          <ArrowRight size={14} weight="bold" className="cta-arrow" />
        </div>
      </div>
    </article>
  );
}
