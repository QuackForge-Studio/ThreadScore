import { LABEL_COLORS } from '../../shared/labels';
import type { Label } from '../../shared/types';

export default function ScoreBar({ score, label }: { score: number; label: Label }) {
  const color = LABEL_COLORS[label];
  return (
    <div className="scorebar">
      <div className="scorebar-track">
        <div className="scorebar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <strong className="scorebar-value">{score}</strong>
    </div>
  );
}
