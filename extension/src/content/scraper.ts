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
  author_avatar_url?: string | null;
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
  author_avatar_url?: string | null;
  posted_at: number | null;
  comments: ScrapedComment[];
  main_post_id?: string | null;
  debugStats?: typeof debugStats;
  highlightSummary?: HighlightSummary;
}

// Buffer chứa comment từ GraphQL interceptor (MAIN world postMessage).
// Mỗi comment kèm pageUrl — chỉ dùng comment của đúng bài đang mở.
interface BufferedComment extends ScrapedComment {
  pageUrl?: string | null;
}

const interceptedCommentsBuffer: BufferedComment[] = [];

export function getInterceptedCommentsCount(): number {
  return interceptedCommentsBuffer.length;
}

// Lấy postCode (mã bài) từ URL trang mà comment được bắt — nguồn tin cậy nhất để lọc bài.
// KHÔNG dùng c.code (code của comment/reply khác với mã bài chính, sẽ lọc nhầm).
function getBufferedPostCode(c: BufferedComment): string | null {
  if (!c.pageUrl) return null;
  const { postCode } = parseThreadsUrl(c.pageUrl);
  return postCode;
}

// Khi mở bài mới: chỉ giữ lại comment thuộc đúng bài đang mở, xóa hết comment bài cũ
// khỏi buffer + sessionStorage (chống trộn dữ liệu giữa các bài viết).
export function pruneBufferForPost(currentPostCode: string | null): void {
  if (!currentPostCode) return;
  const before = interceptedCommentsBuffer.length;
  let kept = 0;
  for (let i = interceptedCommentsBuffer.length - 1; i >= 0; i--) {
    const c = interceptedCommentsBuffer[i];
    const code = getBufferedPostCode(c);
    // Giữ comment không xác định được bài (có thể là comment đang tải của bài hiện tại)
    // nhưng loại chắc chắn thuộc bài khác (postCode khác).
    if (code && code !== currentPostCode) {
      interceptedCommentsBuffer.splice(i, 1);
    } else {
      kept++;
    }
  }
  if (before !== kept) {
    logScrapeDebug('prune', `đổi bài: xóa ${before - kept} comment bài cũ, giữ ${kept} (post=${currentPostCode})`);
    persistBuffer();
  }
}

export function getCurrentPostComments(): BufferedComment[] {
  return interceptedCommentsBuffer;
}

// Persist buffer qua sessionStorage để sống sót khi Threads tự reload trang.
// v2: mọi comment đều có pageUrl — dữ liệu cũ v1 (không có pageUrl) bị loại khi restore.
const PERSIST_KEY = 'ts_intercepted_buffer_v2';
let persistTimer: number | null = null;

function persistBuffer() {
  try {
    const payload = JSON.stringify(interceptedCommentsBuffer.slice(-1500));
    sessionStorage.setItem(PERSIST_KEY, payload);
  } catch {}
}

