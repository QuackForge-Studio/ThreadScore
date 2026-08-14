import type { Env } from '../../src/server/db';
import { userCommentSchema } from '../../src/shared/schemas';
import { COMMENT_RATE_LIMIT } from '../../src/shared/constants';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const ip = context.request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { checkRateLimit } = await import('../../src/server/services/rateLimit');
  const { getSession } = await import('../../src/server/services/session');
  const sessionUser = await getSession(context.env, context.request);
  if (!sessionUser) {
    const rl = await checkRateLimit(context.env, `comment:${ip}`, COMMENT_RATE_LIMIT);
    if (!rl.allowed) {
      return Response.json({ error: 'Bạn comment quá nhanh. Vui lòng đợi 10 phút giữa các comment.' }, { status: 429 });
    }
  }

  const body = await context.request.json().catch(() => null);
  const parsed = userCommentSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });

  const { insertUserComment } = await import('../../src/server/repo/userComments');
  const { newId, nowSec } = await import('../../src/server/db');

  await insertUserComment(context.env.DB, {
    id: newId(), thread_id: parsed.data.thread_id, user_id: sessionUser ? `${sessionUser.provider}:${sessionUser.external_id}` : null,
    display_name: parsed.data.display_name ?? null, content: parsed.data.content, created_at: nowSec(),
  });
  return Response.json({ ok: true });
};
