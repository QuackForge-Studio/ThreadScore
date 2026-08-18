// web/src/server/services/commentContext.ts
import type { CommentRecord, ThreadRecord } from '../../shared/types';

const MAX_PARENT_TEXT = 800;

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text;
}

// Comment có phải phần tiếp nối của chính tác giả bài gốc không
// (tác giả reply trực tiếp vào bài gốc, ví dụ "2/2" nối tiếp nội dung).
export function isAuthorContinuationComment(
  c: CommentRecord,
  thread: ThreadRecord
): boolean {
  if (!thread.author_username || !c.author_username) return false;
  if (c.author_username.toLowerCase() !== thread.author_username.toLowerCase()) return false;
  const replyTo = c.reply_to_username?.toLowerCase() ?? null;
  if (c.parent_id != null && c.parent_id !== '') {
    if (thread.main_post_id != null) return c.parent_id === thread.main_post_id;
    return replyTo == null || replyTo === thread.author_username.toLowerCase();
  }
  return replyTo == null || replyTo === thread.author_username.toLowerCase();
}

// Build context riêng cho từng comment:
// - Bài gốc (title + content) luôn là nền.
// - Reply vào comment khác → kèm text của comment cha.
// - Phần tiếp nối của tác giả → kèm các phần tiếp nối trước đó (theo thứ tự thời gian).
export function buildCommentContext(
  thread: ThreadRecord,
  allComments: CommentRecord[],
  comment: CommentRecord
): string {
  const base = `${thread.title ?? ''}\n${thread.content ?? ''}`.trim();

  const byExternalId = new Map<string, CommentRecord>();
  for (const c of allComments) {
    if (c.external_id) byExternalId.set(c.external_id, c);
  }

  const parent = comment.parent_id ? byExternalId.get(comment.parent_id) : undefined;
  if (parent) {
    return `${base}\n\nBình luận được trả lời (của @${parent.author_username ?? 'ẩn danh'}):\n${truncate(parent.text, MAX_PARENT_TEXT)}`;
  }

  if (isAuthorContinuationComment(comment, thread)) {
    const isReplyToMain = (c: CommentRecord) => {
      if (c.parent_id != null && c.parent_id !== '') {
        if (thread.main_post_id != null) return c.parent_id === thread.main_post_id;
      }
      const replyTo = c.reply_to_username?.toLowerCase() ?? null;
      return replyTo == null || replyTo === (thread.author_username ?? '').toLowerCase();
    };
    const previous = allComments
      .filter((c) => c.id !== comment.id && isAuthorContinuationComment(c, thread) && isReplyToMain(c))
      .sort((a, b) => (a.posted_at ?? a.created_at) - (b.posted_at ?? b.created_at));
    if (previous.length > 0) {
      const parts = previous.map((c) => `- ${truncate(c.text, MAX_PARENT_TEXT)}`);
      return `${base}\n\nPhần tiếp nối trước đó của tác giả (@${thread.author_username}):\n${parts.join('\n')}`;
    }
  }

  if (comment.parent_id != null && comment.parent_id !== '') {
    return `${base}\n\nBình luận này trả lời trực tiếp bài gốc.`;
  }

  return base;
}