function restoreBuffer() {
  try {
    const raw = sessionStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const { postCode: currentPostCode } = parseThreadsUrl(window.location.href);
      const seen = new Set(interceptedCommentsBuffer.map(c => c.external_id || `${c.author_username}:${c.text}`));
      let restored = 0;
      let dropped = 0;
      for (const c of parsed) {
        if (!c || !c.text || !c.author_username) continue;
        // Chỉ chấp nhận dữ liệu v2 có pageUrl — dữ liệu v1 cũ (không pageUrl) không xác định
        // được bài, loại bỏ hoàn toàn để không bao giờ trộn comment bài cũ.
        if (!c.pageUrl) {
          dropped++;
          continue;
        }
        const { postCode: bufPostCode } = parseThreadsUrl(c.pageUrl);
        if (currentPostCode && bufPostCode && bufPostCode !== currentPostCode) {
          dropped++;
          continue;
        }
        const key = c.external_id || `${c.author_username}:${c.text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        interceptedCommentsBuffer.push(c);
        restored++;
      }
      logScrapeDebug('persist', `restored ${restored} comments từ sessionStorage, loại ${dropped} comment không xác định/bài cũ (tổng buffer=${interceptedCommentsBuffer.length})`);
    }
  } catch {}
}

function schedulePersist() {
  if (persistTimer != null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persistBuffer();
  }, 800);
}

function logScrapeDebug(tag: string, msg: string) {
  try {
    console.log(`[TS-DEBUG] [${tag}] ${msg}`);
  } catch {}
}

if (typeof window !== 'undefined') {
  restoreBuffer();
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'TS_GRAPHQL_COMMENTS_INTERCEPTED' && Array.isArray(event.data.comments)) {
      const pageUrl = typeof event.data.pageUrl === 'string' ? event.data.pageUrl : window.location.href;
      debugStats.interceptedMessages++;
      debugStats.totalInterceptedRaw += event.data.comments.length;
      debugStats.lastInterceptUrl = pageUrl;
      let added = 0;
      for (const c of event.data.comments) {
        if (c && c.text && c.author_username) {
          interceptedCommentsBuffer.push({ ...c, pageUrl });
          added++;
        }
      }
      if (added > 0) schedulePersist();
    }
  });
  window.addEventListener('beforeunload', () => persistBuffer());
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

// === HIGHLIGHT TRỰC QUAN (dùng chung cho scrape chính & test) ===

export interface HighlightSummary {
  highlighted: number; // số card comment/reply đã được đánh dấu trên trang
  totalComments: number;
  totalReplies: number;
}

function removeOldHighlights(doc: Document): void {
  doc.querySelectorAll('.ts-highlight-badge, #ts-count-overlay').forEach((el) => el.remove());
  doc.querySelectorAll('[data-ts-highlighted="true"]').forEach((el) => {
    if (!('style' in el)) return;
    const style = (el as HTMLElement).style;
    style.outline = '';
    style.backgroundColor = '';
    style.boxShadow = '';
    style.borderRadius = '';
    style.position = '';
    el.removeAttribute('data-ts-highlighted');
  });
}

// Overlay nổi hiện tổng số bình luận & phản hồi ngay trên trang Threads.
function createCountOverlay(doc: Document, totalComments: number, totalReplies: number): HTMLElement {
  const overlay = doc.createElement('div');
  overlay.id = 'ts-count-overlay';
  overlay.textContent = `THREADSCORE — ${totalComments} bình luận · ${totalReplies} phản hồi`;
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '12px',
    right: '16px',
    background: 'linear-gradient(135deg, #E5484D, #F05A28)',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: '800',
    padding: '6px 12px',
    borderRadius: '14px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
    zIndex: '2147483646',
    pointerEvents: 'none',
    fontFamily: 'system-ui, sans-serif',
    letterSpacing: '0.02em',
  });
  (doc.body || doc.documentElement).appendChild(overlay);
  return overlay;
}

// Đánh dấu viền đỏ + gắn badge "#N @username" lên từng card comment/reply
// tìm thấy trong DOM, đồng thời tạo overlay đếm tổng comment & phản hồi.
export function highlightCommentsOnPage(
  doc: Document,
  comments: ScrapedComment[],
  opts?: {
    mainPostContainer?: Element | null;
    mainAuthorUsername?: string | null;
    mainPostId?: string | null;
    scrollMode?: 'none' | 'first' | 'each';
  }
): HighlightSummary {
  removeOldHighlights(doc);
  const mainPostContainer = opts?.mainPostContainer ?? null;
  const mainAuthorUsername = opts?.mainAuthorUsername ?? null;
  const mainPostId = opts?.mainPostId ?? null;
  const scrollMode = opts?.scrollMode ?? 'none';

  const totalReplies = comments.filter((c) => isSubReplyComment(c, mainAuthorUsername, mainPostId)).length;
  createCountOverlay(doc, comments.length, totalReplies);

  const authorLinks = Array.from(doc.querySelectorAll('a[href*="/@"]')).filter(
    (l) => !l.closest('#ts-sidebar-container, header, nav, [role="navigation"]')
  );

  const usedCards = new Set<HTMLElement>();
  let highlighted = 0;
  let highlightIndex = 1;

  for (const c of comments) {
    const matchingLink = authorLinks.find((l) => {
      const u = cleanUsername(l.getAttribute('href') ?? l.textContent);
      return u && u.toLowerCase() === c.author_username?.toLowerCase();
    });
    if (!matchingLink) continue;
    const card = findCardContainer(matchingLink, mainPostContainer);
    if (!card || !('style' in card)) continue;
    if (usedCards.has(card)) continue; // nhiều comment cùng tác giả — chỉ đánh dấu card 1 lần
    usedCards.add(card);

    const isReply = isSubReplyComment(c, mainAuthorUsername, mainPostId);
    card.setAttribute('data-ts-highlighted', 'true');
    card.style.outline = '3px solid #E5484D';
    card.style.backgroundColor = 'rgba(229, 72, 77, 0.15)';
    card.style.boxShadow = '0 0 16px rgba(229, 72, 77, 0.6)';
    card.style.borderRadius = '8px';
    card.style.position = 'relative';

    const badge = doc.createElement('div');
    badge.className = 'ts-highlight-badge';
    badge.textContent = `#${highlightIndex} @${c.author_username}${isReply ? ' ↳ reply' : ''}`;
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
    highlighted++;
    highlightIndex++;

    if (scrollMode === 'each' || (scrollMode === 'first' && highlighted === 1)) {
      if (typeof card.scrollIntoView === 'function') {
        try {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {}
      }
    }
  }

  return { highlighted, totalComments: comments.length, totalReplies };
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
  if (direct && 'style' in direct && direct !== mainCard && direct !== link.ownerDocument?.body && direct !== link.ownerDocument?.documentElement) {
    return direct as HTMLElement;
  }

  // 2. Đi ngược DOM tree từ link để tìm container thích hợp
  let cur: Element | null = link.parentElement;
  let candidate: HTMLElement | null = null;
  while (cur && cur !== link.ownerDocument?.body && cur !== link.ownerDocument?.documentElement && cur !== mainCard) {
    const authorsInside = cur.querySelectorAll('a[href*="/@"]');
    if (authorsInside.length > 2) {
      break;
    }
    if ('style' in cur) {
      candidate = cur as HTMLElement;
    }
    if (cur.querySelector('svg[aria-label*="like" i], svg[aria-label*="thích" i], time, button, [role="button"]')) {
      if ('style' in cur) {
        candidate = cur as HTMLElement;
      }
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
  'bài viết threads',
  'threads',
]);

export function isGenericPromoText(text: string): boolean {
  if (!text) return true;
  const lower = text.trim().toLowerCase();
  if (lower.includes('tham gia threads') || lower.includes('join threads')) return true;
  if (lower.includes('đăng nhập bằng instagram') || lower.includes('log in with instagram')) return true;
  if (lower.includes('trang chủ • threads') || lower.includes('home • threads')) return true;
  if (lower.includes('chia sẻ ý tưởng') || lower.includes('share ideas')) return true;
  if (lower.includes('đặt câu hỏi') || lower.includes('ask questions')) return true;
  if (lower === 'threads' || lower === 'threads, an instagram app' || lower === 'bài viết threads') return true;
  return false;
}

export function isMetaOrBadgeText(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower || lower.length === 0) return true;
  if (BADGE_TEXTS.has(lower)) return true;
  if (isGenericPromoText(lower)) return true;
  // Lọc lượt xem, views, lượt thích, likes, lượt phát, v.v. (bao gồm số thập phân, K, M, B, dấu chấm/phẩy)
  if (/^[\d.,\s]+[kKmMbB]?\s*(lượt xem|lượt xem bài viết|views|view|lượt thích|likes|like|lượt phát|plays|reposts|shares|bình luận|comments)$/i.test(lower)) return true;
  if (/\b(lượt xem|views|lượt phát|plays)\b/i.test(lower) && lower.length < 35) return true;
  if (/^[\d.,\s]+[kKmM]?\s*(giờ|phút|giây|ngày|tuần|tháng|năm|h|m|s|d|w|y|hr|hrs|min|mins|sec|secs|ago|trước)(\s*trước)?$/i.test(lower)) return true;
  if (/^\d+[\s.,]*\d*\s*[kKmM]?\s*$/i.test(lower)) return true;
  if (/\d+\s*(câu\s+trả\s+lời|trả\s+lời|phản\s+hồi|replies|reply)/i.test(lower)) return true;
  if (/^xem\s+.*(câu\s+trả\s+lời|phản\s+hồi|replies)/i.test(lower)) return true;
  if (/^view\s+.*replies/i.test(lower)) return true;
  if (lower.startsWith('trả lời @') || lower.startsWith('reply to @')) return true;
  if (lower === '2/2' || /^\d+\/\d+$/.test(lower)) return true;
  if (lower === 'đã chỉnh sửa' || lower === 'edited') return true;
  return false;
}

export function cleanPartMarkers(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\s([{\-–—•|]*\b\d+\/\d+\b[)\]}]*\s*$/gi, '')
    .replace(/^[\s([{\-–—•|]*\b\d+\/\d+\b[)\]}:.–—\-\s]*/gi, '')
    .trim();
}

