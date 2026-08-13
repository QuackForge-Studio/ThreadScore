import type { AiScoreRecord } from '../../shared/types';

export async function insertScores(db: D1Database, scores: AiScoreRecord[]): Promise<void> {
  const stmt = db.prepare(
    `INSERT INTO ai_scores (id, comment_id, score, label, reason, model, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const prepared = scores.map(s => stmt.bind(s.id, s.comment_id, s.score, s.label, s.reason, s.model, s.created_at));
  await db.batch(prepared);
}

export async function getScoresForThread(db: D1Database, threadId: string): Promise<AiScoreRecord[]> {
  const { results } = await db.prepare(
    `SELECT s.* FROM ai_scores s JOIN comments c ON c.id = s.comment_id WHERE c.thread_id = ? ORDER BY s.score DESC`
  ).bind(threadId).all<AiScoreRecord>();
  return results ?? [];
}

export async function hasScoresForComment(db: D1Database, commentId: string): Promise<boolean> {
  const row = await db.prepare('SELECT COUNT(*) as n FROM ai_scores WHERE comment_id = ?').bind(commentId).first<{ n: number }>();
  return (row?.n ?? 0) > 0;
}
