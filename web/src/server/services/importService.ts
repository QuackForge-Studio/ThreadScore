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

function cleanPostTitle(title: string | null | undefined, content: string | null | undefined): { title: string | null; content: string | null } {
  const isJunk = (s: string | null | undefined) => {
    if (!s) return true;
    const lower = s.trim().toLowerCase();
    if (/^[\d.,\s]+[kKmMbB]?\s*(lượt xem|lượt xem bài viết|views|view|lượt thích|likes|plays|reposts|shares|bình luận|comments)$/i.test(lower)) return true;
    if (/\b(lượt xem|views)\b/i.test(lower) && lower.length < 35) return true;
    if (lower === 'bài viết threads' || lower === 'threads') return true;
    return false;
  };

  let validContent = content && !isJunk(content) ? content.trim() : null;
  let validTitle = title && !isJunk(title) ? title.trim() : null;

  if (!validTitle && validContent) {
    validTitle = validContent.length > 140 ? validContent.slice(0, 140) + '...' : validContent;
  }
  if (!validContent && validTitle) {
    validContent = validTitle;
  }

  return { title: validTitle, content: validContent };
}

export async function importThreadPayload(env: Env, rawPayload: unknown): Promise<ImportResult> {
  const payload = importPayloadSchema.parse(rawPayload);
  const url = normalizeThreadsUrl(payload.url);
  const now = nowSec();

  const { title: cleanTitle, content: cleanContent } = cleanPostTitle(payload.title, payload.content);

  const existing = await getThreadByUrl(env.DB, url);
  const threadId = existing?.id ?? newId();

  if (existing) {
    await deleteCommentsByThread(env.DB, existing.id);
    await updateThread(env.DB, existing.id, {
      title: cleanTitle ?? existing.title,
      content: cleanContent ?? existing.content,
      author_username: payload.author_username ?? existing.author_username,
      author_name: payload.author_name ?? existing.author_name,
      author_avatar_url: payload.author_avatar_url ?? existing.author_avatar_url,
      posted_at: payload.posted_at ?? existing.posted_at,
      main_post_id: payload.main_post_id ?? existing.main_post_id,
      total_comments: payload.comments.length,
      scoring_status: 'pending_scoring',
      avg_anger_score: null,
      score_breakdown: null,
    });
  } else {
    await insertThread(env.DB, {
      id: threadId,
      url,
      title: cleanTitle ?? null,
      content: cleanContent ?? null,
      author_username: payload.author_username ?? null,
      author_name: payload.author_name ?? null,
      author_avatar_url: payload.author_avatar_url ?? null,
      posted_at: payload.posted_at ?? null,
      main_post_id: payload.main_post_id ?? null,
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
      parent_id: c.parent_id ?? null,
      reply_to_username: c.reply_to_username ?? null,
      created_at: now,
    })));
  }

  const pending = await getPendingRequestByUrl(env.DB, url);
  if (pending) {
    await updateRequestStatus(env.DB, pending.id, 'fulfilled', { threadId });
  }

  return { threadId, isUpdate: !!existing, commentCount: payload.comments.length };
}
