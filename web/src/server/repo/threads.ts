import type { ThreadRecord } from '../../shared/types';

export async function insertThread(db: D1Database, t: ThreadRecord): Promise<void> {
  await db.prepare(
    `INSERT INTO threads (id, url, title, content, author_username, author_name, author_avatar_url, posted_at,
      main_post_id, total_comments, scoring_status, avg_anger_score, score_breakdown, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(t.id, t.url, t.title, t.content, t.author_username, t.author_name, t.author_avatar_url ?? null, t.posted_at,
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

export interface ListThreadsOptions {
  sort: 'newest' | 'hottest' | 'most_comments';
  limit: number;
  offset: number;
  date?: string; // YYYY-MM-DD
}

export async function listThreads(db: D1Database, opts: ListThreadsOptions): Promise<ThreadRecord[]> {
  const orderBy = opts.sort === 'hottest' ? 'avg_anger_score DESC' : opts.sort === 'most_comments' ? 'total_comments DESC' : 'created_at DESC';
  
  if (opts.date) {
    // Lọc theo ngày (tính theo UTC/GMT+7)
    // Tính timestamp start và end của ngày (khoảng 00:00:00 đến 23:59:59)
    const startSec = Math.floor(new Date(`${opts.date}T00:00:00+07:00`).getTime() / 1000) || Math.floor(new Date(`${opts.date}T00:00:00Z`).getTime() / 1000);
    const endSec = startSec + 86400;

    const { results } = await db.prepare(
      `SELECT * FROM threads 
       WHERE (COALESCE(posted_at, created_at) >= ? AND COALESCE(posted_at, created_at) < ?)
       ORDER BY CASE WHEN scoring_status = 'scored' THEN 0 ELSE 1 END, ${orderBy} LIMIT ? OFFSET ?`
    ).bind(startSec, endSec, opts.limit, opts.offset).all<ThreadRecord>();
    return results ?? [];
  }

  const { results } = await db.prepare(
    `SELECT * FROM threads ORDER BY CASE WHEN scoring_status = 'scored' THEN 0 ELSE 1 END, ${orderBy} LIMIT ? OFFSET ?`
  ).bind(opts.limit, opts.offset).all<ThreadRecord>();
  return results ?? [];
}

export async function countThreads(db: D1Database, date?: string): Promise<number> {
  if (date) {
    const startSec = Math.floor(new Date(`${date}T00:00:00+07:00`).getTime() / 1000) || Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
    const endSec = startSec + 86400;
    const row = await db.prepare(
      `SELECT COUNT(*) as count FROM threads 
       WHERE (COALESCE(posted_at, created_at) >= ? AND COALESCE(posted_at, created_at) < ?)`
    ).bind(startSec, endSec).first<{ count: number }>();
    return row?.count ?? 0;
  }
  const row = await db.prepare('SELECT COUNT(*) as count FROM threads').first<{ count: number }>();
  return row?.count ?? 0;
}

export async function getThreadActiveDates(db: D1Database): Promise<{ date: string; count: number }[]> {
  try {
    const { results } = await db.prepare(
      `SELECT strftime('%Y-%m-%d', datetime(COALESCE(posted_at, created_at), 'unixepoch', '+7 hours')) as date, COUNT(*) as count 
       FROM threads 
       WHERE date IS NOT NULL 
       GROUP BY date 
       ORDER BY date DESC`
    ).all<{ date: string; count: number }>();
    return results ?? [];
  } catch {
    // Fallback nếu strftime/unixepoch gặp môi trường đặc biệt
    const { results } = await db.prepare('SELECT posted_at, created_at FROM threads').all<{ posted_at: number | null; created_at: number }>();
    if (!results) return [];
    const dateCounts: Record<string, number> = {};
    for (const r of results) {
      const ts = (r.posted_at || r.created_at) * 1000;
      const d = new Date(ts);
      // Format YYYY-MM-DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      dateCounts[key] = (dateCounts[key] || 0) + 1;
    }
    return Object.entries(dateCounts).map(([date, count]) => ({ date, count }));
  }
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

export async function getAdjacentThreads(
  db: D1Database,
  currentThread: ThreadRecord
): Promise<{
  prev: { id: string; title: string | null; author_username: string | null } | null;
  next: { id: string; title: string | null; author_username: string | null } | null;
}> {
  const [prevRow, nextRow] = await Promise.all([
    db.prepare(
      `SELECT id, title, content, author_username FROM threads 
       WHERE (created_at > ?) OR (created_at = ? AND id > ?) 
       ORDER BY created_at ASC, id ASC LIMIT 1`
    ).bind(currentThread.created_at, currentThread.created_at, currentThread.id).first<{ id: string; title: string | null; content: string | null; author_username: string | null }>(),
    
    db.prepare(
      `SELECT id, title, content, author_username FROM threads 
       WHERE (created_at < ?) OR (created_at = ? AND id < ?) 
       ORDER BY created_at DESC, id DESC LIMIT 1`
    ).bind(currentThread.created_at, currentThread.created_at, currentThread.id).first<{ id: string; title: string | null; content: string | null; author_username: string | null }>(),
  ]);

  const cleanText = (t: string | null) => {
    if (!t) return null;
    const clean = t.replace(/^\[Part\s*\d+\]\s*/i, '').trim();
    return clean.length > 70 ? clean.slice(0, 70) + '...' : clean;
  };

  return {
    prev: prevRow ? { id: prevRow.id, title: cleanText(prevRow.title) || cleanText(prevRow.content), author_username: prevRow.author_username } : null,
    next: nextRow ? { id: nextRow.id, title: cleanText(nextRow.title) || cleanText(nextRow.content), author_username: nextRow.author_username } : null,
  };
}

