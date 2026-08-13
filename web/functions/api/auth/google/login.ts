import type { Env } from '../../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = (context.env as Record<string, string>).GOOGLE_CLIENT_ID;
  if (!clientId) return Response.json({ error: 'Chưa cấu hình GOOGLE_CLIENT_ID' }, { status: 500 });
  const redirectUri = new URL('/api/auth/google/callback', context.request.url).toString();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
};
