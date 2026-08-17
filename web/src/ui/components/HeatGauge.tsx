import { LABEL_COLORS } from '../../shared/labels';
import { useI18n } from '../i18n';

export default function HeatGauge({ breakdown }: { breakdown: { bang_no: number; trung_lap: number; vui_ve: number } }) {
  const { t } = useI18n();
  const total = breakdown.bang_no + breakdown.trung_lap + breakdown.vui_ve || 1;
  const segs = [
    { n: breakdown.bang_no, color: LABEL_COLORS['BÙNG NỔ'], label: t('tp.hot') },
    { n: breakdown.trung_lap, color: LABEL_COLORS['TRUNG LẬP'], label: t('tp.neutral') },
    { n: breakdown.vui_ve, color: LABEL_COLORS['VUI VẺ'], label: t('tp.calm') },
  ];
  return (
    <div className="heatgauge" role="img" title={segs.map(s => `${s.label}: ${s.n}`).join(' | ')}>
      {segs.map((s, i) => (
        <div key={i} className="heatgauge-seg" style={{ width: `${(s.n / total) * 100}%`, background: s.color }} />
      ))}
    </div>
  );
}
