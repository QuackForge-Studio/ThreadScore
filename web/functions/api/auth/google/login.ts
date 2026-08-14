import type { Env } from '../../../../src/server/db';
import { generateOAuthState, storeOAuthState } from '../../../../src/server/services/oauth';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = (context.env as unknown as Record<string, string>).GOOGLE_CLIENT_ID;
  if (!clientId) return Response.json({ error: 'Chưa cấu hình GOOGLE_CLIENT_ID' }, { status: 500 });
  const redirectUri = new URL('/api/auth/google/callback', context.request.url).toString();
  const state = generateOAuthState();
  await storeOAuthState(context.env, state);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
};
