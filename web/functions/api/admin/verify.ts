import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const ip = context.request.headers.get('CF-Connecting-IP') ?? 'anon';
  
  // Rate limit: Tối đa 15 lần thử khóa trong 5 phút để chống brute-force
  const { checkRateLimit } = await import('../../../src/server/services/rateLimit');
  const rl = await checkRateLimit(context.env, `admin-auth:${ip}`, { windowSec: 300, max: 15 });
  if (!rl.allowed) {
    return Response.json({ error: 'Quá nhiều lần thử sai khóa bí mật. Vui lòng chờ 5 phút.' }, { status: 429 });
  }

  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Khóa quản trị (Secret Key) không chính xác!' }, { status: 401 });
  }

  return Response.json({ ok: true, message: 'Xác thực thành công!' });
};
