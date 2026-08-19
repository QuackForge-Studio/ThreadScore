import { describe, it, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Stub chrome.runtime trước khi import scraper (listener đăng ký ở module load).
// Dùng vi.hoisted để chạy trước cả import (ESM hoisting).
const chromeStub = vi.hoisted(() => ({
  runtime: { onMessage: { addListener: () => {} }, getURL: (() => 'chrome-extension://x/index.html') as () => string },
}));
vi.stubGlobal('chrome', chromeStub);

vi.mock('../src/content/autoScroll', () => ({
  autoScrollUntilStable: vi.fn().mockResolvedValue(undefined),
  isEndOfCommentsReached: vi.fn().mockReturnValue(false),
}));

import { scrapeCurrentThread, testScrapeAndHighlight, highlightCommentsOnPage } from '../src/content/scraper';

function makeDom(): Document {
  // Giống cấu trúc Threads thật: mỗi comment có a[href^="/@"]
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
        <a href="/@a" dir="auto">@a</a>
        <span class="reply-text" dir="auto">Tôi ghét điều này</span>
        <span class="reply-likes">12</span>
      </div>
      <div class="reply-item">
        <a href="/@b" dir="auto">@b</a>
        <span class="reply-text" dir="auto">Tuyệt vời</span>
        <span class="reply-likes">3</span>
      </div>
      <div class="reply-item">
        <a href="/@c" dir="auto">@c</a>
        <span class="reply-text" dir="auto">Rất vui</span>
        <span class="reply-likes">12.3K</span>
      </div>
    </div>
  </body></html>`;
  return new JSDOM(html).window.document;
}

function makeRealisticThreadsDom(): Document {
  const html = `
  <!DOCTYPE html>
  <html>
  <head></head>
  <body>
    <!-- Main Post -->
    <div data-pressable-container="true">
      <div>
        <a href="/@haian_0409">haian_0409</a>
        <time datetime="2026-08-16T15:00:00Z">1 giờ</time>
      </div>
      <div>
        <span dir="auto">📌 Nếu bạn là một người thường xuyên mua hàng trên các nền tảng...</span>
      </div>
      <div>
        <button aria-label="Thích"><svg aria-label="Thích"></svg></button><span>120</span>
      </div>
    </div>

    <!-- Pinned Comment with Badge & Actions -->
    <div data-pressable-container="true">
      <div>
        <span dir="auto">Đã ghim</span>
      </div>
      <div>
        <a href="/@pistart_uh">pistart_uh</a>
        <time datetime="2026-08-16T14:00:00Z">2 giờ</time>
      </div>
      <div>
        <span dir="auto">Da minh nói là SẼ CÓ LÚC chứ không phải là các ban học ngành nghề j là thất nghiệp mãi...</span>
      </div>
      <div>
        <span>2/2</span>
      </div>
      <div>
        <button aria-label="Thích"><svg aria-label="Thích"></svg></button><span>28</span>
        <button aria-label="Trả lời"><svg aria-label="Trả lời"></svg></button><span>1</span>
      </div>
    </div>

    <!-- Normal Comment -->
    <div data-pressable-container="true">
      <div>
        <a href="/@reviewer_pro">reviewer_pro</a>
        <time datetime="2026-08-16T14:30:00Z">1 giờ</time>
      </div>
      <div>
        <span dir="auto">Chuẩn luôn bạn ơi, phải trau dồi liên tục thôi!</span>
      </div>
      <div>
        <button aria-label="Thích"><svg aria-label="Thích"></svg></button><span>5</span>
      </div>
    </div>
  </body>
  </html>
  `;
  const dom = new JSDOM(html, { url: 'https://www.threads.net/@haian_0409/post/DF7k123' });
  return dom.window.document;
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

  it('correctly scrapes realistic Threads DOM with pinned comment and likes', async () => {
    const doc = makeRealisticThreadsDom();
    const result = await scrapeCurrentThread(doc);

    expect(result.author_username).toBe('haian_0409');
    expect(result.comments).toHaveLength(2);

    // Comment 1: pistart_uh (pinned, text must NOT be "Đã ghim", likes must be 28)
    const c1 = result.comments[0];
    expect(c1.author_username).toBe('pistart_uh');
    expect(c1.text).toContain('Da minh nói là SẼ CÓ LÚC');
    expect(c1.text).not.toContain('Đã ghim');
    expect(c1.like_count).toBe(28);

    // Comment 2: reviewer_pro
    const c2 = result.comments[1];
    expect(c2.author_username).toBe('reviewer_pro');
    expect(c2.text).toBe('Chuẩn luôn bạn ơi, phải trau dồi liên tục thôi!');
    expect(c2.like_count).toBe(5);
  });

  it('testScrapeAndHighlight works correctly and ignores main post', async () => {
    const doc = makeRealisticThreadsDom();
    const result = await testScrapeAndHighlight(doc, 5);

    expect(result.author_username).toBe('haian_0409');
    expect(result.comments).toHaveLength(2);
    expect(result.comments[0].author_username).toBe('pistart_uh');

    // Highlight: 2 comment đều phải được đánh dấu
    expect(result.highlightSummary).toBeDefined();
    expect(result.highlightSummary?.highlighted).toBe(2);
    expect(result.highlightSummary?.totalComments).toBe(2);
    expect(doc.querySelectorAll('[data-ts-highlighted="true"]')).toHaveLength(2);
    expect(doc.querySelectorAll('.ts-highlight-badge')).toHaveLength(2);
  });

  it('scrapeCurrentThread highlights comments and shows count overlay', async () => {
    const doc = makeRealisticThreadsDom();
    const result = await scrapeCurrentThread(doc);

    expect(result.highlightSummary).toBeDefined();
    expect(result.highlightSummary?.totalComments).toBe(2);
    expect(doc.querySelectorAll('[data-ts-highlighted="true"]')).toHaveLength(2);
    expect(doc.querySelectorAll('.ts-highlight-badge')).toHaveLength(2);

    // Overlay đếm tổng nằm trên trang
    const overlay = doc.getElementById('ts-count-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain('2 bình luận');
  });

  it('highlightCommentsOnPage counts replies and dedupes same-author cards', () => {
    const doc = makeRealisticThreadsDom();
    const summary = highlightCommentsOnPage(
      doc,
      [
        {
          external_id: '1',
          author_username: 'pistart_uh',
          author_name: null,
          text: 'Da minh nói...',
          like_count: 0,
          posted_at: null,
          parent_id: null,
        },
        {
          external_id: '2',
          author_username: 'reviewer_pro',
          author_name: null,
          text: 'Chuẩn luôn bạn ơi!',
          like_count: 0,
          posted_at: null,
          parent_id: '1',
          reply_to_username: 'pistart_uh',
        },
      ],
      { mainAuthorUsername: 'haian_0409', scrollMode: 'none' }
    );

    expect(summary.totalComments).toBe(2);
    expect(summary.totalReplies).toBe(1);
    expect(summary.highlighted).toBe(2);
    expect(doc.getElementById('ts-count-overlay')?.textContent).toContain('1 phản hồi');
  });

  it('includes replies from GraphQL buffer with full fields', async () => {
    const doc = makeDom();
    // giả lập comment con từ interceptor — postMessage lên global window (nơi listener đăng ký).
    window.postMessage(
      {
        type: 'TS_GRAPHQL_COMMENTS_INTERCEPTED',
        comments: [
          {
            external_id: 'abc123',
            author_username: 'laota8',
            author_name: 'Lão Tám',
            text: 't người Việt và t không cần m thương',
            like_count: 3,
            posted_at: 1700000000,
          },
        ],
      },
      '*'
    );
    await new Promise((r) => setTimeout(r, 20));

    const result = await scrapeCurrentThread(doc);
    const gql = result.comments.find((c) => c.author_username === 'laota8');
    expect(gql).toBeDefined();
    expect(gql?.like_count).toBe(3);
    expect(gql?.external_id).toBe('abc123');
    expect(gql?.author_name).toBe('Lão Tám');
    expect(gql?.posted_at).toBe(1700000000);
  });

  it('does not mix comments from a previous post after switching threads', async () => {
    // Giả lập comment của BÀI CŨ (URL khác) còn sót trong buffer
    window.postMessage(
      {
        type: 'TS_GRAPHQL_COMMENTS_INTERCEPTED',
        comments: [
          {
            external_id: 'old1',
            author_username: 'olduser',
            author_name: null,
            text: 'comment của bài cũ, phải bị loại',
            like_count: 1,
            posted_at: null,
          },
        ],
        pageUrl: 'https://www.threads.net/@oldauthor/post/OLDCODE123',
      },
      '*'
    );
    // Comment của BÀI MỚI (khớp URL đang mở) phải được giữ
    window.postMessage(
      {
        type: 'TS_GRAPHQL_COMMENTS_INTERCEPTED',
        comments: [
          {
            external_id: 'new1',
            author_username: 'newuser',
            author_name: null,
            text: 'comment của bài mới',
            like_count: 2,
            posted_at: null,
          },
        ],
        pageUrl: 'https://www.threads.net/@haian_0409/post/DF7k123',
      },
      '*'
    );
    await new Promise((r) => setTimeout(r, 20));

    const doc = makeRealisticThreadsDom(); // URL = https://www.threads.net/@haian_0409/post/DF7k123
    const result = await scrapeCurrentThread(doc);

    const oldComment = result.comments.find((c) => c.author_username === 'olduser');
    const newComment = result.comments.find((c) => c.author_username === 'newuser');
    expect(oldComment).toBeUndefined(); // bài cũ phải bị loại
    expect(newComment).toBeDefined(); // bài mới phải được giữ
  });
});

