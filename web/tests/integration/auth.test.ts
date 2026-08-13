import { describe, it, expect } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { createSession, getSession, destroySession } from '../../src/server/services/session';

describe('session service', () => {
  it('creates, reads, destroys session', async () => {
    const token = await createSession(env as never, 'github', 'u-123', 'Test User');
    expect(token).toBeTruthy();
    const req = new Request('https://example.com/', { headers: { Cookie: `ts_session=${token}` } });
    const s = await getSession(env as never, req);
    expect(s?.external_id).toBe('u-123');
    await destroySession(env as never, token);
    const s2 = await getSession(env as never, req);
    expect(s2).toBeNull();
  });
});

describe('GET /api/auth/me', () => {
  it('returns null without session', async () => {
    const res = await SELF.fetch('https://example.com/api/auth/me');
    const body = await res.json() as { user: unknown };
    expect(body.user).toBeNull();
  });
});

describe('POST /api/auth/logout', () => {
  it('clears cookie', async () => {
    const res = await SELF.fetch('https://example.com/api/auth/logout', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toContain('ts_session=;');
  });
});