export function hasPartMarker(text: string): boolean {
  if (!text) return false;
  return /\b\d+\/\d+\b|(\(|\[|\b)(part|phần|tập|p)\s*\d+(\)|\]|\b)/i.test(text);
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
      return cleanPartMarkers(filtered.join('\n').trim());
    }
  }

  const directTexts = Array.from(card.querySelectorAll('div, span, p')).filter((el) => {
    if (link.contains(el) || el.closest('button, [role="button"], time, a[href*="/@"], header, nav')) return false;
    const t = el.textContent?.trim() ?? '';
    if (isMetaOrBadgeText(t)) return false;
    return t.length > 1 && el.children.length === 0;
  });

  return cleanPartMarkers(
    directTexts
      .map((e) => e.textContent?.trim() ?? '')
      .filter(Boolean)
      .join('\n')
      .trim()
  );
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

// Giải mã chuỗi JSON từ Meta (xử lý prefix `for (;;);` và stream chunk)
function parseJsonPayloads(text: string): Record<string, any>[] {
  if (!text || typeof text !== 'string') return [];
  const clean = text.replace(/^\s*for\s*\(\s*;\s*;\s*\)\s*;?/, '').trim();
  if (!clean) return [];

  try {
    const parsed = JSON.parse(clean);
    return [parsed];
  } catch {
    const results: Record<string, any>[] = [];
    const lines = clean.split('\n');
    for (const line of lines) {
      const trimmed = line.trim().replace(/^\s*for\s*\(\s*;\s*;\s*\)\s*;?/, '').trim();
      if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) continue;
      try {
        results.push(JSON.parse(trimmed));
      } catch {}
    }
    return results;
  }
}

function unwrapPost(obj: Record<string, any>): Record<string, any> {
  if (obj.post && typeof obj.post === 'object' && (obj.post.caption || obj.post.user || obj.post.text)) {
    return obj.post;
  }
  return obj;
}

function extractCommentNode(obj: Record<string, any>, out: ScrapedComment[]) {
  if (!obj || typeof obj !== 'object') return;
  const node = unwrapPost(obj);

  const text =
    node.text ||
    (node.caption && (typeof node.caption === 'string' ? node.caption : node.caption.text)) ||
    (typeof node.body === 'string' ? node.body : null);
  const user = node.user || node.owner || node.author;
  if (typeof text === 'string' && text.trim().length > 0 && user && typeof user === 'object') {
    const username = user.username || user.handle || null;
    const fullName = user.full_name || user.name || null;
    const avatarUrl = user.profile_pic_url_hd || user.profile_pic_url || user.avatar_url || user.profile_picture || null;
    if (username) {
      const likes =
        typeof node.like_count === 'number' ? node.like_count :
        typeof node.comment_like_count === 'number' ? node.comment_like_count : 0;
      const takenAt =
        typeof node.taken_at === 'number' ? node.taken_at :
        typeof node.created_at === 'number' ? node.created_at : null;
      const pk = node.id || node.pk || null;

      const textPostInfo = node.text_post_app_info || {};
      // Schema mới (2025): quan hệ cha-con nằm trong self_thread_info
      const selfThreadInfo = textPostInfo.self_thread_info || {};
      const parentPk =
        typeof node.parent_id === 'string' || typeof node.parent_id === 'number' ? String(node.parent_id) :
        node.parent && (node.parent.id || node.parent.pk) ? String(node.parent.id || node.parent.pk) :
        node.comment_parent_id ? String(node.comment_parent_id) :
        textPostInfo.parent_post_id ? String(textPostInfo.parent_post_id) :
        selfThreadInfo.parent_post_id ? String(selfThreadInfo.parent_post_id) :
        selfThreadInfo.parent_comment_id ? String(selfThreadInfo.parent_comment_id) :
        selfThreadInfo.parent_id ? String(selfThreadInfo.parent_id) : null;

      const replyToUser =
        (node.reply_to_username ? String(node.reply_to_username) : null) ||
        (textPostInfo.reply_to_author?.username ? String(textPostInfo.reply_to_author.username) : null) ||
        (selfThreadInfo.reply_to_author?.username ? String(selfThreadInfo.reply_to_author.username) : null) ||
        (selfThreadInfo.reply_to_username ? String(selfThreadInfo.reply_to_username) : null) ||
        (node.parent && (node.parent.user?.username || node.parent.user?.handle) ? String(node.parent.user?.username || node.parent.user?.handle) : null);

      out.push({
        external_id: pk ? String(pk) : null,
        author_username: String(username),
        author_name: fullName ? String(fullName) : null,
        author_avatar_url: avatarUrl ? String(avatarUrl) : null,
        text: cleanPartMarkers(text.trim()),
        like_count: likes,
        posted_at: takenAt,
        parent_id: parentPk,
        reply_to_username: replyToUser,
        code: node.code ? String(node.code) : null,
        direct_reply_count: typeof textPostInfo.direct_reply_count === 'number' ? textPostInfo.direct_reply_count : 0,
      });
    }
  }

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const val = obj[key];
    if (!val || typeof val !== 'object') continue;
    if (Array.isArray(val)) {
      for (const item of val) extractCommentNode(item, out);
    } else {
      extractCommentNode(val, out);
    }
  }
}

