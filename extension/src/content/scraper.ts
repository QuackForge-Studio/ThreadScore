import { SELECTORS } from './selectors';
import { MAX_COMMENTS } from './constants';
import { autoScrollUntilStable } from './autoScroll';
import { debugStats } from './debug';
export type { DebugStats } from './debug';
export { debugStats } from './debug';

export interface ScrapedComment {
  external_id: string | null;
  author_username: string | null;
  author_name: string | null;
  text: string;
  like_count: number;
  posted_at: number | null;
  // Thông tin reply con (nếu interceptor bắt được từ GraphQL)
  parent_id?: string | null;
  reply_to_username?: string | null;
}

export interface ScrapedThread {
  url: string;
  title: string | null;
  content: string | null;
  author_username: string | null;
  author_name: string | null;
  posted_at: number | null;
  comments: ScrapedComment[];
  debugStats?: typeof debugStats;
}

// Buffer chứa comment từ GraphQL interceptor (MAIN world postMessage).
// Mỗi comment kèm pageUrl — chỉ dùng comment của đúng bài đang mở.
interface BufferedComment extends ScrapedComment {
  pageUrl?: string | null;
}

const interceptedCommentsBuffer: BufferedComment[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'TS_GRAPHQL_COMMENTS_INTERCEPTED' && Array.isArray(event.data.comments)) {
      const pageUrl = typeof event.data.pageUrl === 'string' ? event.data.pageUrl : window.location.href;
      debugStats.interceptedMessages++;
      debugStats.totalInterceptedRaw += event.data.comments.length;
      debugStats.lastInterceptUrl = pageUrl;
      for (const c of event.data.comments) {
        if (c && c.text && c.author_username) {
          interceptedCommentsBuffer.push({ ...c, pageUrl });
        }
      }
    }
  });
}

function parseThreadsUrl(urlStr: string): { author: string | null; postCode: string | null } {
  try {
    const authorMatch = urlStr.match(/@([^/?]+)/);
    const postMatch = urlStr.match(/\/post\/([^/?]+)/) || urlStr.match(/\/t\/([^/?]+)/);
    return {
      author: authorMatch ? authorMatch[1].toLowerCase() : null,
      postCode: postMatch ? postMatch[1] : null,
    };
  } catch {
    return { author: null, postCode: null };
  }
}

// Đếm nút "N câu trả lời / N phản hồi / N replies" trên trang — dùng cho debug
function countReplyExpanders(doc: Document): number {
  let n = 0;
  const clickables = Array.from(doc.querySelectorAll('div[role="button"], button, span, a, div[tabindex="0"]'));
  for (const el of clickables) {
    if (!(el instanceof HTMLElement)) continue;
    const txt = el.textContent?.trim().toLowerCase() ?? '';
    if (!txt || txt.length > 80) continue;
    if (
      /\d+\s+câu\s+trả\s+lời/i.test(txt) ||
      /\d+\s+trả\s+lời/i.test(txt) ||
      /\d+\s+phản\s+hồi/i.test(txt) ||
      /\d+\s+replies/i.test(txt) ||
      /\d+\s+reply/i.test(txt) ||
      /xem\s+.*câu\s+trả\s+lời/i.test(txt) ||
      /xem\s+.*phản\s+hồi/i.test(txt) ||
      /view\s+.*replies/i.test(txt)
    ) {
      n++;
    }
  }
  return n;
}

