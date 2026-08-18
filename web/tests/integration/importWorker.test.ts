import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { importThreadPayload } from '../../src/server/services/importService';
import type { ImportPayload } from '../../src/shared/types';
import { runScoringWorker } from '../../src/server/services/scoringWorker';
import { getThreadByUrl } from '../../src/server/repo/threads';
import { getCommentsByThread } from '../../src/server/repo/comments';
import { getScoresForThread } from '../../src/server/repo/scores';
import { getRequestByUrl, insertRequest } from '../../src/server/repo/requests';
import { newId, nowSec } from '../../src/server/db';
import { SCORING_LOCK_KEY } from '../../src/shared/constants';

const URL = 'https://www.threads.net/@test/post/IMPORT1';

function payload(comments: { external_id: string; text: string }[]): ImportPayload {
  return {
    url: URL,
    title: 'Chủ đề test',
    content: 'Nội dung',
    author_username: 'test',
    author_name: 'Test',
    posted_at: 1700000000,
    comments,
  };
}

describe('importThreadPayload', () => {
  it('creates thread as pending_scoring with comments', async () => {
    const r = await importThreadPayload(env as never, payload([
      { external_id: 'e1', text: 'đồ ngu' },
      { external_id: 'e2', text: 'rất vui' },
    ]));
    expect(r.isUpdate).toBe(false);
    expect(r.commentCount).toBe(2);
    const t = await getThreadByUrl(env.DB, URL);
    expect(t?.scoring_status).toBe('pending_scoring');
    expect(await getCommentsByThread(env.DB, t!.id)).toHaveLength(2);
  });

  it('re-import same URL replaces comments without duplicating thread', async () => {
    await importThreadPayload(env as never, payload([
      { external_id: 'e1', text: 'đồ ngu' },
      { external_id: 'e2', text: 'rất vui' },
    ]));
    const r2 = await importThreadPayload(env as never, payload([
      { external_id: 'e3', text: 'comment mới duy nhất' },
    ]));
    expect(r2.isUpdate).toBe(true);
    expect(r2.commentCount).toBe(1);
    const t = await getThreadByUrl(env.DB, URL);
    const all = await getCommentsByThread(env.DB, t!.id);
    expect(all).toHaveLength(1);
    expect(all[0].external_id).toBe('e3');
  });

  it('persists parent_id, reply_to_username and main_post_id', async () => {
    const withHierarchy: ImportPayload = {
      ...payload([
        { external_id: 'root-1', text: 'comment gốc', parent_id: 'main-post-1', reply_to_username: 'test' },
        { external_id: 'child-1', text: 'reply con', parent_id: 'root-1', reply_to_username: 'rootuser' },
      ]),
      main_post_id: 'main-post-1',
    };
    const { threadId } = await importThreadPayload(env as never, withHierarchy);
    const t = await getThreadByUrl(env.DB, URL);
    expect(t?.main_post_id).toBe('main-post-1');
    const all = await getCommentsByThread(env.DB, threadId);
    const root = all.find(c => c.external_id === 'root-1');
    const child = all.find(c => c.external_id === 'child-1');
    expect(root?.parent_id).toBe('main-post-1');
    expect(root?.reply_to_username).toBe('test');
    expect(child?.parent_id).toBe('root-1');
    expect(child?.reply_to_username).toBe('rootuser');
  });

  it('fulfills matching pending request', async () => {
    await insertRequest(env.DB, {
      id: newId(),
      url: URL,
      status: 'pending',
      requested_by: 'anonymous',
      error_message: null,
      thread_id: null,
      created_at: nowSec(),
      updated_at: nowSec(),
    });
    await importThreadPayload(env as never, payload([{ external_id: 'e9', text: 'x' }]));
    const req = await getRequestByUrl(env.DB, URL);
    expect(req?.status).toBe('fulfilled');
    expect(req?.thread_id).toBeTruthy();
  });
});

describe('runScoringWorker', () => {
  it('scores all comments (lexicon fallback without AI key) and marks scored', async () => {
    const { threadId } = await importThreadPayload(env as never, payload([
      { external_id: 'e1', text: 'đồ ngu xuẩn cút đi' },
      { external_id: 'e2', text: 'tuyệt vời quá' },
    ]));
    const out = await runScoringWorker(env as never);
    expect(out.scoredComments).toBe(2);
    const t = await getThreadByUrl(env.DB, URL);
    expect(t?.scoring_status).toBe('scored');
    expect(t?.avg_anger_score).toBeTypeOf('number');
    expect(JSON.parse(t!.score_breakdown!)).toHaveProperty('bang_no');
    const scores = await getScoresForThread(env.DB, threadId);
    expect(scores).toHaveLength(2);
    expect(scores[0].model).toBe('lexicon-fallback');
  });

  it('resumes scoring across runs when comments exceed the per-run batch ceiling', async () => {
    // 20 batches × 25 comments = 500 per run; 501 forces a leftover 'scoring' state.
    const comments = Array.from({ length: 501 }, (_, i) => ({
      external_id: `big-${i}`,
      text: i % 2 === 0 ? 'đồ ngu' : 'rất vui',
    }));
    const { threadId } = await importThreadPayload(env as never, payload(comments));

    const first = await runScoringWorker(env as never);
    expect(first.scoredComments).toBe(500);

    const mid = await getThreadByUrl(env.DB, URL);
    expect(mid?.scoring_status).toBe('scoring');
    expect(await getScoresForThread(env.DB, threadId)).toHaveLength(500);

    const second = await runScoringWorker(env as never);
    expect(second.scoredComments).toBe(1);

    const done = await getThreadByUrl(env.DB, URL);
    expect(done?.scoring_status).toBe('scored');
    expect(await getScoresForThread(env.DB, threadId)).toHaveLength(501);
  });

  it('returns 0/0 when the scoring lock is held by another worker', async () => {
    await importThreadPayload(env as never, payload([
      { external_id: 'lock-1', text: 'đồ ngu' },
    ]));
    // Simulate a concurrent worker that owns a fresh lock with a DISTINCT expiry
    // (offset by +1s so it cannot collide with the runner's own now+600 expiry
    // when both are computed within the same second).
    const heldExpiry = nowSec() + 600 + 1;
    await env.DB.prepare(
      `INSERT INTO locks (name, expires_at) VALUES (?, ?)
       ON CONFLICT(name) DO UPDATE SET expires_at = excluded.expires_at
       WHERE locks.expires_at < excluded.expires_at`
    ).bind(SCORING_LOCK_KEY, heldExpiry).run();

    const out = await runScoringWorker(env as never);
    expect(out.processedThreads).toBe(0);
    expect(out.scoredComments).toBe(0);

    // Lock must remain owned by the simulated worker (not released by the loser).
    const row = await env.DB.prepare('SELECT expires_at FROM locks WHERE name = ?')
      .bind(SCORING_LOCK_KEY).first<{ expires_at: number }>();
    expect(row?.expires_at).toBe(heldExpiry);
  });
});
