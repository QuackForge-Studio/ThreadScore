import { describe, it, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Stub chrome.runtime trước khi import scraper (listener đăng ký ở module load)
vi.stubGlobal('chrome', {
  runtime: { onMessage: { addListener: vi.fn() } },
});

import { scrapeCurrentThread } from '../src/content/scraper';

function makeDom(): Document {
  const html = `
  <html><body>
    <article data-testid="post-thread">
      <div class="thread-title">Giá xăng tăng phi mã</div>
      <div class="thread-content">Mọi người nghĩ sao?</div>
      <a class="thread-author" href="/@nguoila">@nguoila</a>
      <time class="thread-time">2026-08-01</time>
    </article>
    <div data-testid="reply-thread">
      <div class="reply-item">
        <span class="reply-author">@a</span>
        <span class="reply-text">Tôi ghét điều này</span>
        <span class="reply-likes">12</span>
      </div>
      <div class="reply-item">
        <span class="reply-author">@b</span>
        <span class="reply-text">Tuyệt vời</span>
        <span class="reply-likes">3</span>
      </div>
      <div class="reply-item">
        <span class="reply-author">@c</span>
        <span class="reply-text">Rất vui</span>
        <span class="reply-likes">12.3K</span>
      </div>
    </div>
  </body></html>`;
  return new JSDOM(html).window.document;
}

describe('scrapeCurrentThread', () => {
  it('extracts title, author and comments', async () => {
    const doc = makeDom();
    const result = await scrapeCurrentThread(doc);
    expect(result.title).toBe('Giá xăng tăng phi mã');
    expect(result.author_username).toBe('nguoila');
    expect(result.comments).toHaveLength(3);
    expect(result.comments[0].text).toBe('Tôi ghét điều này');
    expect(result.comments[0].like_count).toBe(12);
    expect(result.comments[2].like_count).toBe(12300);
  });
});
