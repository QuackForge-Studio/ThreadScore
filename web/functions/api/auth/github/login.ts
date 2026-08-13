import type { Env } from '../../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = (context.env as Record<string, string>).GITHUB_CLIENT_ID;
  if (!clientId) return Response.json({ error: 'Chưa cấu hình GITHUB_CLIENT_ID' }, { status: 500 });
  const redirectUri = new URL('/api/auth/github/callback', context.request.url).toString();
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: 'read:user' });
  return Response.redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
};