function getLsdToken(): string | null {
  if (typeof document === 'undefined') return null;
  const input = document.querySelector('input[name="lsd"]') as HTMLInputElement | null;
  if (input?.value) return input.value;
  const scripts = Array.from(document.querySelectorAll('script'));
  for (const s of scripts) {
    const txt = s.textContent || '';
    const m =
      txt.match(/"LSD"[\s\S]*?"token":"([^"]+)"/) ||
      txt.match(/name="lsd"\s+value="([^"]+)"/) ||
      txt.match(/"lsd":\s*"([^"]+)"/);
    if (m && m[1]) return m[1];
  }
  return null;
}

// Tự động quét sâu các comment có câu trả lời con (Sub-replies Deep Scraper)
async function fetchNestedReplies(
  parentComments: ScrapedComment[],
  seenKeys: Set<string>,
  maxParents: number = 60
): Promise<ScrapedComment[]> {
  const nestedComments: ScrapedComment[] = [];
  // Fetch sâu các comment có reply con. Lưu ý: `direct_reply_count` có thể thiếu trên một số
  // comment (Threads đổi schema) nên fetch cả comment có `code` — nhưng CHỈ giữ reply có
  // parent_id trỏ về đúng comment cha (hoặc reply_to_username trùng author cha), tránh kéo
  // replies của bài viết khác vào kết quả.
  const parentsWithReplies = parentComments.filter((c) => c.code);

  // sub có phải là reply trực tiếp của parent không? (chống kéo replies bài khác)
  function isReplyToParent(sub: ScrapedComment, parent: ScrapedComment): boolean {
    if (sub.parent_id && parent.external_id) {
      return sub.parent_id === parent.external_id || sub.parent_id === parent.code;
    }
    if (sub.reply_to_username && parent.author_username) {
      return sub.reply_to_username.toLowerCase() === parent.author_username.toLowerCase();
    }
    // Không xác định được quan hệ — chỉ chấp nhận nếu sub RÕ RÀNG là reply (có parent_id)
    return sub.parent_id != null && sub.parent_id !== '';
  }

  const targets = parentsWithReplies.slice(0, maxParents);
  if (targets.length === 0) {
    console.log(`[TS-DEBUG] [nested] no targets: total=${parentComments.length}, withCode=${parentComments.filter(c => c.code).length}, withReplyCount=${parentComments.filter(c => c.direct_reply_count && c.direct_reply_count > 0).length}`);
    return nestedComments;
  }

  console.log(`[TS-DEBUG] [nested] targets=${targets.length}, bắt đầu cào sâu...`);

  const lsdToken = getLsdToken();
  const chunkSize = 6;

  for (let i = 0; i < targets.length; i += chunkSize) {
    if (isScrapeAborted()) break;
    const chunk = targets.slice(i, i + chunkSize);
    const promises = chunk.map(async (parent) => {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.threads.net';

        // 1. Thử gọi GraphQL API trực tiếp nếu có external_id
        if (parent.external_id && lsdToken) {
          try {
            const body = new URLSearchParams({
              lsd: lsdToken,
              doc_id: '8097822346994987',
              variables: JSON.stringify({ postID: parent.external_id }),
            });
            const gqlRes = await fetch(`${origin}/api/graphql`, {
              method: 'POST',
              headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'x-fb-lsd': lsdToken,
                'x-ig-app-id': '238260118697367',
              },
              body: body.toString(),
              credentials: 'include',
            });
            if (gqlRes.ok) {
              const txt = await gqlRes.text();
              const payloads = parseJsonPayloads(txt);
              for (const p of payloads) {
                const extracted: ScrapedComment[] = [];
                extractCommentNode(p, extracted);
                console.log(`[TS-DEBUG] [nested] graphQL direct for ${parent.external_id}: extracted=${extracted.length}`);
                for (const sub of extracted) {
                  if (!sub.text || !sub.author_username) continue;
                  if (sub.external_id && sub.external_id === parent.external_id) continue;
                  if (sub.author_username === parent.author_username && sub.text === parent.text) continue;
                  // Chỉ giữ reply thực sự của comment cha — không kéo replies bài khác
                  if (!isReplyToParent(sub, parent)) continue;

                  const key = `${sub.author_username.toLowerCase()}:${sub.text}`;
                  if (seenKeys.has(key)) continue;
                  seenKeys.add(key);

                  nestedComments.push({
                    external_id: sub.external_id,
                    author_username: sub.author_username,
                    author_name: sub.author_name,
                    author_avatar_url: sub.author_avatar_url,
                    text: cleanPartMarkers(sub.text),
                    like_count: sub.like_count,
                    posted_at: sub.posted_at,
                    parent_id: sub.parent_id || parent.external_id,
                    reply_to_username: sub.reply_to_username || parent.author_username,
                    code: sub.code,
                    direct_reply_count: sub.direct_reply_count,
                  });
                }
              }
            } else {
              console.log(`[TS-DEBUG] [nested] graphQL direct FAIL ${parent.external_id}: status=${gqlRes.status}`);
            }
          } catch (e) {
            console.log(`[TS-DEBUG] [nested] graphQL direct ERROR ${parent.external_id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        // 2. Fetch HTML Sub-thread page
        const targetUrl = parent.author_username
          ? `${origin}/@${parent.author_username}/post/${parent.code}`
          : `${origin}/t/${parent.code}`;

        const res = await fetch(targetUrl, {
          credentials: 'include',
          headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        if (!res.ok) {
          console.log(`[TS-DEBUG] [nested] HTML fetch FAIL ${targetUrl}: status=${res.status}`);
          return;
        }
        const html = await res.text();
        console.log(`[TS-DEBUG] [nested] HTML fetch OK ${targetUrl}: len=${html.length}`);

        const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
        let payloadCount = 0;
        let extractedTotal = 0;
        for (const s of scriptMatches) {
          const match = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
          if (!match || !match[1]) continue;
          const payloads = parseJsonPayloads(match[1]);
          payloadCount += payloads.length;
          for (const p of payloads) {
            const extracted: ScrapedComment[] = [];
            extractCommentNode(p, extracted);
            extractedTotal += extracted.length;
            for (const sub of extracted) {
              if (!sub.text || !sub.author_username) continue;
              if (sub.external_id && sub.external_id === parent.external_id) continue;
              if (sub.author_username === parent.author_username && sub.text === parent.text) continue;
              // Chỉ giữ reply thực sự của comment cha — không kéo replies bài khác
              if (!isReplyToParent(sub, parent)) continue;

              const key = `${sub.author_username.toLowerCase()}:${sub.text}`;
              if (seenKeys.has(key)) continue;
              seenKeys.add(key);

              nestedComments.push({
                external_id: sub.external_id,
                author_username: sub.author_username,
                author_name: sub.author_name,
                author_avatar_url: sub.author_avatar_url,
                text: cleanPartMarkers(sub.text),
                like_count: sub.like_count,
                posted_at: sub.posted_at,
                parent_id: sub.parent_id || parent.external_id,
                reply_to_username: sub.reply_to_username || parent.author_username,
                code: sub.code,
                direct_reply_count: sub.direct_reply_count,
              });
            }
          }
        }
        console.log(`[TS-DEBUG] [nested] HTML parse done ${targetUrl}: scripts=${scriptMatches.length}, payloads=${payloadCount}, extracted=${extractedTotal}, kept=${nestedComments.length}`);
      } catch {}
    });
    await Promise.all(promises);
  }

  console.log(`[TS-DEBUG] [nested] done: nestedFound=${nestedComments.length}, nestedTotal=${nestedComments.length}`);
  return nestedComments;
}

// Kiểm tra xem một item có phải là bài viết gốc (Main Post) hay không để không lưu nhầm làm comment
function isMainPostComment(
  c: { author_username: string | null; text: string; code?: string | null; parent_id?: string | null },
  mainAuthor: string | null,
  mainTitleText: string,
  mainContentText: string,
  currentPostCode: string | null
): boolean {
  // 1. Nếu code của item trùng khớp với postCode của URL bài viết -> là Main Post
  if (c.code && currentPostCode && c.code === currentPostCode) return true;

  // 2. Nếu có parent_id khác null/empty -> chắc chắn là comment/reply
  if (c.parent_id != null && c.parent_id !== '') return false;

  // 3. Nếu author khớp với mainAuthor và text trùng với tiêu đề/nội dung bài gốc -> là Main Post
  const authorMatch = !mainAuthor || (c.author_username && c.author_username.toLowerCase() === mainAuthor.toLowerCase());
  const trimmed = c.text.trim();
  if (authorMatch && trimmed.length > 0) {
    if (mainContentText && (trimmed === mainContentText || mainContentText.startsWith(trimmed) || trimmed.startsWith(mainContentText))) {
      return true;
    }
    if (mainTitleText && (trimmed === mainTitleText || mainTitleText.startsWith(trimmed) || trimmed.startsWith(mainTitleText))) {
      return true;
    }
  }

  return false;
}

// Tính depth của từng comment theo cây parent_id → external_id (tối ưu hóa O(N) không đệ quy).
export function computeCommentDepth(
  comments: ScrapedComment[],
  mainPostId?: string | null
): Map<ScrapedComment, number> {
  const byExternalId = new Map<string, ScrapedComment>();
  for (const c of comments) {
    if (c.external_id) byExternalId.set(c.external_id, c);
  }
  const depthOf = new Map<ScrapedComment, number>();

  for (const c of comments) {
    let curr: ScrapedComment | undefined = c;
    let depth = 0;
    const visited = new Set<string>();

    while (curr && curr.parent_id && depth < 20) {
      if (mainPostId && curr.parent_id === mainPostId) break;
      if (curr.external_id && visited.has(curr.external_id)) break;
      if (curr.external_id) visited.add(curr.external_id);

      const parent = byExternalId.get(curr.parent_id);
      if (!parent) break;

      const cached = depthOf.get(parent);
      if (cached != null) {
        depth += cached + 1;
        break;
      }
      depth++;
      curr = parent;
    }
    depthOf.set(c, Math.min(depth, 20));
  }

  return depthOf;
}

// Reply trực tiếp vào bài gốc (không phải reply vào comment khác).
export function isDirectReplyToMainPost(
  c: ScrapedComment,
  mainPostId?: string | null
): boolean {
  if (c.parent_id != null && c.parent_id !== '') {
    return mainPostId != null ? c.parent_id === mainPostId : false;
  }
  return false;
}

// Phần tiếp nối của chính tác giả bài gốc: tác giả reply trực tiếp vào bài gốc
// (có đánh dấu "2/2", "Phần 2" hoặc bài gốc có marker 1/2).
export function isAuthorContinuation(
  c: ScrapedComment,
  mainAuthorUsername: string | null,
  mainPostId?: string | null,
  mainPostText?: string | null
): boolean {
  if (!mainAuthorUsername || !c.author_username) return false;
  if (c.author_username.toLowerCase() !== mainAuthorUsername.toLowerCase()) return false;
  const replyTo = c.reply_to_username?.toLowerCase() ?? null;
  if (replyTo && replyTo !== mainAuthorUsername.toLowerCase()) {
    return false;
  }
  if (c.parent_id != null && c.parent_id !== '') {
    if (mainPostId != null && c.parent_id !== mainPostId) {
      return false;
    }
  }

  const rawText = c.text || '';
  if (hasPartMarker(rawText)) return true;
  if (mainPostText && hasPartMarker(mainPostText)) return true;

  return false;
}

// Phân loại chính xác comment gốc (Top-level) vs Phản hồi con (Sub-reply)
export function isSubReplyComment(
  c: ScrapedComment,
  mainAuthorUsername: string | null,
  mainPostId?: string | null
): boolean {
  // 1. Nếu parent_id trùng với ID bài gốc (mainPostId) -> là Comment Gốc
  if (c.parent_id != null && c.parent_id !== '') {
    if (mainPostId && c.parent_id === mainPostId) {
      return false;
    }
    // Nếu parent_id khác mainPostId -> chắc chắn là reply cho 1 comment khác
    if (mainPostId && c.parent_id !== mainPostId) {
      return true;
    }
  }

  // 2. Nếu reply_to_username khác tác giả bài gốc -> chắc chắn là reply con cho 1 user khác
  if (c.reply_to_username && mainAuthorUsername) {
    if (c.reply_to_username.toLowerCase() !== mainAuthorUsername.toLowerCase()) {
      return true;
    }
  }

  return false;
}

function extractOgDescription(doc: Document): string | null {
  const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() ||
                 doc.querySelector('meta[property="twitter:description"]')?.getAttribute('content')?.trim();
  if (!ogDesc) return null;
  // Threads đặt og:description có dạng: "110 bình luận - Nội dung bài viết..." hoặc "Nội dung bài viết..."
  let clean = ogDesc.replace(/^[\d.,\s]+[kKmMbB]?\s*(bình luận|comments|lượt thích|likes|views|lượt xem)\s*[-–—:•]\s*/i, '').trim();
  if (clean && !isMetaOrBadgeText(clean) && !isGenericPromoText(clean)) {
    return clean;
  }
  return null;
}

function extractFromDocumentTitle(doc: Document): string | null {
  const rawTitle = doc.title || '';
  // Threads doc.title có dạng: "username trên Threads: “Nội dung bài viết...”" hoặc "username on Threads: '...'"
  const m = rawTitle.match(/[:：]\s*[“"']?([^"”']+)["”']?/);
  if (m && m[1]) {
    const text = m[1].trim();
    if (text && !isMetaOrBadgeText(text) && !isGenericPromoText(text)) return text;
  }
  return null;
}

export async function scrapeCurrentThread(doc: Document, opts?: { maxComments?: number }): Promise<ScrapedThread> {
  const currentUrl = doc.location?.href ?? doc.defaultView?.location.href ?? '';
  const { author: mainAuthorUrl, postCode: currentPostCode } = parseThreadsUrl(currentUrl);

  // Chỉ giữ comment của bài đang mở — xóa comment bài cũ khỏi buffer (chống trộn dữ liệu)
  pruneBufferForPost(currentPostCode);

  await autoScrollUntilStable(doc, { maxComments: opts?.maxComments ?? MAX_COMMENTS });

  const titleEl = doc.querySelector(SELECTORS.title);
  const contentEl = doc.querySelector(SELECTORS.content);
  const authorEl = doc.querySelector(SELECTORS.authorLink);
  const timeEl = doc.querySelector(SELECTORS.time);

  const resolvedMainAuthor = mainAuthorUrl || cleanUsername(authorEl?.getAttribute('href') ?? authorEl?.textContent);

  let mainTitleText = titleEl?.textContent?.trim() ?? '';
  let mainContentText = contentEl?.textContent?.trim() ?? '';

  if (isMetaOrBadgeText(mainTitleText) || isGenericPromoText(mainTitleText)) mainTitleText = '';
  if (isMetaOrBadgeText(mainContentText) || isGenericPromoText(mainContentText)) mainContentText = '';

  // 1. ƯU TIÊN SỐ 1: Trích xuất từ GraphQL Buffer (Mã code khớp chính xác với URL bài viết - dữ liệu gốc 100%)
  let rootPostNode = interceptedCommentsBuffer.find(
    (gc) => currentPostCode && gc.code === currentPostCode && gc.text && !isMetaOrBadgeText(gc.text) && !isGenericPromoText(gc.text)
  );
  if (rootPostNode && rootPostNode.text && (!mainContentText || isMetaOrBadgeText(mainContentText))) {
    mainContentText = rootPostNode.text.trim();
    if (!mainTitleText || isMetaOrBadgeText(mainTitleText)) {
      mainTitleText = mainContentText.length > 140 ? mainContentText.slice(0, 140) + '...' : mainContentText;
    }
  }

  // 2. ƯU TIÊN SỐ 2: Trích xuất trực tiếp từ DOM container của bài viết gốc ở đầu trang
  const mainPostContainer = findMainPostContainer(doc, mainAuthorUrl);
  if ((!mainContentText || isMetaOrBadgeText(mainContentText)) && mainPostContainer) {
    const rawTexts = Array.from(mainPostContainer.querySelectorAll('span[dir="auto"], div[dir="auto"], p'))
      .map((el) => el.textContent?.trim() || '')
      .filter((t) => t.length > 0 && !isMetaOrBadgeText(t) && !isGenericPromoText(t) && !t.startsWith('@'));
    if (rawTexts.length > 0) {
      mainContentText = rawTexts.reduce((a, b) => (a.length >= b.length ? a : b));
      if (!mainTitleText || isMetaOrBadgeText(mainTitleText)) {
        mainTitleText = mainContentText.length > 140 ? mainContentText.slice(0, 140) + '...' : mainContentText;
      }
    }
  }

  // 3. ƯU TIÊN SỐ 3: Trích xuất từ Meta Tag og:description
  if (!mainContentText || isMetaOrBadgeText(mainContentText)) {
    const ogContent = extractOgDescription(doc);
    if (ogContent) {
      mainContentText = ogContent;
      mainTitleText = ogContent.length > 140 ? ogContent.slice(0, 140) + '...' : ogContent;
    }
  }

  // 4. ƯU TIÊN SỐ 4: Trích xuất từ Document Title nếu có quote nội dung
  if (!mainContentText || isMetaOrBadgeText(mainContentText)) {
    const titleContent = extractFromDocumentTitle(doc);
    if (titleContent) {
      mainContentText = titleContent;
      mainTitleText = titleContent.length > 140 ? titleContent.slice(0, 140) + '...' : titleContent;
    }
  }

  // Nếu title vẫn dính meta/badge text hoặc rỗng, làm sạch lần cuối
  if (isMetaOrBadgeText(mainTitleText) || isGenericPromoText(mainTitleText)) {
    mainTitleText = mainContentText && !isMetaOrBadgeText(mainContentText) && !isGenericPromoText(mainContentText)
      ? (mainContentText.length > 140 ? mainContentText.slice(0, 140) + '...' : mainContentText)
      : '';
  }

  // Tìm ID bài gốc (mainPostId) từ GraphQL Buffer
  let mainPostId: string | null = rootPostNode?.external_id ?? null;
  if (!mainPostId) {
    for (const gc of interceptedCommentsBuffer) {
      if (isMainPostComment(gc, resolvedMainAuthor, mainTitleText, mainContentText, currentPostCode)) {
        if (gc.external_id) {
          mainPostId = gc.external_id;
          break;
        }
      }
    }
  }

  // Nếu không thấy trực tiếp node main post, suy ra mainPostId từ parent_id phổ biến nhất trong buffer (tất cả comment gốc đều có parent_id = root post ID)
  if (!mainPostId && interceptedCommentsBuffer.length > 0) {
    const counts = new Map<string, number>();
    for (const gc of interceptedCommentsBuffer) {
      if (gc.parent_id) {
        counts.set(gc.parent_id, (counts.get(gc.parent_id) || 0) + 1);
      }
    }
    let max = 0;
    for (const [pid, count] of counts.entries()) {
      if (count > max) {
        max = count;
        mainPostId = pid;
      }
    }
  }

  debugStats.mainPostContainerTag = mainPostContainer
    ? `${mainPostContainer.tagName.toLowerCase()}.${(mainPostContainer.className || '').toString().slice(0, 60)}`
    : 'null';

  const seenKeys = new Set<string>();

  // Đưa tiêu đề & nội dung bài gốc vào seenKeys để loại trừ tuyệt đối khỏi danh sách comment
  if (resolvedMainAuthor) {
    if (mainContentText) seenKeys.add(`${resolvedMainAuthor.toLowerCase()}:${mainContentText}`);
    if (mainTitleText) seenKeys.add(`${resolvedMainAuthor.toLowerCase()}:${mainTitleText}`);
  }

  const comments: ScrapedComment[] = [];

  // 1. Comment từ GraphQL interceptor (chỉ của bài đang mở — lọc theo postCode/URL)
  for (const gc of interceptedCommentsBuffer) {
    if (!gc.text || !gc.author_username) continue;

    // Bỏ qua comment thuộc bài khác (pageUrl/postCode khác với bài đang mở)
    if (gc.pageUrl && currentPostCode) {
      const { postCode: bufPostCode } = parseThreadsUrl(gc.pageUrl);
      if (bufPostCode && bufPostCode !== currentPostCode) continue;
    }

    // Bỏ qua nếu là bài viết gốc (Main Post)
    if (isMainPostComment(gc, resolvedMainAuthor, mainTitleText, mainContentText, currentPostCode)) {
      debugStats.skippedMainText++;
      continue;
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
      code: gc.code,
      direct_reply_count: gc.direct_reply_count,
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

  // 3. Tự động cào sâu toàn bộ các câu trả lời con (Sub-replies) của các comment có replies
  const nestedReplies = await fetchNestedReplies(comments, seenKeys, 30);
  if (nestedReplies.length > 0) {
    comments.push(...nestedReplies);
  }

  debugStats.bufferSize = interceptedCommentsBuffer.length;
  debugStats.bufferedWithReplies = comments.filter(
    (c) => isSubReplyComment(c, resolvedMainAuthor, mainPostId)
  ).length;
  debugStats.graphQLComments = comments.length - domComments.length;
  debugStats.domComments = domComments.length;
  debugStats.expandersFound = countReplyExpanders(doc);
  debugStats.repliesCounted = doc.querySelectorAll(
    'a[href*="/@"], div[data-pressable-container="true"], article, div[role="listitem"], .reply-item'
  ).length;

  // Trích xuất Avatar URL của tác giả bài viết
  let authorAvatarUrl: string | null = rootPostNode?.author_avatar_url ?? null;
  if (!authorAvatarUrl) {
    const authorNode = interceptedCommentsBuffer.find(
      (gc) => resolvedMainAuthor && gc.author_username && gc.author_username.toLowerCase() === resolvedMainAuthor.toLowerCase() && gc.author_avatar_url
    );
    if (authorNode?.author_avatar_url) {
      authorAvatarUrl = authorNode.author_avatar_url;
    }
  }
  if (!authorAvatarUrl && mainPostContainer) {
    const imgEl = mainPostContainer.querySelector('a[href*="/@"] img, img[alt*="ảnh đại diện" i], img[alt*="profile picture" i], img[alt*="avatar" i]') ||
                  doc.querySelector('header img, a[href*="/@"] img');
    const src = imgEl?.getAttribute('src');
    if (src && src.startsWith('http')) {
      authorAvatarUrl = src;
    }
  }

  const finalTitle = cleanPartMarkers(mainTitleText || titleEl?.textContent?.trim() || '');
  const finalContent = cleanPartMarkers(mainContentText || contentEl?.textContent?.trim() || '');

  // Highlight + hiện tổng số comment/reply ngay trên trang
  const highlightSummary = highlightCommentsOnPage(doc, comments, {
    mainPostContainer,
    mainAuthorUsername: resolvedMainAuthor,
    mainPostId,
    scrollMode: 'none',
  });

  return {
    url: currentUrl,
    title: finalTitle || null,
    content: finalContent || null,
    author_username: resolvedMainAuthor,
    author_name: rootPostNode?.author_name ?? null,
    author_avatar_url: authorAvatarUrl,
    posted_at: parseTime(timeEl),
    comments,
    main_post_id: mainPostId,
    debugStats: { ...debugStats },
    highlightSummary,
  };
}

// CHẾ ĐỘ TEST & HIGHLIGHT TRỰC QUAN
export async function testScrapeAndHighlight(doc: Document, limit: number = 5): Promise<ScrapedThread> {
  const currentUrl = doc.location?.href ?? doc.defaultView?.location.href ?? '';
  const { author: mainAuthorUrl, postCode: currentPostCode } = parseThreadsUrl(currentUrl);

  removeOldHighlights(doc);

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
  if (resolvedMainAuthor) {
    if (mainContentText) seenKeys.add(`${resolvedMainAuthor.toLowerCase()}:${mainContentText}`);
    if (mainTitleText) seenKeys.add(`${resolvedMainAuthor.toLowerCase()}:${mainTitleText}`);
  }

  const comments: ScrapedComment[] = [];

  // 1. Ưu tiên GraphQL buffer
  for (const gc of interceptedCommentsBuffer) {
    if (comments.length >= limit) break;
    if (!gc.text || !gc.author_username) continue;
    if (gc.pageUrl && currentPostCode) {
      const { postCode: bufPostCode } = parseThreadsUrl(gc.pageUrl);
      if (bufPostCode && bufPostCode !== currentPostCode) continue;
    }
    if (isMainPostComment(gc, resolvedMainAuthor, mainTitleText, mainContentText, currentPostCode)) continue;
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

  // 3. Tự động cào sâu câu trả lời con cho các comment có replies
  const nestedReplies = await fetchNestedReplies(comments, seenKeys, limit);
  if (nestedReplies.length > 0) {
    comments.push(...nestedReplies);
  }

  // 4. Highlight trực quan các card tương ứng trên DOM + overlay đếm tổng
  const highlightSummary = highlightCommentsOnPage(doc, comments, {
    mainPostContainer,
    mainAuthorUsername: resolvedMainAuthor,
    scrollMode: 'each',
  });

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
    author_avatar_url: null,
    posted_at: parseTime(timeEl),
    comments,
    debugStats: { ...debugStats },
    highlightSummary,
  };
}

function setupInjectedSidebar(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  // Tuyệt đối KHÔNG inject sidebar bên trong iframe (chỉ chạy ở top frame của trang web)
  if (window.top !== window.self) return;

  // Dọn sạch mọi container / toggle-btn cũ từ các lần inject trước
  const oldNodes = document.querySelectorAll('#ts-sidebar-container, #ts-sidebar-toggle-btn, #ts-sidebar-panel');
  oldNodes.forEach((el) => el.remove());

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
      toggleBtn.style.opacity = '0';
      toggleBtn.style.pointerEvents = 'none';
      toggleBtn.style.transform = 'translateX(50px)';
      document.body.style.transition = 'margin-right 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
      document.body.style.marginRight = '380px';
    } else {
      panelWrapper.style.transform = 'translateX(100%)';
      toggleBtn.style.opacity = '1';
      toggleBtn.style.pointerEvents = 'auto';
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

let scrapeAbortRequested = false;

export function isScrapeAborted(): boolean {
  return scrapeAbortRequested;
}

export function resetScrapeAbort(): void {
  scrapeAbortRequested = false;
}

export function requestScrapeAbort(): void {
  scrapeAbortRequested = true;
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: { type?: string; limit?: number }, _sender, sendResponse) => {
    if (message.type === 'TS_SCRAPE') {
      resetScrapeAbort();
      scrapeCurrentThread(document)
        .then((result) => sendResponse(result))
        .catch((e) => sendResponse({ error: e instanceof Error ? e.message : 'Scrape lỗi' }));
      return true;
    }
    if (message.type === 'TS_TEST_SCRAPE') {
      resetScrapeAbort();
      testScrapeAndHighlight(document, message.limit ?? 5)
        .then((result) => sendResponse(result))
        .catch((e) => sendResponse({ error: e instanceof Error ? e.message : 'Test scrape lỗi' }));
      return true;
    }
    if (message.type === 'TS_STOP_SCRAPE') {
      requestScrapeAbort();
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });
}
