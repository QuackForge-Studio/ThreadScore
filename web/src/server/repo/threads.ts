import type { ThreadRecord } from '../../shared/types';

export async function insertThread(db: D1Database, t: ThreadRecord): Promise<void> {
  await db.prepare(
    `INSERT INTO threads (id, url, title, content, author_username, author_name, posted_at,
      main_post_id, total_comments, scoring_status, avg_anger_score, score_breakdown, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(t.id, t.url, t.title, t.content, t.author_username, t.author_name, t.posted_at,
    t.main_post_id, t.total_comments, t.scoring_status, t.avg_anger_score, t.score_breakdown, t.created_at).run();
}

export async function getThreadByUrl(db: D1Database, url: string): Promise<ThreadRecord | null> {
  const row = await db.prepare('SELECT * FROM threads WHERE url = ?').bind(url).first<ThreadRecord>();
  return row ?? null;
}

export async function getThreadById(db: D1Database, id: string): Promise<ThreadRecord | null> {
  const row = await db.prepare('SELECT * FROM threads WHERE id = ?').bind(id).first<ThreadRecord>();
  return row ?? null;
}

export async function updateThread(db: D1Database, id: string, patch: Partial<ThreadRecord>): Promise<void> {
  const keys = Object.keys(patch) as (keyof ThreadRecord)[];
  if (keys.length === 0) return;
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => patch[k]);
  await db.prepare(`UPDATE threads SET ${sets} WHERE id = ?`).bind(...values, id).run();
}

export async function listThreads(db: D1Database, opts: { sort: 'newest' | 'hottest' | 'most_comments'; limit: number; offset: number }): Promise<ThreadRecord[]> {
  const orderBy = opts.sort === 'hottest' ? 'avg_anger_score DESC' : opts.sort === 'most_comments' ? 'total_comments DESC' : 'created_at DESC';
  const { results } = await db.prepare(
    `SELECT * FROM threads ORDER BY CASE WHEN scoring_status = 'scored' THEN 0 ELSE 1 END, ${orderBy} LIMIT ? OFFSET ?`
  ).bind(opts.limit, opts.offset).all<ThreadRecord>();
  return results ?? [];
}

export async function countThreads(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) as count FROM threads').first<{ count: number }>();
  return row?.count ?? 0;
}

export async function listPendingScoring(db: D1Database, limit: number): Promise<ThreadRecord[]> {
  // Include 'scoring' threads so a worker that crashed (or a prior pass that hit the
  // MAX_WORKER_BATCHES ceiling) can be resumed on the next run.
  // Also include threads marked 'scored' but missing avg_anger_score.
  const { results } = await db.prepare(
    `SELECT * FROM threads 
     WHERE scoring_status IN ('pending_scoring', 'scoring')
        OR (scoring_status = 'scored' AND avg_anger_score IS NULL)
     ORDER BY created_at ASC LIMIT ?`
  ).bind(limit).all<ThreadRecord>();
  return results ?? [];
}
