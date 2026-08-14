import type { Env } from '../../../../src/server/db';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '../../../../src/server/services/session';
import { consumeOAuthState } from '../../../../src/server/services/oauth';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');
  if (error || !code || !(await consumeOAuthState(context.env, state))) {
    return Response.redirect('/', 302);
  }

  const envRecord = context.env as unknown as Record<string, string>;
  const clientId = envRecord.GOOGLE_CLIENT_ID;
  const clientSecret = envRecord.GOOGLE_CLIENT_SECRET;
  const redirectUri = new URL('/api/auth/google/callback', context.request.url).toString();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  if (!tokenRes.ok) return Response.redirect('/', 302);
  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) return Response.redirect('/', 302);

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) return Response.redirect('/', 302);
  const user = await userRes.json() as { id?: string; name?: string };
  if (!user.id) return Response.redirect('/', 302);

  const token = await createSession(context.env, 'google', user.id, user.name ?? 'Google User');
  const res = Response.redirect('/', 302);
  res.headers.append('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`);
  return res;
};
