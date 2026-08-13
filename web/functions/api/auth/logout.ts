import type { Env } from '../../../src/server/db';
import { SESSION_COOKIE } from '../../../src/server/services/session';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const cookie = context.request.headers.get('Cookie') ?? '';
  const m = cookie.match(/(?:^|;\s*)ts_session=([^;]+)/);
  if (m) {
    const { destroySession } = await import('../../../src/server/services/session');
    await destroySession(context.env, m[1]);
  }
  const res = Response.json({ ok: true });
  res.headers.append('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return res;
};
