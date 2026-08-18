import type { CommentRecord } from '../../shared/types';

export async function insertComments(db: D1Database, comments: CommentRecord[]): Promise<void> {
  const stmt = db.prepare(
    `INSERT INTO comments (id, thread_id, external_id, author_username, author_name, text, like_count, posted_at, parent_id, reply_to_username, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (let i = 0; i < comments.length; i += 50) {
    const batch = comments.slice(i, i + 50);
    const prepared = batch.map(c => stmt.bind(c.id, c.thread_id, c.external_id, c.author_username,
      c.author_name, c.text, c.like_count, c.posted_at, c.parent_id, c.reply_to_username, c.created_at));
    await db.batch(prepared);
  }
}

export async function getCommentsByThread(db: D1Database, threadId: string): Promise<CommentRecord[]> {
  const { results } = await db.prepare(
    'SELECT * FROM comments WHERE thread_id = ? ORDER BY created_at ASC, rowid ASC'
  ).bind(threadId).all<CommentRecord>();
  return results ?? [];
}

export async function deleteCommentsByThread(db: D1Database, threadId: string): Promise<void> {
  await db.prepare('DELETE FROM comments WHERE thread_id = ?').bind(threadId).run();
}

export async function countCommentsByThread(db: D1Database, threadId: string): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) as n FROM comments WHERE thread_id = ?').bind(threadId).first<{ n: number }>();
  return row?.n ?? 0;
}
