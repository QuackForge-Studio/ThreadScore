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

  const mainTitleText = titleEl?.textContent?.trim() ?? '';
  const mainContentText = contentEl?.textContent?.trim() ?? '';

  // Extract all pressable post/comment containers across top-level and sub-replies
  const allContainers = Array.from(
    doc.querySelectorAll('div[data-pressable-container="true"], article, div[role="listitem"], .reply-item')
  );

  const seenKeys = new Set<string>();
  const comments: ScrapedComment[] = [];

  let isFirst = true;

  for (const item of allContainers) {
    const textEl = item.querySelector('div[dir="auto"], span[dir="auto"], .reply-text');
    const text = textEl?.textContent?.trim() ?? '';
    if (!text) continue;

    // Bỏ qua nếu text là nút bấm mở rộng hoặc tiêu đề thanh bên
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes('xem tất cả') ||
      lowerText.includes('threadscore sidebar') ||
      lowerText.includes('đã ẩn một số')
    ) {
      continue;
    }

    const itemAuthorEl = item.querySelector('a[href*="/@"], .reply-author, span[dir="auto"]');
    const authorHref = itemAuthorEl?.getAttribute('href');
    const username = cleanUsername(authorHref ?? itemAuthorEl?.textContent);

    const likesEl = item.querySelector(SELECTORS.replyLikes);

    // Bỏ qua container đầu tiên nếu trùng với bài viết chính
    if (isFirst && (text === mainTitleText || text === mainContentText)) {
      isFirst = false;
      continue;
    }
    isFirst = false;

    // Lọc trùng lặp bình luận & câu trả lời (sub-replies)
    const key = `${username ?? 'anon'}:${text}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    comments.push({
      external_id: null,
      author_username: username,
      author_name: null,
      text,
      like_count: parseLikes(likesEl),
      posted_at: null,
    });

    if (comments.length >= (opts?.maxComments ?? MAX_COMMENTS)) break;
  }

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

function setupInjectedSidebar(): void {
  if (typeof document === 'undefined' || document.getElementById('ts-sidebar-container')) return;

  const container = document.createElement('div');
  container.id = 'ts-sidebar-container';

  // Toggle button floating on the right edge of the screen
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'ts-sidebar-toggle-btn';
  toggleBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 256 256" fill="#FFFFFF">
      <path d="M173.81,109.84a16,16,0,0,0-13.43-8.84,16.29,16.29,0,0,0-15,9.66l-10,21.91-10.42-32.32a16,16,0,0,0-30.5,0L84.05,132.57l-10-21.91A16.29,16.29,0,0,0,59.08,101a16,16,0,0,0-13.43,8.84,16.28,16.28,0,0,0,.6,16.08l40,72a16,16,0,0,0,28,0l13.75-24.75L141.75,198a16,16,0,0,0,28,0l40-72A16.28,16.28,0,0,0,210.35,109.84Z"/>
    </svg>
    <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 4px; writing-mode: vertical-rl; transform: rotate(180deg);">ThreadScore</span>
  `;

  Object.assign(toggleBtn.style, {
    position: 'fixed',
    top: '35%',
    right: '0px',
    zIndex: '2147483646',
    background: 'linear-gradient(135deg, #E5484D, #F05A28)',
    color: '#FFF',
    border: 'none',
    borderRadius: '10px 0 0 10px',
    padding: '10px 5px',
    cursor: 'pointer',
    boxShadow: '-2px 4px 16px rgba(0,0,0,0.35)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'all 0.25s ease',
  });

  // Panel Wrapper + Iframe
  const panelWrapper = document.createElement('div');
  panelWrapper.id = 'ts-sidebar-panel';
  Object.assign(panelWrapper.style, {
    position: 'fixed',
    top: '0px',
    right: '0px',
    width: '380px',
    height: '100vh',
    zIndex: '2147483647',
    background: '#141210',
    borderLeft: '1px solid #36302B',
    boxShadow: '-6px 0 32px rgba(0,0,0,0.6)',
    transform: 'translateX(100%)',
    transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'flex',
    flexDirection: 'column',
  });

  const iframeUrl = chrome.runtime.getURL('index.html');
  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl;
  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
    background: 'transparent',
  });

  // Close bar inside panel header
  const closeBar = document.createElement('div');
  Object.assign(closeBar.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#1E1B18',
    borderBottom: '1px solid #282420',
    color: '#A89B8F',
    fontSize: '11px',
    fontWeight: '700',
  });
  closeBar.innerHTML = `
    <span>THREADSCORE SIDEBAR</span>
    <button id="ts-close-sidebar-btn" style="background:transparent;border:none;color:#FFF;cursor:pointer;font-size:16px;font-weight:bold;">✕</button>
  `;

  panelWrapper.appendChild(closeBar);
  panelWrapper.appendChild(iframe);
  container.appendChild(toggleBtn);
  container.appendChild(panelWrapper);

  let isOpen = false;

  function toggleSidebar(forceState?: boolean) {
    isOpen = forceState ?? !isOpen;
    if (isOpen) {
      panelWrapper.style.transform = 'translateX(0)';
      toggleBtn.style.transform = 'translateX(-380px)';
      document.body.style.transition = 'margin-right 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
      document.body.style.marginRight = '380px';
    } else {
      panelWrapper.style.transform = 'translateX(100%)';
      toggleBtn.style.transform = 'translateX(0)';
      document.body.style.marginRight = '0px';
    }
  }

  toggleBtn.addEventListener('click', () => toggleSidebar());
  closeBar.querySelector('#ts-close-sidebar-btn')?.addEventListener('click', () => toggleSidebar(false));

  document.body.appendChild(container);
}

// Initialize injected sidebar when page loads
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupInjectedSidebar());
  } else {
    setupInjectedSidebar();
  }
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
