import type { Env } from '../db';

const OAUTH_STATE_TTL = 600; // seconds

export function generateOAuthState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function storeOAuthState(env: Env, state: string): Promise<void> {
  await env.KV.put(`oauth-state:${state}`, '1', { expirationTtl: OAUTH_STATE_TTL });
}

/** Returns true when the state is present; deletes it regardless (single-use). */
export async function consumeOAuthState(env: Env, state: string | null): Promise<boolean> {
  if (!state) return false;
  const value = await env.KV.get(`oauth-state:${state}`);
  if (value === null) return false;
  await env.KV.delete(`oauth-state:${state}`);
  return true;
}
