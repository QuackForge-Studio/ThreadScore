import { SELECTORS } from './selectors';
import { MAX_COMMENTS } from './constants';
import { autoScrollUntilStable } from './autoScroll';
import { initGraphQLInterceptor } from './graphqlInterceptor';

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

// Buffer lưu trữ các comment bắt được từ GraphQL API
const interceptedCommentsBuffer: ScrapedComment[] = [];

if (typeof window !== 'undefined') {
  initGraphQLInterceptor();

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'TS_GRAPHQL_COMMENTS_INTERCEPTED' && Array.isArray(event.data.comments)) {
      for (const c of event.data.comments) {
        if (c && c.text && c.author_username) {
          interceptedCommentsBuffer.push(c);
        }
      }
    }
  });
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

// Tìm phần tử chứa bài viết chính để không bị quét nhầm vào danh sách bình luận
function findMainPostContainer(doc: Document): Element | null {
  const contentEl = doc.querySelector(SELECTORS.content) ?? doc.querySelector(SELECTORS.title);
  if (contentEl) {
    const mainCard = contentEl.closest('div[data-pressable-container="true"], article, div[role="listitem"]');
    if (mainCard) return mainCard;
  }
  return doc.querySelector('article, div[data-pressable-container="true"]');
}

// Trích xuất chính xác phần nội dung chữ của bình luận
function extractCommentText(card: Element, link: Element): string {
  const textCandidates = Array.from(
    card.querySelectorAll('div[dir="auto"], span[dir="auto"], .reply-text')
  ).filter((el) => {
    if (link.contains(el) || el.contains(link)) return false;
    if (el.closest('button, [role="button"], time, a, header, nav')) return false;
    const t = el.textContent?.trim() ?? '';
    if (!t || t.length < 1) return false;

    const lower = t.toLowerCase();
    if (
      /^\d+\s*(giờ|phút|giây|ngày|tuần|tháng|năm|h|m|s|d|w|lượt xem|views)$/i.test(lower) ||
      lower.includes('xem tất cả') ||
      lower.includes('đã ẩn một số') ||
      lower.includes('câu trả lời') ||
      lower.includes('threadscore sidebar') ||
      lower === 'hàng đầu' ||
      lower === 'xem hoạt động' ||
      lower.startsWith('trả lời @')
    ) {
      return false;
    }
    return true;
  });

  if (textCandidates.length > 0) {
    return textCandidates[0].textContent?.trim() ?? '';
  }

  // Fallback: Tìm các đoạn text trực tiếp
  const directTexts = Array.from(card.querySelectorAll('div, span, p')).filter((el) => {
    if (link.contains(el) || el.closest('button, [role="button"], time, a, header, nav')) return false;
    const t = el.textContent?.trim() ?? '';
    const lower = t.toLowerCase();
    if (
      /^\d+\s*(giờ|phút|giây|ngày|tuần|tháng|năm|h|m|s|d|w|lượt xem|views)$/i.test(lower) ||
      lower.includes('câu trả lời') ||
      lower.includes('thông báo')
    ) {
      return false;
    }
    return t.length > 1 && el.children.length === 0;
  });

  return directTexts[0]?.textContent?.trim() ?? '';
}

