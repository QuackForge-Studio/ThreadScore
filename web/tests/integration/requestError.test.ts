import { describe, it, expect } from 'vitest';
import { SELF, env } from 'cloudflare:test';

describe('POST /api/admin/request-error', () => {
  it('requires admin key and marks request as error', async () => {
    await SELF.fetch('https://example.com/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.threads.net/@err/post/E1' }),
    });
    const noKey = await SELF.fetch('https://example.com/api/admin/request-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'x', error_message: 'boom' }),
    });
    expect(noKey.status).toBe(401);

    const { results } = await env.DB.prepare("SELECT id FROM requests WHERE url = ? AND status = 'pending'")
      .bind('https://www.threads.net/@err/post/E1').all<{ id: string }>();
    const reqId = results[0].id;

    const ok = await SELF.fetch('https://example.com/api/admin/request-error', {
      method: 'POST',
      headers: { 'X-Admin-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reqId, error_message: 'Bài viết không tồn tại' }),
    });
    expect(ok.status).toBe(200);

    const row = await env.DB.prepare('SELECT status, error_message FROM requests WHERE id = ?')
      .bind(reqId).first<{ status: string; error_message: string }>();
    expect(row?.status).toBe('error');
    expect(row?.error_message).toBe('Bài viết không tồn tại');
  });
});
