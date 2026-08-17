import type { Env } from '../../src/server/db';
import { requestSchema } from '../../src/shared/schemas';
import { isThreadsUrl, normalizeThreadsUrl } from '../../src/shared/threadUrl';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const ip = context.request.headers.get('CF-Connecting-IP') ?? 'anon';
  const { checkRateLimit } = await import('../../src/server/services/rateLimit');
  const rl = await checkRateLimit(context.env, `req:${ip}`, { windowSec: 60, max: 15 });
  if (!rl.allowed) {
    return Response.json({ error: 'Quá nhiều yêu cầu chấm điểm bài viết. Vui lòng chờ 1 phút.' }, { status: 429 });
  }

  const body = await context.request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success || !isThreadsUrl(parsed.data.url)) {
    return Response.json({ error: 'URL Threads không hợp lệ' }, { status: 400 });
  }
  const url = normalizeThreadsUrl(parsed.data.url);

  const { getThreadByUrl } = await import('../../src/server/repo/threads');
  const { getPendingRequestByUrl, insertRequest } = await import('../../src/server/repo/requests');
  const { newId, nowSec } = await import('../../src/server/db');

  const thread = await getThreadByUrl(context.env.DB, url);
  if (thread) return Response.json({ status: 'already_exists', thread_id: thread.id });

  const existing = await getPendingRequestByUrl(context.env.DB, url);
  if (existing) return Response.json({ status: 'already_requested', request: existing });

  const request = {
    id: newId(), url, status: 'pending' as const, requested_by: 'anonymous',
    error_message: null, thread_id: null, created_at: nowSec(), updated_at: nowSec(),
  };
  await insertRequest(context.env.DB, request);
  return Response.json({ status: 'created', request });
};
