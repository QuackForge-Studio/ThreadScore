import type { Env } from '../../src/server/db';
import { voteSchema } from '../../src/shared/schemas';
import { VOTE_RATE_LIMIT } from '../../src/shared/constants';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const ip = context.request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { checkRateLimit } = await import('../../src/server/services/rateLimit');
  const rl = await checkRateLimit(context.env, `vote:${ip}`, VOTE_RATE_LIMIT);
  if (!rl.allowed) {
    return Response.json({ error: 'Bạn đã vote quá số lần cho phép (3 lần/giờ). Vui lòng thử lại sau.' }, { status: 429 });
  }

  const body = await context.request.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });

  const { insertVote, getVoteCounts } = await import('../../src/server/repo/votes');
  const { newId, nowSec } = await import('../../src/server/db');

  await insertVote(context.env.DB, {
    id: newId(), comment_id: parsed.data.comment_id, user_id: null,
    vote: parsed.data.vote, created_at: nowSec(),
  });
  const counts = await getVoteCounts(context.env.DB, parsed.data.comment_id);
  return Response.json({ ok: true, counts });
};
