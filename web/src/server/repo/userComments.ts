import type { UserCommentRecord } from '../../shared/types';

export async function insertUserComment(db: D1Database, c: UserCommentRecord): Promise<void> {
  await db.prepare(
    `INSERT INTO user_comments (id, thread_id, user_id, display_name, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(c.id, c.thread_id, c.user_id, c.display_name, c.content, c.created_at).run();
}

export async function listUserCommentsByThread(db: D1Database, threadId: string): Promise<UserCommentRecord[]> {
  const { results } = await db.prepare(
    'SELECT * FROM user_comments WHERE thread_id = ? ORDER BY created_at ASC'
  ).bind(threadId).all<UserCommentRecord>();
  return results ?? [];
}