function parseLikesNumber(raw: string): number {
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

function parseLikes(card: Element | null): number {
  if (!card) return 0;

  // 1. Selector chuẩn cũ / test fixtures
  const explicitLikes = card.querySelector(SELECTORS.replyLikes);
  if (explicitLikes && explicitLikes.textContent?.trim()) {
    const parsed = parseLikesNumber(explicitLikes.textContent.trim());
    if (parsed > 0) return parsed;
  }

  // 2. Tìm nút Like và số bên cạnh
  const likeIcons = Array.from(
    card.querySelectorAll('svg[aria-label*="like" i], svg[aria-label*="thích" i], svg[aria-label*="gusta" i], svg[aria-label*="curtir" i]')
  );
  for (const icon of likeIcons) {
    const btn = icon.closest('button, [role="button"], div, span');
    if (!btn) continue;
    const btnText = btn.textContent?.trim() ?? '';
    if (btnText && /\d/.test(btnText)) {
      return parseLikesNumber(btnText);
    }
    const nextEl = btn.nextElementSibling;
    if (nextEl && nextEl.textContent && /\d/.test(nextEl.textContent.trim())) {
      return parseLikesNumber(nextEl.textContent.trim());
    }
    const parent = btn.parentElement;
    if (parent) {
      const numSpan = Array.from(parent.querySelectorAll('span, div')).find((s) => /^\s*[\d.,]+\s*[KkMm]?\s*$/.test(s.textContent ?? ''));
      if (numSpan && numSpan.textContent) {
        return parseLikesNumber(numSpan.textContent.trim());
      }
    }
  }

  return 0;
}

function parseTime(el: Element | null): number | null {
  if (!el) return null;
  const dt = el.getAttribute('datetime');
  if (dt) {
    const t = Date.parse(dt);
    return Number.isFinite(t) ? Math.floor(t / 1000) : null;
  }
  const text = el.textContent?.trim();
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

// Tìm phần tử card chứa link
function findCardContainer(link: Element, mainCard: Element | null): HTMLElement | null {
  // 1. Selector chuẩn cũ / test fixtures
  const direct = link.closest(
    '.reply-item, div[data-pressable-container="true"], [role="article"], div[role="listitem"], article'
  );
  if (direct instanceof HTMLElement && direct !== mainCard && direct !== document.body && direct !== document.documentElement) {
    return direct;
  }

  // 2. Đi ngược DOM tree từ link để tìm container thích hợp
  let cur: HTMLElement | null = link.parentElement;
  let candidate: HTMLElement | null = null;
  while (cur && cur !== document.body && cur !== document.documentElement && cur !== mainCard) {
    const authorsInside = cur.querySelectorAll('a[href*="/@"]');
    if (authorsInside.length > 2) {
      break;
    }
    candidate = cur;
    if (cur.querySelector('svg[aria-label*="like" i], svg[aria-label*="thích" i], time, button, [role="button"]')) {
      candidate = cur;
    }
    cur = cur.parentElement;
  }
  return candidate;
}

// Tìm phần tử chứa bài viết chính ở đầu trang
function findMainPostContainer(doc: Document, mainAuthor: string | null): Element | null {
  const contentEl = doc.querySelector(SELECTORS.content) ?? doc.querySelector(SELECTORS.title);
  if (contentEl) {
    const mainCard = contentEl.closest('div[data-pressable-container="true"], article, div[role="listitem"]');
    if (mainCard) return mainCard;
  }

  const allAuthorLinks = Array.from(doc.querySelectorAll('a[href*="/@"]')).filter(
    (l) => !l.closest('#ts-sidebar-container, header, nav, [role="navigation"]')
  );

  if (mainAuthor && allAuthorLinks.length > 0) {
    const match = allAuthorLinks.find((l) => {
      const u = cleanUsername(l.getAttribute('href') ?? l.textContent);
      return u && u.toLowerCase() === mainAuthor.toLowerCase();
    });
    if (match) {
      const card = findCardContainer(match, null);
      if (card) return card;
    }
  }

  if (allAuthorLinks.length > 0) {
    const card = findCardContainer(allAuthorLinks[0], null);
    if (card) return card;
  }

  return doc.querySelector('article, div[data-pressable-container="true"]');
}

const BADGE_TEXTS = new Set([
  'đã ghim',
  'pinned',
  'tác giả',
  'author',
  'theo dõi',
  'đang theo dõi',
  'follow',
  'following',
  'nổi bật',
  'featured',
  'hàng đầu',
  'top',
  'dịch',
  'xem bản dịch',
  'see translation',
  'xem hoạt động',
  'view activity',
  'threadscore sidebar',
  'trả lời',
  'reply',
  'thích',
  'like',
  'chia sẻ',
  'share',
  'đăng lại',
  'repost',
]);

function isMetaOrBadgeText(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower || lower.length === 0) return true;
  if (BADGE_TEXTS.has(lower)) return true;
  if (/^\d+\s*(giờ|phút|giây|ngày|tuần|tháng|năm|h|m|s|d|w|lượt xem|views)$/i.test(lower)) return true;
  if (/\d+\s*(câu\s+trả\s+lời|trả\s+lời|phản\s+hồi|replies|reply)/i.test(lower)) return true;
  if (/^xem\s+.*(câu\s+trả\s+lời|phản\s+hồi|replies)/i.test(lower)) return true;
  if (/^view\s+.*replies/i.test(lower)) return true;
  if (lower.startsWith('trả lời @') || lower.startsWith('reply to @')) return true;
  if (lower === '2/2' || /^\d+\/\d+$/.test(lower)) return true;
  return false;
}

// Trích xuất chính xác phần nội dung chữ của bình luận
function extractCommentText(card: Element, link: Element): string {
  const textElements = Array.from(
    card.querySelectorAll('div[dir="auto"], span[dir="auto"], p, .reply-text')
  ).filter((el) => {
    if (link.contains(el) || el.contains(link)) return false;
    if (el.closest('button, [role="button"], time, a[href*="/@"], header, nav')) return false;

    // Bỏ qua nếu el nằm trong sub-card con lồng bên trong
    const subCard = el.closest('.reply-item, div[data-pressable-container="true"], [role="article"]');
    if (subCard && subCard !== card && card.contains(subCard)) return false;

    const t = el.textContent?.trim() ?? '';
    if (isMetaOrBadgeText(t)) return false;
    return true;
  });

  if (textElements.length > 0) {
    const filtered: string[] = [];
    for (const el of textElements) {
      const hasChildInList = textElements.some((other) => other !== el && el.contains(other));
      if (hasChildInList) continue;
      const txt = el.textContent?.trim() ?? '';
      if (txt && !filtered.includes(txt) && !isMetaOrBadgeText(txt)) {
        filtered.push(txt);
      }
    }
    if (filtered.length > 0) {
      return filtered.join('\n').trim();
    }
  }

  const directTexts = Array.from(card.querySelectorAll('div, span, p')).filter((el) => {
    if (link.contains(el) || el.closest('button, [role="button"], time, a[href*="/@"], header, nav')) return false;
    const t = el.textContent?.trim() ?? '';
    if (isMetaOrBadgeText(t)) return false;
    return t.length > 1 && el.children.length === 0;
  });

  return directTexts
    .map((e) => e.textContent?.trim() ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

// Thu thập comment từ DOM
function collectCommentsFromDom(
  doc: Document,
  opts: {
    maxComments: number;
    mainPostContainer: Element | null;
    mainAuthorUsername: string | null;
    mainTitleText: string;
    mainContentText: string;
    seenKeys: Set<string>;
  }
): ScrapedComment[] {
  const comments: ScrapedComment[] = [];
  const authorLinks = Array.from(doc.querySelectorAll('a[href*="/@"]'));
  debugStats.totalAuthorLinks = authorLinks.length;

  let isFirstAuthorLink = true;

  for (const link of authorLinks) {
    if (comments.length >= opts.maxComments) break;

    // Bỏ qua sidebar/header/nav
    if (link.closest('#ts-sidebar-container, header, nav, [role="navigation"]')) {
      debugStats.skippedSidebar++;
      continue;
    }

    const authorHref = link.getAttribute('href');
    const username = cleanUsername(authorHref ?? link.textContent);
    if (!username) continue;

    // Bỏ qua bài viết chính
    if (opts.mainPostContainer && (opts.mainPostContainer === link || opts.mainPostContainer.contains(link))) {
      debugStats.skippedInMain++;
      continue;
    }

    // Nếu link này là tác giả bài chính và là link đầu tiên trên trang -> đó là main post
    if (isFirstAuthorLink && opts.mainAuthorUsername && username.toLowerCase() === opts.mainAuthorUsername.toLowerCase()) {
      isFirstAuthorLink = false;
      debugStats.skippedInMain++;
      continue;
    }
    isFirstAuthorLink = false;

    const card = findCardContainer(link, opts.mainPostContainer);
    if (!card) {
      debugStats.skippedNoCard++;
      continue;
    }

    if (opts.mainPostContainer && (opts.mainPostContainer === card || opts.mainPostContainer.contains(card))) {
      debugStats.skippedInMain++;
      continue;
    }
    if (card.querySelector('input, textarea, [contenteditable="true"]')) continue;

    const text = extractCommentText(card, link);
    if (!text || text.length < 1) {
      debugStats.skippedNoText++;
      continue;
    }
    if (text === opts.mainTitleText || text === opts.mainContentText) {
      debugStats.skippedMainText++;
      continue;
    }

    const timeEl = card.querySelector('time');
    const key = `${username.toLowerCase()}:${text}`;
    if (opts.seenKeys.has(key)) {
      debugStats.skippedDup++;
      continue;
    }
    opts.seenKeys.add(key);

    comments.push({
      external_id: null,
      author_username: username,
      author_name: null,
      text,
      like_count: parseLikes(card),
      posted_at: parseTime(timeEl),
    });
  }

  return comments;
}

export async function scrapeCurrentThread(doc: Document, opts?: { maxComments?: number }): Promise<ScrapedThread> {
  const currentUrl = doc.location?.href ?? doc.defaultView?.location.href ?? '';
  const { author: mainAuthorUrl, postCode: currentPostCode } = parseThreadsUrl(currentUrl);

  await autoScrollUntilStable(doc, { maxComments: opts?.maxComments ?? MAX_COMMENTS });

  const titleEl = doc.querySelector(SELECTORS.title);
  const contentEl = doc.querySelector(SELECTORS.content);
  const authorEl = doc.querySelector(SELECTORS.authorLink);
  const timeEl = doc.querySelector(SELECTORS.time);

  const mainPostContainer = findMainPostContainer(doc, mainAuthorUrl);
  const mainTitleText = titleEl?.textContent?.trim() ?? '';
  const mainContentText = contentEl?.textContent?.trim() ?? '';
  const resolvedMainAuthor = mainAuthorUrl || cleanUsername(authorEl?.getAttribute('href') ?? authorEl?.textContent);

  debugStats.mainPostContainerTag = mainPostContainer
    ? `${mainPostContainer.tagName.toLowerCase()}.${(mainPostContainer.className || '').toString().slice(0, 60)}`
    : 'null';

  const seenKeys = new Set<string>();
  const comments: ScrapedComment[] = [];

  // 1. Comment từ GraphQL interceptor
  for (const gc of interceptedCommentsBuffer) {
    if (!gc.text || !gc.author_username) continue;
    if (gc.pageUrl && currentPostCode) {
      const { postCode: bufPostCode } = parseThreadsUrl(gc.pageUrl);
      if (bufPostCode && bufPostCode !== currentPostCode) continue;
    }
    const key = `${gc.author_username.toLowerCase()}:${gc.text}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    comments.push({
      external_id: gc.external_id,
      author_username: gc.author_username,
      author_name: gc.author_name,
      text: gc.text,
      like_count: gc.like_count || 0,
      posted_at: gc.posted_at,
      parent_id: gc.parent_id,
      reply_to_username: gc.reply_to_username,
    });

    if (comments.length >= (opts?.maxComments ?? MAX_COMMENTS)) break;
  }

  // 2. Bổ sung từ DOM
  let domComments: ScrapedComment[] = [];
  if (comments.length < (opts?.maxComments ?? MAX_COMMENTS)) {
    domComments = collectCommentsFromDom(doc, {
      maxComments: (opts?.maxComments ?? MAX_COMMENTS) - comments.length,
      mainPostContainer,
      mainAuthorUsername: resolvedMainAuthor,
      mainTitleText,
      mainContentText,
      seenKeys,
    });
    comments.push(...domComments);
  }

  debugStats.bufferSize = interceptedCommentsBuffer.length;
  debugStats.bufferedWithReplies = interceptedCommentsBuffer.filter(
    (c) => c.parent_id != null || c.reply_to_username != null
  ).length;
  debugStats.graphQLComments = comments.length - domComments.length;
  debugStats.domComments = domComments.length;
  debugStats.expandersFound = countReplyExpanders(doc);
  debugStats.repliesCounted = doc.querySelectorAll(
    'a[href*="/@"], div[data-pressable-container="true"], article, div[role="listitem"], .reply-item'
  ).length;

  return {
    url: currentUrl,
    title: titleEl?.textContent?.trim() ?? null,
    content: contentEl?.textContent?.trim() ?? null,
    author_username: resolvedMainAuthor,
    author_name: null,
    posted_at: parseTime(timeEl),
    comments,
    debugStats: { ...debugStats },
  };
}

// CHẾ ĐỘ TEST & HIGHLIGHT TRỰC QUAN
export async function testScrapeAndHighlight(doc: Document, limit: number = 5): Promise<ScrapedThread> {
  const currentUrl = doc.location?.href ?? doc.defaultView?.location.href ?? '';
  const { author: mainAuthorUrl, postCode: currentPostCode } = parseThreadsUrl(currentUrl);

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

  const mainPostContainer = findMainPostContainer(doc, mainAuthorUrl);
  const mainTitleText = titleEl?.textContent?.trim() ?? '';
  const mainContentText = contentEl?.textContent?.trim() ?? '';
  const resolvedMainAuthor = mainAuthorUrl || cleanUsername(authorEl?.getAttribute('href') ?? authorEl?.textContent);

  debugStats.mainPostContainerTag = mainPostContainer
    ? `${mainPostContainer.tagName.toLowerCase()}.${(mainPostContainer.className || '').toString().slice(0, 60)}`
    : 'null';

  const seenKeys = new Set<string>();
  const comments: ScrapedComment[] = [];

  // 1. Ưu tiên GraphQL buffer
  for (const gc of interceptedCommentsBuffer) {
    if (comments.length >= limit) break;
    if (!gc.text || !gc.author_username) continue;
    if (gc.pageUrl && currentPostCode) {
      const { postCode: bufPostCode } = parseThreadsUrl(gc.pageUrl);
      if (bufPostCode && bufPostCode !== currentPostCode) continue;
    }
    const key = `${gc.author_username.toLowerCase()}:${gc.text}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    comments.push(gc);
  }

  // 2. Thu thập từ DOM
  if (comments.length < limit) {
    const domComments = collectCommentsFromDom(doc, {
      maxComments: limit - comments.length,
      mainPostContainer,
      mainAuthorUsername: resolvedMainAuthor,
      mainTitleText,
      mainContentText,
      seenKeys,
    });
    comments.push(...domComments);
  }

  // 3. Highlight trực quan các card tương ứng trên DOM
  const authorLinks = Array.from(doc.querySelectorAll('a[href*="/@"]')).filter(
    (l) => !l.closest('#ts-sidebar-container, header, nav, [role="navigation"]')
  );

  let highlightIndex = 1;
  for (const c of comments) {
    const matchingLink = authorLinks.find((l) => {
      const u = cleanUsername(l.getAttribute('href') ?? l.textContent);
      return u && u.toLowerCase() === c.author_username?.toLowerCase();
    });
    if (matchingLink) {
      const card = findCardContainer(matchingLink, mainPostContainer);
      if (card && card instanceof HTMLElement && !card.hasAttribute('data-ts-highlighted')) {
        card.setAttribute('data-ts-highlighted', 'true');
        card.style.outline = '3px solid #E5484D';
        card.style.backgroundColor = 'rgba(229, 72, 77, 0.15)';
        card.style.boxShadow = '0 0 16px rgba(229, 72, 77, 0.6)';
        card.style.borderRadius = '8px';
        card.style.position = 'relative';

        const badge = doc.createElement('div');
        badge.className = 'ts-highlight-badge';
        badge.textContent = `#${highlightIndex} @${c.author_username}`;
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

        if (typeof card.scrollIntoView === 'function') {
          try {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch {}
        }
        highlightIndex++;
      }
    }
  }

  debugStats.bufferSize = interceptedCommentsBuffer.length;
  debugStats.bufferedWithReplies = interceptedCommentsBuffer.filter(
    (c) => c.parent_id != null || c.reply_to_username != null
  ).length;
  debugStats.graphQLComments = comments.filter((c) => c.external_id != null).length;
  debugStats.domComments = comments.length - debugStats.graphQLComments;
  debugStats.expandersFound = countReplyExpanders(doc);
  debugStats.repliesCounted = doc.querySelectorAll(
    'a[href*="/@"], div[data-pressable-container="true"], article, div[role="listitem"], .reply-item'
  ).length;

  return {
    url: currentUrl,
    title: titleEl?.textContent?.trim() ?? null,
    content: contentEl?.textContent?.trim() ?? null,
    author_username: resolvedMainAuthor,
    author_name: null,
    posted_at: parseTime(timeEl),
    comments,
    debugStats: { ...debugStats },
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

if (typeof document !== 'undefined' && typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupInjectedSidebar());
  } else {
    setupInjectedSidebar();
  }
}

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
