// web/src/server/services/importService.ts
import { nowSec, newId } from '../db';
import type { Env } from '../db';
import { importPayloadSchema } from '../../shared/schemas';
import type { ImportPayload } from '../../shared/types';
import { normalizeThreadsUrl } from '../../shared/threadUrl';
import { insertThread, getThreadByUrl, updateThread } from '../repo/threads';
import { insertComments, deleteCommentsByThread } from '../repo/comments';
import { getPendingRequestByUrl, updateRequestStatus } from '../repo/requests';

export interface ImportResult {
  threadId: string;
  isUpdate: boolean;
  commentCount: number;
}

export async function importThreadPayload(env: Env, rawPayload: unknown): Promise<ImportResult> {
  const payload = importPayloadSchema.parse(rawPayload);
  const url = normalizeThreadsUrl(payload.url);
  const now = nowSec();

  const existing = await getThreadByUrl(env.DB, url);
  const threadId = existing?.id ?? newId();

  if (existing) {
    await deleteCommentsByThread(env.DB, existing.id);
    await updateThread(env.DB, existing.id, {
      title: payload.title ?? existing.title,
      content: payload.content ?? existing.content,
      author_username: payload.author_username ?? existing.author_username,
      author_name: payload.author_name ?? existing.author_name,
      posted_at: payload.posted_at ?? existing.posted_at,
      total_comments: payload.comments.length,
      scoring_status: 'pending_scoring',
      avg_anger_score: null,
      score_breakdown: null,
    });
  } else {
    await insertThread(env.DB, {
      id: threadId,
      url,
      title: payload.title ?? null,
      content: payload.content ?? null,
      author_username: payload.author_username ?? null,
      author_name: payload.author_name ?? null,
      posted_at: payload.posted_at ?? null,
      total_comments: payload.comments.length,
      scoring_status: 'pending_scoring',
      avg_anger_score: null,
      score_breakdown: null,
      created_at: now,
    });
  }

  if (payload.comments.length > 0) {
    await insertComments(env.DB, payload.comments.map(c => ({
      id: newId(),
      thread_id: threadId,
      external_id: c.external_id ?? null,
      author_username: c.author_username ?? null,
      author_name: c.author_name ?? null,
      text: c.text,
      like_count: c.like_count ?? 0,
      posted_at: c.posted_at ?? null,
      created_at: now,
    })));
  }

  const pending = await getPendingRequestByUrl(env.DB, url);
  if (pending) {
    await updateRequestStatus(env.DB, pending.id, 'fulfilled', { threadId });
  }

  return { threadId, isUpdate: !!existing, commentCount: payload.comments.length };
}
