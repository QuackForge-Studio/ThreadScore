import type { Env } from '../../../../src/server/db';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '../../../../src/server/services/session';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  if (!code) return Response.redirect('/', 302);

  const envRecord = context.env as unknown as Record<string, string>;
  const redirectUri = new URL('/api/auth/github/callback', context.request.url).toString();

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: envRecord.GITHUB_CLIENT_ID, client_secret: envRecord.GITHUB_CLIENT_SECRET, code, redirect_uri: redirectUri }),
  });
  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) return Response.redirect('/', 302);

  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'threadscore' },
  });
  const user = await userRes.json() as { id?: number; name?: string; login?: string };
  if (!user.id) return Response.redirect('/', 302);

  const token = await createSession(context.env, 'github', String(user.id), user.name ?? user.login ?? 'GitHub User');
  const res = Response.redirect('/', 302);
  res.headers.append('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`);
  return res;
};
