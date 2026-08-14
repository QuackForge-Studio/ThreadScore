import { beforeAll, describe, it, expect } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { importThreadPayload } from '../../src/server/services/importService';
import { runScoringWorker } from '../../src/server/services/scoringWorker';

const URL = 'https://www.threads.net/@api/post/APITEST';

// The pool's default per-test isolated storage resets DB/KV between tests, so
// seed the imported+scored URL once here. `beforeAll` state is copied into each
// test, letting the "already_exists" assertion observe the imported thread.
beforeAll(async () => {
  await importThreadPayload(env as never, {
    url: URL, title: 'Chủ đề API', content: 'Nội dung', comments: [
      { external_id: 'e1', text: 'đồ ngu xuẩn' },
    ],
  });
  await runScoringWorker(env as never);
});

describe('GET /api/threads', () => {
  it('returns scored threads list', async () => {
    const res = await SELF.fetch('https://example.com/api/threads?sort=newest&limit=20&offset=0');
    expect(res.status).toBe(200);
    const body = await res.json() as { threads: { url: string }[] };
    expect(body.threads.some(t => t.url === URL)).toBe(true);
  });
});

describe('POST /api/requests', () => {
  it('creates a request for valid new URL', async () => {
    const newUrl = 'https://www.threads.net/@api/post/APITEST2';
    const res = await SELF.fetch('https://example.com/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('created');
  });

  it('returns already_exists for imported URL', async () => {
    const res = await SELF.fetch('https://example.com/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: URL }),
    });
    const body = await res.json() as { status: string };
    expect(body.status).toBe('already_exists');
  });

  it('rejects invalid URL with 400', async () => {
    const res = await SELF.fetch('https://example.com/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://twitter.com/x/1' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/votes rate limit', () => {
  it('allows up to 3 votes per hour per IP then 429', async () => {
    const thread = await importThreadPayload(env as never, {
      url: 'https://www.threads.net/@api/post/APIVOTE', title: 'V', content: '', comments: [{ external_id: 'v1', text: 'bình thường' }],
    });
    await runScoringWorker(env as never);
    const { results } = await env.DB.prepare('SELECT id FROM comments WHERE thread_id = ?').bind(thread.threadId).all<{ id: string }>();
    const commentId = results[0].id;

    for (let i = 0; i < 3; i++) {
      const res = await SELF.fetch('https://example.com/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId, vote: 'correct' }),
      });
      expect(res.status).toBe(200);
    }
    const blocked = await SELF.fetch('https://example.com/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: commentId, vote: 'correct' }),
    });
    expect(blocked.status).toBe(429);
  });
});
