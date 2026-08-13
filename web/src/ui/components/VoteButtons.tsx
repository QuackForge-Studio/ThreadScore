import { useState } from 'react';
import { vote } from '../api';

export default function VoteButtons({ commentId, initial }: { commentId: string; initial: { correct: number; incorrect: number } }) {
  const [counts, setCounts] = useState(initial);
  const [voted, setVoted] = useState<null | 'correct' | 'incorrect'>(null);
  const [error, setError] = useState<string | null>(null);

  async function doVote(v: 'correct' | 'incorrect') {
    if (voted) return;
    try {
      const r = await vote(commentId, v);
      setCounts(r.counts);
      setVoted(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể vote');
    }
  }

  const total = counts.correct + counts.incorrect;
  const trust = total >= 3 ? Math.round((counts.correct / total) * 100) : null;

  return (
    <div className="votebuttons">
      <button className="btn btn-ghost" onClick={() => doVote('correct')} disabled={!!voted}>AI chấm đúng ({counts.correct})</button>
      <button className="btn btn-ghost" onClick={() => doVote('incorrect')} disabled={!!voted}>AI chấm sai ({counts.incorrect})</button>
      {trust !== null && <span className="votebuttons-trust" title="Độ tin cậy của AI">Tin cậy {trust}%</span>}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
