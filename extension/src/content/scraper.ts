import { SELECTORS } from './selectors';
import { MAX_COMMENTS } from './constants';
import { autoScrollUntilStable } from './autoScroll';

export interface ScrapedComment {
  external_id: string | null;
  author_username: string | null;
  author_name: string | null;
  text: string;
  like_count: number;
  posted_at: number | null;
}

export interface ScrapedThread {
  url: string;
  title: string | null;
  content: string | null;
  author_username: string | null;
  author_name: string | null;
  posted_at: number | null;
  comments: ScrapedComment[];
}

function parseLikes(el: Element | null): number {
  const raw = el?.textContent?.trim() ?? '';
  if (!raw) return 0;
  const compact = raw.replace(/,/g, '').trim();
  const m = compact.match(/^([\d.]+)\s*([KkMm])?$/);
  if (!m) {
    const n = Number(compact.replace(/[^\d]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return 0;
  const suffix = m[2]?.toUpperCase();
  const multiplier = suffix === 'K' ? 1000 : suffix === 'M' ? 1000000 : 1;
  return Math.round(value * multiplier);
}

function parseTime(el: Element | null): number | null {
  const dt = el?.getAttribute('datetime');
  if (dt) {
    const t = Date.parse(dt);
    return Number.isFinite(t) ? Math.floor(t / 1000) : null;
  }
  // Fallback: parse text content như '2026-08-01' hoặc ISO date
  const text = el?.textContent?.trim();
  if (text) {
    const t = Date.parse(text);
    return Number.isFinite(t) ? Math.floor(t / 1000) : null;
  }
  return null;
}

function cleanUsername(hrefOrText: string | null | undefined): string | null {
  if (!hrefOrText) return null;
  const m = hrefOrText.match(/\/@([^/?]+)/) ?? hrefOrText.match(/@([\w.]+)/);
  return m ? m[1] : null;
}

export async function scrapeCurrentThread(doc: Document, opts?: { maxComments?: number }): Promise<ScrapedThread> {
  await autoScrollUntilStable(doc, { maxComments: opts?.maxComments ?? MAX_COMMENTS });

  const titleEl = doc.querySelector(SELECTORS.title);
  const contentEl = doc.querySelector(SELECTORS.content);
  const authorEl = doc.querySelector(SELECTORS.authorLink);
  const timeEl = doc.querySelector(SELECTORS.time);

  const replyItems = Array.from(doc.querySelectorAll(SELECTORS.replyItem)).slice(0, opts?.maxComments ?? MAX_COMMENTS);

  const comments: ScrapedComment[] = replyItems.map(item => {
    const authorEl = item.querySelector(SELECTORS.replyAuthor);
    const textEl = item.querySelector(SELECTORS.replyText);
    const likesEl = item.querySelector(SELECTORS.replyLikes);
    const text = textEl?.textContent?.trim() ?? '';
    const authorHref = authorEl?.getAttribute('href');
    return {
      external_id: null,
      author_username: cleanUsername(authorHref ?? authorEl?.textContent),
      author_name: null,
      text,
      like_count: parseLikes(likesEl),
      posted_at: null,
    };
  }).filter(c => c.text.length > 0);

  return {
    url: doc.location?.href ?? doc.defaultView?.location.href ?? '',
    title: titleEl?.textContent?.trim() ?? null,
    content: contentEl?.textContent?.trim() ?? null,
    author_username: cleanUsername(authorEl?.getAttribute('href') ?? authorEl?.textContent),
    author_name: null,
    posted_at: parseTime(timeEl),
    comments,
  };
}

// Guard: content script có thể được inject trước khi chrome.runtime sẵn sàng
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
    if (message.type === 'TS_SCRAPE') {
      scrapeCurrentThread(document)
        .then(result => sendResponse(result))
        .catch(e => sendResponse({ error: e instanceof Error ? e.message : 'Scrape lỗi' }));
      return true; // giữ channel mở cho async
    }
    return false;
  });
}
