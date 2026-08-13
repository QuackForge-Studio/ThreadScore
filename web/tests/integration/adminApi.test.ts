import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

const ADMIN_HEADERS = { 'X-Admin-Key': 'test-secret', 'Content-Type': 'application/json' };
const IMPORT_URL = 'https://www.threads.net/@admin/post/ADMIN1';

describe('admin import', () => {
  it('rejects without admin key', async () => {
    const res = await SELF.fetch('https://example.com/api/admin/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: IMPORT_URL, comments: [] }),
    });
    expect(res.status).toBe(401);
  });

  it('imports payload with admin key', async () => {
    const res = await SELF.fetch('https://example.com/api/admin/import', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        url: IMPORT_URL, title: 'Admin test', content: 'Nội dung',
        comments: [{ external_id: 'a1', text: 'đồ ngu' }, { external_id: 'a2', text: 'vui quá' }],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { threadId: string; commentCount: number };
    expect(body.commentCount).toBe(2);
    expect(body.threadId).toBeTruthy();
  });
});

describe('queue pending', () => {
  it('requires admin key and lists pending requests', async () => {
    await SELF.fetch('https://example.com/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.threads.net/@admin/post/Q1' }),
    });
    const noKey = await SELF.fetch('https://example.com/api/queue/pending');
    expect(noKey.status).toBe(401);
    const ok = await SELF.fetch('https://example.com/api/queue/pending', { headers: ADMIN_HEADERS });
    expect(ok.status).toBe(200);
    const body = await ok.json() as { requests: { url: string }[] };
    expect(body.requests.some(r => r.url === 'https://www.threads.net/@admin/post/Q1')).toBe(true);
  });
});

describe('admin worker', () => {
  it('runs scoring worker manually', async () => {
    const res = await SELF.fetch('https://example.com/api/admin/worker', { method: 'POST', headers: ADMIN_HEADERS });
    expect(res.status).toBe(200);
    const body = await res.json() as { processedThreads: number; scoredComments: number };
    expect(body.processedThreads).toBeGreaterThanOrEqual(0);
  });
});
