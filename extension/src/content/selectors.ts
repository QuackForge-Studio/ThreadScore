// Tách riêng để dễ cập nhật khi Threads đổi layout
export const SELECTORS = {
  thread: 'article[data-testid="post-thread"], article, div[data-pressable-container="true"], [role="article"]',
  title: '.thread-title, h1, [data-testid="post-thread"] h1',
  content: '.thread-content, [data-testid="post-thread"] div',
  authorLink: '.thread-author, a[href*="/@"]',
  time: '.thread-time, time, a[href*="/post/"] time, a[href*="/t/"] time',
  replies: '[data-testid="reply-thread"], [data-testid="post-replies"]',
  replyItem: '.reply-item, [data-testid="reply-thread"] div[role="listitem"], div[data-pressable-container="true"], [role="article"]',
  replyAuthor: '.reply-author, a[href*="/@"], span[dir="auto"]',
  replyText: '.reply-text, span[dir="auto"], div[dir="auto"]',
  replyLikes: '.reply-likes, [data-testid="like-count"], span:has(svg[aria-label*="like"]), span:has(svg[aria-label*="thích" i])',
  // Nút "N câu trả lời" / "Xem tất cả câu trả lời" để mở sub-thread
  repliesTrigger: 'div[role="button"], button, span[role="button"]',
} as const;

