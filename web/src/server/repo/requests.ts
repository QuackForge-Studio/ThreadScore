import type { RequestRecord, RequestStatus } from '../../shared/types';

export async function insertRequest(db: D1Database, r: RequestRecord): Promise<void> {
  await db.prepare(
    `INSERT INTO requests (id, url, status, requested_by, error_message, thread_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(r.id, r.url, r.status, r.requested_by, r.error_message, r.thread_id, r.created_at, r.updated_at).run();
}

export async function getPendingRequestByUrl(db: D1Database, url: string): Promise<RequestRecord | null> {
  const row = await db.prepare(
    "SELECT * FROM requests WHERE url = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
  ).bind(url).first<RequestRecord>();
  return row ?? null;
}

export async function listPendingRequests(db: D1Database): Promise<RequestRecord[]> {
  const { results } = await db.prepare(
    "SELECT * FROM requests WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100"
  ).all<RequestRecord>();
  return results ?? [];
}

export async function updateRequestStatus(db: D1Database, id: string, status: RequestStatus, opts?: { threadId?: string; errorMessage?: string }): Promise<void> {
  await db.prepare(
    `UPDATE requests SET status = ?, thread_id = COALESCE(?, thread_id), error_message = COALESCE(?, error_message), updated_at = ? WHERE id = ?`
  ).bind(status, opts?.threadId ?? null, opts?.errorMessage ?? null, Math.floor(Date.now() / 1000), id).run();
}

export async function getRequestByUrl(db: D1Database, url: string): Promise<RequestRecord | null> {
  const row = await db.prepare(
    'SELECT * FROM requests WHERE url = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(url).first<RequestRecord>();
  return row ?? null;
}
