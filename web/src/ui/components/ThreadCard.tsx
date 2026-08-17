import { Link } from 'react-router-dom';
import { Fire, Sparkle, Coffee, ChatCircleDots, ArrowRight, ArrowSquareOut, Lightning, User } from '@phosphor-icons/react';
import HeatGauge from './HeatGauge';
import { labelFromScore, LABEL_COLORS } from '../../shared/labels';
import { formatRelativeTime } from '../format';
import { useI18n } from '../i18n';
import type { ThreadRecord } from '../../shared/types';

export default function ThreadCard({ thread }: { thread: ThreadRecord }) {
  const { t, lang } = useI18n();

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

  return (
    <article className="threadcard" style={{ '--card-heat': heat } as React.CSSProperties}>
      <div className="threadcard-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--muted)',
            }}
          >
            <User size={14} />
          </div>
          <span style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--ink)' }}>
            @{thread.author_username || t('tc.anon')}
          </span>
          {thread.posted_at != null && (
            <span style={{ color: 'var(--muted)', fontSize: '12.5px' }}>
              · {formatRelativeTime(thread.posted_at)}
            </span>
          )}
        </div>

        {isScored ? (
          <div
            className={`threadcard-scorebig ${scoreBigClass}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '13px', borderRadius: 'var(--radius-pill)' }}
            title={t('tc.heatBadge')}
          >
            {cls === 'BÙNG NỔ' ? (
              <Fire size={15} weight="fill" />
            ) : cls === 'VUI VẺ' ? (
              <Coffee size={15} weight="fill" />
            ) : (
              <Sparkle size={15} weight="fill" />
            )}
            <span style={{ fontWeight: '800', fontFamily: 'var(--font-mono)' }}>{avg!.toFixed(0)}/100</span>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {cls === 'BÙNG NỔ' ? t('tc.hot') : cls === 'VUI VẺ' ? t('tc.calm') : t('tc.neutral')}
            </span>
          </div>
        ) : (
          <span className="pill pending" style={{ fontSize: '11.5px' }}>
            <Lightning size={13} weight="fill" /> {t('tc.pending')}
          </span>
        )}
      </div>

      <h3 style={{ margin: '0 0 8px', lineHeight: '1.4' }}>
        <Link to={`/t/${thread.id}`} className="threadcard-title" style={{ fontSize: '17.5px', fontWeight: '800', color: 'var(--ink)' }}>
          {displayTitle}
        </Link>
      </h3>

      {showContentSnippet && (
        <p style={{ margin: '0 0 14px', fontSize: '13.5px', color: 'var(--muted)', lineHeight: '1.55', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {thread.content}
        </p>
      )}

      {isScored && breakdown && (
        <div style={{ margin: '14px 0 12px' }}>
          <HeatGauge breakdown={breakdown} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px', fontSize: '12px', color: 'var(--muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--anger)' }} />
              <b>{pctAngry}%</b> {t('tc.angry')} ({breakdown.bang_no})
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neutral)' }} />
              <b>{pctNeutral}%</b> {t('tc.neutral')} ({breakdown.trung_lap})
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--calm)' }} />
              <b>{pctCalm}%</b> {t('tc.positive')} ({breakdown.vui_ve})
            </span>
          </div>
        </div>
      )}

      <div className="threadcard-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-soft)', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: 'var(--ink-2)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
            <ChatCircleDots size={16} color="var(--accent)" />
            {thread.total_comments} {t('tc.comments')}
          </span>
          {thread.url && (
            <a
              href={thread.url}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--muted)', fontSize: '12px', textDecoration: 'none' }}
              title={t('tc.onThreads')}
            >
              Threads <ArrowSquareOut size={13} />
            </a>
          )}
        </div>

        <Link
          to={`/t/${thread.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '13px',
            fontWeight: '700',
            color: 'var(--accent)',
            textDecoration: 'none',
            transition: 'gap 150ms ease',
          }}
        >
          {t('tc.viewReport')} <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
    </article>
  );
}
