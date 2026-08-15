import { LABEL_COLORS, labelFromScore } from '../../shared/labels';
import type { OverallStats } from '../../shared/types';
import { CountUp } from './motion';

function heatColor(score: number): string {
  if (score >= 70) return LABEL_COLORS['BÙNG NỔ'];
  if (score >= 30) return LABEL_COLORS['TRUNG LẬP'];
  return LABEL_COLORS['VUI VẺ'];
}

export default function OverallHeat({ stats }: { stats: OverallStats }) {
  const total = stats.breakdown.bang_no + stats.breakdown.trung_lap + stats.breakdown.vui_ve || 1;
  const avg = stats.avg_anger ?? 0;
  const label = stats.avg_anger != null ? labelFromScore(avg) : null;
  const rows = [
    { key: 'bang_no', label: 'Bùng nổ', color: LABEL_COLORS['BÙNG NỔ'], n: stats.breakdown.bang_no, dot: 'anger' },
    { key: 'trung_lap', label: 'Trung lập', color: LABEL_COLORS['TRUNG LẬP'], n: stats.breakdown.trung_lap, dot: 'neutral' },
    { key: 'vui_ve', label: 'Vui vẻ', color: LABEL_COLORS['VUI VẺ'], n: stats.breakdown.vui_ve, dot: 'calm' },
  ] as const;

  return (
    <div className="overall-heat">
      <div className="overall-heat-inner">
        <div className="overall-thermo">
          <span className="overall-thermo-num">
            {stats.avg_anger != null ? <CountUp to={Math.round(avg)} /> : '--'}
          </span>
          <span className="overall-thermo-label">nhiệt độ cộng đồng</span>
          <div className="thermo-track">
            <div className="thermo-knob" style={{ left: `${Math.min(100, Math.max(0, avg))}%`, background: heatColor(avg) }} />
          </div>
          <span className="overall-thermo-label" style={{ color: label ? heatColor(avg) : 'var(--faint)' }}>
            {label ? label.toLowerCase() : 'chưa có dữ liệu'}
          </span>
        </div>

        <div className="overall-legend">
          {rows.map(r => (
            <div className="overall-legend-row" key={r.key}>
              <span className={`dot ${r.dot}`} />
              <div className="bar"><i style={{ width: `${(r.n / total) * 100}%`, background: r.color }} /></div>
              <span className="n">{r.n}</span>
            </div>
          ))}
        </div>

        <div className="overall-stats">
          <div className="overall-stat">
            <span className="k">Bài viết đã chấm</span>
            <span className="v"><CountUp to={stats.threads} /></span>
          </div>
          <div className="overall-stat">
            <span className="k">Bình luận đã phân tích</span>
            <span className="v"><CountUp to={stats.comments} /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
