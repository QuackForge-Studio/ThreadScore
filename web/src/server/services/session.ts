import type { Env } from '../db';

export interface SessionUser {
  provider: 'google' | 'github';
  external_id: string;
  name: string;
}

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 ngày
const COOKIE_NAME = 'ts_session';

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function createSession(env: Env, provider: SessionUser['provider'], externalId: string, name: string): Promise<string> {
  const token = randomToken();
  await env.KV.put(`session:${token}`, JSON.stringify({ provider, external_id: externalId, name }), { expirationTtl: SESSION_TTL });
  return token;
}

export async function getSession(env: Env, request: Request): Promise<SessionUser | null> {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const m = cookie.match(/(?:^|;\s*)ts_session=([^;]+)/);
  if (!m) return null;
  const raw = await env.KV.get(`session:${m[1]}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function destroySession(env: Env, token: string): Promise<void> {
  await env.KV.delete(`session:${token}`);
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_TTL;
