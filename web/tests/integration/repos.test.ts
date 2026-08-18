import { describe, it, expect } from 'vitest';
import { newId, nowSec } from '../../src/server/db';
import { insertThread, getThreadByUrl, listPendingScoring } from '../../src/server/repo/threads';
import { insertComments, getCommentsByThread, deleteCommentsByThread } from '../../src/server/repo/comments';
import { insertRequest, getPendingRequestByUrl, updateRequestStatus } from '../../src/server/repo/requests';
import type { ThreadRecord, CommentRecord, RequestRecord } from '../../src/shared/types';
import { env } from 'cloudflare:test';

const db = env.DB;

describe('threads repo', () => {
  it('inserts and finds by url; lists pending scoring', async () => {
    const t: ThreadRecord = { id: newId(), url: 'https://www.threads.net/@a/post/C1', title: 'T', content: 'C',
      author_username: 'a', author_name: 'A', posted_at: nowSec(), main_post_id: null, total_comments: 0,
      scoring_status: 'pending_scoring', avg_anger_score: null, score_breakdown: null, created_at: nowSec() };
    await insertThread(db, t);
    const found = await getThreadByUrl(db, t.url);
    expect(found?.id).toBe(t.id);
    const pending = await listPendingScoring(db, 10);
    expect(pending.map(p => p.id)).toContain(t.id);
  });
});

describe('comments repo', () => {
  it('inserts, lists, deletes comments per thread', async () => {
    const threadId = newId();
    const cs: CommentRecord[] = [
      { id: newId(), thread_id: threadId, external_id: 'e1', author_username: 'u1', author_name: null,
        text: 'comment 1', like_count: 0, posted_at: nowSec(), parent_id: null, reply_to_username: null, created_at: nowSec() },
      { id: newId(), thread_id: threadId, external_id: 'e2', author_username: 'u2', author_name: null,
        text: 'comment 2', like_count: 3, posted_at: nowSec(), parent_id: 'e1', reply_to_username: 'u1', created_at: nowSec() },
    ];
    await insertComments(db, cs);
    const all = await getCommentsByThread(db, threadId);
    expect(all).toHaveLength(2);
    const child = all.find(c => c.external_id === 'e2');
    expect(child?.parent_id).toBe('e1');
    expect(child?.reply_to_username).toBe('u1');
    await deleteCommentsByThread(db, threadId);
    expect(await getCommentsByThread(db, threadId)).toHaveLength(0);
  });
});

describe('requests repo', () => {
  it('finds pending by url and updates status', async () => {
    const url = 'https://www.threads.net/@b/post/C9';
    const r: RequestRecord = { id: newId(), url, status: 'pending', requested_by: 'anonymous',
      error_message: null, thread_id: null, created_at: nowSec(), updated_at: nowSec() };
    await insertRequest(db, r);
    const found = await getPendingRequestByUrl(db, url);
    expect(found?.id).toBe(r.id);
    await updateRequestStatus(db, r.id, 'fulfilled', { threadId: 'thread-1' });
    const after = await getPendingRequestByUrl(db, url);
    expect(after).toBeNull();
  });
});
