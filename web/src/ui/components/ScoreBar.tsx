import { LABEL_COLORS } from '../../shared/labels';
import type { Label } from '../../shared/types';

export default function ScoreBar({ score, label }: { score: number; label: Label }) {
  const color = LABEL_COLORS[label];
  return (
    <div className="scorebar" role="img" aria-label={`${score}/100`}>
      <div className="scorebar-track">
        <div className="scorebar-fill" style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: color }} />
      </div>
      <strong className="scorebar-value">{score}</strong>
    </div>
  );
}