export async function scrapeCurrentThread(doc: Document, opts?: { maxComments?: number }): Promise<ScrapedThread> {
  await autoScrollUntilStable(doc, { maxComments: opts?.maxComments ?? MAX_COMMENTS });

  const titleEl = doc.querySelector(SELECTORS.title);
  const contentEl = doc.querySelector(SELECTORS.content);
  const authorEl = doc.querySelector(SELECTORS.authorLink);
  const timeEl = doc.querySelector(SELECTORS.time);

  const mainPostContainer = findMainPostContainer(doc);
  const mainTitleText = titleEl?.textContent?.trim() ?? '';
  const mainContentText = contentEl?.textContent?.trim() ?? '';

  const seenKeys = new Set<string>();
  const comments: ScrapedComment[] = [];

  // 1. Lấy từ GraphQL API buffer
  for (const gc of interceptedCommentsBuffer) {
    if (!gc.text || !gc.author_username) continue;
    const key = `${gc.author_username.toLowerCase()}:${gc.text}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    comments.push({
      external_id: gc.external_id,
      author_username: gc.author_username,
      author_name: null,
      text: gc.text,
      like_count: gc.like_count || 0,
      posted_at: gc.posted_at,
    });
  }

  // 2. Lấy từ DOM (loại bỏ hoàn toàn bài viết chính và thanh header)
  const authorLinks = Array.from(doc.querySelectorAll('a[href*="/@"]'));

  for (const link of authorLinks) {
    // Bỏ qua nếu thuộc Sidebar hoặc Header/Nav điều hướng
    if (link.closest('#ts-sidebar-container, header, nav, [role="navigation"]')) continue;

    // Bỏ qua nếu thuộc bài viết chính ở đầu trang
    if (mainPostContainer && (mainPostContainer === link || mainPostContainer.contains(link))) {
      continue;
    }

    const authorHref = link.getAttribute('href');
    const username = cleanUsername(authorHref ?? link.textContent);
    if (!username) continue;

    const card = link.closest('div[data-pressable-container="true"], div[role="listitem"], article') ?? link.parentElement?.parentElement;
    if (!card) continue;

    // Bỏ qua nếu card là bài viết chính hoặc ô nhập comment
    if (mainPostContainer && (mainPostContainer === card || mainPostContainer.contains(card))) continue;
    if (card.querySelector('input, textarea, [contenteditable="true"]')) continue;

    const text = extractCommentText(card, link);
    if (!text || text.length < 1) continue;
    if (text === mainTitleText || text === mainContentText) continue;

    const likesEl = card.querySelector(SELECTORS.replyLikes);

    const key = `${username.toLowerCase()}:${text}`;
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

// CHẾ ĐỘ TEST & HIGHLIGHT TRỰC QUAN
export async function testScrapeAndHighlight(doc: Document, limit: number = 5): Promise<ScrapedThread> {
  // Xóa các highlight cũ
  const oldBadges = doc.querySelectorAll('.ts-highlight-badge');
  oldBadges.forEach((b) => b.remove());
  const oldHighlighted = doc.querySelectorAll('[data-ts-highlighted="true"]');
  oldHighlighted.forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.outline = '';
      el.style.backgroundColor = '';
      el.style.boxShadow = '';
      el.removeAttribute('data-ts-highlighted');
    }
  });

  const titleEl = doc.querySelector(SELECTORS.title);
  const contentEl = doc.querySelector(SELECTORS.content);
  const authorEl = doc.querySelector(SELECTORS.authorLink);
  const timeEl = doc.querySelector(SELECTORS.time);

  const mainPostContainer = findMainPostContainer(doc);
  const mainTitleText = titleEl?.textContent?.trim() ?? '';
  const mainContentText = contentEl?.textContent?.trim() ?? '';

  // Thử click mở rộng sub-replies của các bình luận hiển thị
  const expandButtons = Array.from(doc.querySelectorAll('div[role="button"], button, span, a')).filter((el) => {
    if (el.closest('#ts-sidebar-container, header, nav, [role="navigation"]')) return false;
    const txt = el.textContent?.trim().toLowerCase() ?? '';
    return /\d+\s+câu\s+trả\s+lời/i.test(txt) || /\d+\s+replies/i.test(txt) || /\d+\s+phản\s+hồi/i.test(txt);
  });

  for (const btn of expandButtons.slice(0, 5)) {
    if (btn instanceof HTMLElement) {
      btn.click();
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  const authorLinks = Array.from(doc.querySelectorAll('a[href*="/@"]'));
  const seenKeys = new Set<string>();
  const comments: ScrapedComment[] = [];

  let highlightIndex = 1;

  for (const link of authorLinks) {
    if (comments.length >= limit) break;

    // Bỏ qua header, nav, sidebar
    if (link.closest('#ts-sidebar-container, header, nav, [role="navigation"]')) continue;

    // BỎ QUA HOÀN TOÀN BÀI VIẾT CHÍNH
    if (mainPostContainer && (mainPostContainer === link || mainPostContainer.contains(link))) {
      continue;
    }

    const authorHref = link.getAttribute('href');
    const username = cleanUsername(authorHref ?? link.textContent);
    if (!username) continue;

    const card = link.closest('div[data-pressable-container="true"], div[role="listitem"], article') ?? link.parentElement?.parentElement;
    if (!card || !(card instanceof HTMLElement)) continue;

    // Bỏ qua nếu là bài viết chính hoặc ô soạn thảo
    if (mainPostContainer && (mainPostContainer === card || mainPostContainer.contains(card))) continue;
    if (card.querySelector('input, textarea, [contenteditable="true"]')) continue;

    const text = extractCommentText(card, link);
    if (!text || text.length < 1) continue;
    if (text === mainTitleText || text === mainContentText) continue;

    const key = `${username.toLowerCase()}:${text}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const likesEl = card.querySelector(SELECTORS.replyLikes);

    comments.push({
      external_id: null,
      author_username: username,
      author_name: null,
      text,
      like_count: parseLikes(likesEl),
      posted_at: null,
    });

    // HIGHLIGHT TRỰC QUAN LÊN TRANG THREADS
    card.setAttribute('data-ts-highlighted', 'true');
    card.style.outline = '3px solid #E5484D';
    card.style.outlineOffset = '2px';
    card.style.backgroundColor = 'rgba(229, 72, 77, 0.15)';
    card.style.boxShadow = '0 0 16px rgba(229, 72, 77, 0.6)';
    card.style.borderRadius = '8px';
    card.style.position = 'relative';
    card.style.transition = 'all 0.3s ease';

    // Thêm huy hiệu badge đánh số thứ tự
    const badge = doc.createElement('div');
    badge.className = 'ts-highlight-badge';
    badge.textContent = `#${highlightIndex} @${username}`;
    Object.assign(badge.style, {
      position: 'absolute',
      top: '-12px',
      left: '12px',
      background: 'linear-gradient(135deg, #E5484D, #F05A28)',
      color: '#FFFFFF',
      fontSize: '11px',
      fontWeight: '800',
      padding: '3px 8px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      zIndex: '999999',
      pointerEvents: 'none',
      fontFamily: 'system-ui, sans-serif',
    });
    card.appendChild(badge);

    // Cuộn nhẹ tới phần tử để người dùng thấy
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise((r) => setTimeout(r, 200));

    highlightIndex++;
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
  chrome.runtime.onMessage.addListener((message: { type?: string; limit?: number }, _sender, sendResponse) => {
    if (message.type === 'TS_SCRAPE') {
      scrapeCurrentThread(document)
        .then((result) => sendResponse(result))
        .catch((e) => sendResponse({ error: e instanceof Error ? e.message : 'Scrape lỗi' }));
      return true;
    }
    if (message.type === 'TS_TEST_SCRAPE') {
      testScrapeAndHighlight(document, message.limit ?? 5)
        .then((result) => sendResponse(result))
        .catch((e) => sendResponse({ error: e instanceof Error ? e.message : 'Test scrape lỗi' }));
      return true;
    }
    return false;
  });
}
