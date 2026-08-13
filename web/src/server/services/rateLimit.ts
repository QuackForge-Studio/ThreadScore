import type { Env } from '../db';

export async function checkRateLimit(
  env: Env,
  key: string,
  limit: { windowSec: number; max: number },
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % limit.windowSec);
  const kvKey = `rl:${key}:${windowStart}`;
  const current = Number((await env.KV.get(kvKey)) ?? '0');
  const next = current + 1;
  await env.KV.put(kvKey, String(next), { expirationTtl: limit.windowSec * 2 });
  return { allowed: next <= limit.max, remaining: Math.max(0, limit.max - next) };
}
