import type { VoteRecord } from '../../shared/types';

export async function insertVote(db: D1Database, v: VoteRecord): Promise<void> {
  await db.prepare(
    `INSERT INTO votes (id, comment_id, user_id, vote, created_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(v.id, v.comment_id, v.user_id, v.vote, v.created_at).run();
}

export async function getVoteCounts(db: D1Database, commentId: string): Promise<{ correct: number; incorrect: number }> {
  const rows = await db.prepare(
    'SELECT vote, COUNT(*) as n FROM votes WHERE comment_id = ? GROUP BY vote'
  ).bind(commentId).all<{ vote: string; n: number }>();
  const counts = { correct: 0, incorrect: 0 };
  for (const r of rows.results ?? []) {
    if (r.vote === 'correct') counts.correct = r.n;
    else if (r.vote === 'incorrect') counts.incorrect = r.n;
  }
  return counts;
}
