import { useNavigate } from 'react-router-dom';
import { Fire, Sparkle, Coffee, ChatCircleDots, ArrowRight, ArrowSquareOut, Lightning, Question } from '@phosphor-icons/react';
import HeatGauge from './HeatGauge';
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

export default function ThreadCard({ thread }: { thread: ThreadRecord }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  let breakdown: { bang_no: number; trung_lap: number; vui_ve: number } | null = null;
  if (thread.score_breakdown) {
    try {
      breakdown = typeof thread.score_breakdown === 'string'
        ? JSON.parse(thread.score_breakdown)
        : thread.score_breakdown;
    } catch {
      breakdown = null;
    }
  }

  const avg = thread.avg_anger_score;
  const isScored = thread.scoring_status === 'scored' && avg != null;
  const cls = avg != null ? labelFromScore(avg) : null;
  const scoreBigClass = cls === 'BÙNG NỔ' ? 'anger' : cls === 'VUI VẺ' ? 'calm' : 'neutral';
  const heat = cls ? LABEL_COLORS[cls] : 'var(--border-soft)';

  const totalBreakdown = breakdown ? (breakdown.bang_no + breakdown.trung_lap + breakdown.vui_ve) || 1 : 1;
  const pctAngry = breakdown ? Math.round((breakdown.bang_no / totalBreakdown) * 100) : 0;
  const pctNeutral = breakdown ? Math.round((breakdown.trung_lap / totalBreakdown) * 100) : 0;
  const pctCalm = breakdown ? Math.round((breakdown.vui_ve / totalBreakdown) * 100) : 0;

  const displayTitle = thread.title && thread.title !== 'Thread'
    ? thread.title
    : thread.content
    ? (thread.content.length > 130 ? thread.content.slice(0, 130) + '...' : thread.content)
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
      className="threadcard"
      style={{ '--card-heat': heat } as React.CSSProperties}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`${displayTitle} - ${isScored ? `${Math.round(avg!)}/100 ${t('tc.dramaScore')}` : t('tc.pending')}`}
    >
      {/* 1. Header: Monogram Avatar & Drama Score Badge */}
      <div className="threadcard-head">
        <div className="threadcard-author">
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
          <span className="threadcard-username">
            @{authorName}
          </span>
          {thread.posted_at != null && (
            <span className="threadcard-time">
              · {formatRelativeTime(thread.posted_at)}
            </span>
          )}
        </div>

        {/* Drama Level Badge với Tooltip giải thích tiêu chí */}
        {isScored ? (
          <div
            className={`threadcard-scorebig ${scoreBigClass}`}
            title={t('tc.heatBadge')}
          >
            {cls === 'BÙNG NỔ' ? (
              <Fire size={15} weight="fill" />
            ) : cls === 'VUI VẺ' ? (
              <Coffee size={15} weight="fill" />
            ) : (
              <Sparkle size={15} weight="fill" />
            )}
            <span className="threadcard-score-val">{Math.round(avg!)}/100</span>
            <span className="threadcard-score-label">{t('tc.dramaScore')}</span>
            <span className="threadcard-score-dot">•</span>
            <span className="threadcard-score-status">
              {cls === 'BÙNG NỔ' ? t('tc.hot') : cls === 'VUI VẺ' ? t('tc.calm') : t('tc.neutral')}
            </span>
            <span className="threadcard-score-info-btn" aria-hidden="true">
              <Question size={11} weight="bold" />
            </span>
          </div>
        ) : (
          <span className="pill pending">
            <Lightning size={13} weight="fill" /> {t('tc.pending')}
          </span>
        )}
      </div>

      {/* 2. Tiêu đề với line-height thoáng cho dấu tiếng Việt */}
      <h3 className="threadcard-title-wrap">
        <span className="threadcard-title">
          {displayTitle}
        </span>
      </h3>

      {/* 3. Phân bố cảm xúc (Sentiment Spectrum) */}
      {isScored && breakdown && (
        <div className="threadcard-spectrum">
          <HeatGauge breakdown={breakdown} />
          <div className="threadcard-spectrum-legend">
            <span className="spectrum-tag angry">
              <span className="spectrum-dot angry" />
              <b>{pctAngry}%</b> {t('tc.angry')} <small>({breakdown.bang_no})</small>
            </span>
            <span className="spectrum-tag neutral">
              <span className="spectrum-dot neutral" />
              <b>{pctNeutral}%</b> {t('tc.neutral')} <small>({breakdown.trung_lap})</small>
            </span>
            <span className="spectrum-tag positive">
              <span className="spectrum-dot positive" />
              <b>{pctCalm}%</b> {t('tc.positive')} <small>({breakdown.vui_ve})</small>
            </span>
          </div>
        </div>
      )}

      {/* 4. Footer: Số bình luận, Nút Threads nổi bật & CTA */}
      <div className="threadcard-foot">
        <div className="threadcard-foot-left">
          <span className="threadcard-comments-count">
            <ChatCircleDots size={16} weight="fill" color="var(--accent)" />
            <b>{thread.total_comments}</b> {t('tc.comments')}
          </span>
          {thread.url && (
            <a
              href={thread.url}
              target="_blank"
              rel="noreferrer"
              className="threadcard-threads-link"
              title={t('tc.onThreads')}
              onClick={(e) => e.stopPropagation()}
            >
              Threads <ArrowSquareOut size={13} weight="bold" />
            </a>
          )}
        </div>

        <span className="threadcard-cta">
          {t('tc.viewReport')} <ArrowRight size={14} weight="bold" className="threadcard-cta-icon" />
        </span>
      </div>
    </article>
  );
}
