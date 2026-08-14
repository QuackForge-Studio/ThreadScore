import type { Env } from '../../src/server/db';
import { isThreadsUrl, normalizeThreadsUrl } from '../../src/shared/threadUrl';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const q = (new URL(context.request.url).searchParams.get('q') ?? '').trim();
  if (!q) return Response.json({ kind: 'keyword', threads: [] });

  if (isThreadsUrl(q)) {
    const url = normalizeThreadsUrl(q);
    const { getThreadByUrl } = await import('../../src/server/repo/threads');
    const { getRequestByUrl } = await import('../../src/server/repo/requests');

    const thread = await getThreadByUrl(context.env.DB, url);
    if (thread) {
      const state = thread.scoring_status === 'scored' ? 'scored' : 'pending';
      return Response.json({ kind: 'url', state, thread });
    }
    const request = await getRequestByUrl(context.env.DB, url);
    if (request && request.status === 'pending') {
      return Response.json({ kind: 'url', state: 'pending', request });
    }
    return Response.json({ kind: 'url', state: 'unknown' });
  }

  const { results } = await context.env.DB.prepare(
    `SELECT DISTINCT t.* FROM threads t
     WHERE t.scoring_status = 'scored'
       AND (t.title LIKE ? OR t.content LIKE ?
            OR EXISTS (SELECT 1 FROM comments c WHERE c.thread_id = t.id AND c.text LIKE ?))
     ORDER BY t.created_at DESC LIMIT 50`
  ).bind(`%${q}%`, `%${q}%`, `%${q}%`).all();

  return Response.json({ kind: 'keyword', threads: results ?? [] });
};
