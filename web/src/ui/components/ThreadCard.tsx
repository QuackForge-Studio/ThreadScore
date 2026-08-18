import { useNavigate } from 'react-router-dom';
import { Fire, Sparkle, Coffee, ChatCircleDots, ArrowRight, ArrowSquareOut, Lightning, User } from '@phosphor-icons/react';
import HeatGauge from './HeatGauge';
import { labelFromScore, LABEL_COLORS } from '../../shared/labels';
import { formatRelativeTime } from '../format';
import { useI18n } from '../i18n';
import type { ThreadRecord } from '../../shared/types';

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

  const showContentSnippet = thread.content && thread.title && thread.title !== thread.content && thread.title !== 'Thread';

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
      {/* 1. Header: Author & Drama Score Badge */}
      <div className="threadcard-head">
        <div className="threadcard-author">
          <div className="threadcard-avatar">
            <User size={14} weight="bold" />
          </div>
          <span className="threadcard-username">
            @{thread.author_username || t('tc.anon')}
          </span>
          {thread.posted_at != null && (
            <span className="threadcard-time">
              · {formatRelativeTime(thread.posted_at)}
            </span>
          )}
        </div>

        {/* Drama Level Badge - Rõ ràng: [Điểm]/100 ĐỘ DRAMA • TRẠNG THÁI */}
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
          </div>
        ) : (
          <span className="pill pending">
            <Lightning size={13} weight="fill" /> {t('tc.pending')}
          </span>
        )}
      </div>

      {/* 2. Tiêu đề & Nội dung tóm tắt */}
      <h3 className="threadcard-title-wrap">
        <span className="threadcard-title">
          {displayTitle}
        </span>
      </h3>

      {showContentSnippet && (
        <p className="threadcard-snippet">
          {thread.content}
        </p>
      )}

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

      {/* 4. Footer: Số bình luận, Link Threads gốc & CTA */}
      <div className="threadcard-foot">
        <div className="threadcard-foot-left">
          <span className="threadcard-comments-count">
            <ChatCircleDots size={16} weight="fill" color="var(--accent)" />
            {thread.total_comments} {t('tc.comments')}
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
              Threads <ArrowSquareOut size={13} />
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
