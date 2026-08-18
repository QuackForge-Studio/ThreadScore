import { describe, it, expect } from 'vitest';
import { buildCommentContext, isAuthorContinuationComment } from '../commentContext';
import type { CommentRecord, ThreadRecord } from '../../../shared/types';

function thread(): ThreadRecord {
  return {
    id: 't1', url: 'https://www.threads.net/@author/post/C1', title: 'Tiêu đề', content: 'Nội dung gốc',
    author_username: 'author', author_name: 'A', posted_at: 1000, main_post_id: 'main-1',
    total_comments: 0, scoring_status: 'scored', avg_anger_score: 50,
    score_breakdown: null, created_at: 1000,
  };
}

function comment(overrides: Partial<CommentRecord>): CommentRecord {
  return {
    id: 'c1', thread_id: 't1', external_id: null, author_username: 'user', author_name: null,
    text: 'hello', like_count: 0, posted_at: 2000, parent_id: null, reply_to_username: null, created_at: 2000,
    ...overrides,
  };
}

describe('buildCommentContext', () => {
  it('root comment gets base post context only', () => {
    const t = thread();
    const c = comment({ id: 'c1', external_id: 'e1', parent_id: 'main-1', reply_to_username: 'author' });
    const ctx = buildCommentContext(t, [c], c);
    expect(ctx).toContain('Tiêu đề');
    expect(ctx).toContain('Nội dung gốc');
    expect(ctx).not.toContain('Bình luận được trả lời');
  });

  it('nested reply includes parent comment text', () => {
    const t = thread();
    const parent = comment({ id: 'p1', external_id: 'e1', author_username: 'alice', text: 'Tôi bực quá', parent_id: 'main-1' });
    const child = comment({ id: 'c2', external_id: 'e2', parent_id: 'e1', reply_to_username: 'alice', text: 'đồng ý' });
    const ctx = buildCommentContext(t, [parent, child], child);
    expect(ctx).toContain('Bình luận được trả lời');
    expect(ctx).toContain('@alice');
    expect(ctx).toContain('Tôi bực quá');
  });

  it('author continuation includes previous continuation parts', () => {
    const t = thread();
    const part1 = comment({ id: 'p1', external_id: 'e1', author_username: 'author', text: 'Phần 2: ...', parent_id: 'main-1', posted_at: 3000 });
    const part2 = comment({ id: 'p2', external_id: 'e2', author_username: 'author', text: 'Phần 3: kết', parent_id: 'main-1', posted_at: 4000 });
    expect(isAuthorContinuationComment(part1, t)).toBe(true);
    const ctx = buildCommentContext(t, [part1, part2], part2);
    expect(ctx).toContain('Phần tiếp nối trước đó của tác giả');
    expect(ctx).toContain('Phần 2: ...');
    expect(ctx).not.toContain('Phần 3: kết');
  });

  it('author replying to another user is not a continuation', () => {
    const t = thread();
    const replyToOther = comment({
      id: 'c9', external_id: 'e9', author_username: 'author',
      text: 'trả lời bạn', parent_id: 'other-comment', reply_to_username: 'other',
    });
    expect(isAuthorContinuationComment(replyToOther, t)).toBe(false);
  });
});
