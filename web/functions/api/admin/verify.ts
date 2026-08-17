import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const ip = context.request.headers.get('CF-Connecting-IP') ?? 'anon';
  
  // Rate limit: Tối đa 25 lần thử trong 5 phút
  const { checkRateLimit } = await import('../../../src/server/services/rateLimit');
  const rl = await checkRateLimit(context.env, `admin-auth:${ip}`, { windowSec: 300, max: 25 });
  if (!rl.allowed) {
    return Response.json({ error: 'Quá nhiều lần thử sai khóa bí mật. Vui lòng chờ 5 phút.' }, { status: 429 });
  }

  const serverKey = context.env.ADMIN_SECRET_KEY ? String(context.env.ADMIN_SECRET_KEY).trim() : '';
  if (!serverKey) {
    return Response.json({
      error: 'Máy chủ Cloudflare Pages chưa được cấu hình biến môi trường ADMIN_SECRET_KEY trong Settings > Variables!',
    }, { status: 500 });
  }

  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Khóa quản trị (Secret Key) không khớp với ADMIN_SECRET_KEY trên Cloudflare!' }, { status: 401 });
  }

  return Response.json({ ok: true, message: 'Xác thực thành công!' });
};
