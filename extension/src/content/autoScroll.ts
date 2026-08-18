// Auto-scroll orchestrator: Cuộn trang kiên trì, nhận diện & mở rộng toàn bộ câu trả lời con (sub-replies).

import { debugStats } from './debug';
import { isScrapeAborted, getInterceptedCommentsCount } from './scraper';

// Candidate gần giống nút expander nhưng không khớp regex — để chẩn đoán vì sao không click được.
const nearMissCandidates = new Set<string>();

function logDebug(tag: string, msg: string) {
  try {
    console.log(`[TS-DEBUG] [${tag}] ${msg}`);
  } catch {}
}

// Kiểm tra xem đã chạm đến thông báo chân trang Threads hay chưa
export function isEndOfCommentsReached(doc: Document): boolean {
  const hiddenLink = doc.querySelector('a[href*="/hidden_replies"], a[href*="hidden_replies"]');
  if (hiddenLink) {
    const rect = hiddenLink.getBoundingClientRect();
    const scrollH = doc.documentElement?.scrollHeight || doc.body?.scrollHeight || 1;
    // Chỉ coi là chân trang nếu link nằm ở khu vực cuối trang
    if (rect.top + window.scrollY > scrollH - 1200) {
      return true;
    }
  }
  return false;
}

function isRealSubReplyExpander(el: HTMLElement): boolean {
  if (el.closest('#ts-sidebar-container, header, nav, [role="navigation"], [role="menu"], [role="dialog"], [role="listbox"]')) {
    return false;
  }

  const ariaLabel = (el.getAttribute('aria-label') ?? '').toLowerCase().trim();
  const title = (el.getAttribute('title') ?? '').toLowerCase().trim();
  const role = (el.getAttribute('role') ?? '').toLowerCase();

  const txt = (el.textContent ?? '').trim().toLowerCase();
  if (!txt || txt.length < 2 || txt.length > 100) return false;

  // ƯU TIÊN 1: text có số đi kèm chữ "trả lời"/"reply" => chắc chắn là expander
  // (phải xét TRƯỚC các guard aria-label/icon — nút expander cũng có aria-label
  // "trả lời" và icon, nên guard đó sẽ chặn nhầm).
  const hasReplyCount =
    /\d+\s*(câu\s+trả\s+lời|phản\s+hồi|replies|reply)/i.test(txt) ||
    /(xem|view|show|hiển\s+thị)\s+.*(câu\s+trả\s+lời|phản\s+hồi|replies|reply)/i.test(txt) ||
    /(xem|view)\s+\d+\s+(câu\s+trả\s+lời|phản\s+hồi|replies|reply)/i.test(txt) ||
    /^\d+\s*(câu\s+trả\s+lời|phản\s+hồi)$/i.test(txt) ||
    /^\d+\s*(replies|reply)$/i.test(txt) ||
    // UI mới: chữ "trả lời" đứng TRƯỚC số, không khoảng trắng — "trả lời660", "reply90"
    /^(trả\s*lời|phản\s*hồi|câu\s*trả\s*lời|reply|replies)\s*[:.,]?\s*\d+/i.test(txt) ||
    /^(xem|view|hiển\s*thị)\s*(trả\s*lời|phản\s*hồi|reply|replies)\s*[:.,]?\s*\d+/i.test(txt);

  if (hasReplyCount) return true;

  // Không có số => không phải expander. Giờ mới áp guard để loại nút composer/menu.
  if (
    role === 'menu' ||
    role === 'menuitem' ||
    role === 'option' ||
    ariaLabel === 'trả lời' ||
    ariaLabel === 'reply' ||
    ariaLabel === 'thích' ||
    ariaLabel === 'like' ||
    ariaLabel === 'chia sẻ' ||
    ariaLabel === 'share' ||
    ariaLabel === 'đăng lại' ||
    ariaLabel === 'repost' ||
    ariaLabel.includes('tùy chọn') ||
    ariaLabel.includes('khác') ||
    ariaLabel.includes('more') ||
    ariaLabel.includes('menu') ||
    ariaLabel.includes('hoạt động') ||
    ariaLabel.includes('activity') ||
    ariaLabel.includes('hàng đầu') ||
    ariaLabel.includes('sắp xếp') ||
    title.includes('tùy chọn') ||
    title.includes('more')
  ) {
    return false;
  }

  // Lọc các từ cấm
  if (
    txt === 'trả lời' ||
    txt === 'reply' ||
    txt === 'thích' ||
    txt === 'like' ||
    txt === 'chia sẻ' ||
    txt === 'share' ||
    txt === 'xem hoạt động' ||
    txt === 'hàng đầu' ||
    txt === 'mới đây' ||
    txt.includes('sao chép') ||
    txt.includes('mã nhúng') ||
    txt.includes('không quan tâm') ||
    txt.includes('bảng feed') ||
    txt.startsWith('trả lời @') ||
    txt.startsWith('reply to @')
  ) {
    return false;
  }

  if (ariaLabel && (/\d+\s*(câu trả lời|phản hồi|repl|reply)/i.test(ariaLabel) || /(xem|view|show|hiển thị).*câu trả lời/i.test(ariaLabel))) {
    return true;
  }

  return false;
}

// Mở rộng các câu trả lời con (sub-replies) trực tiếp trên từng bình luận (tối ưu hóa chống lag DOM)
async function expandSubReplies(doc: Document): Promise<{ found: number; clicked: number }> {
  let expandedCount = 0;
  let foundCount = 0;
  // Giới hạn trong main feed để không quét cả document
  const container = doc.querySelector('main, [role="main"]') || doc.body;
  const clickables = Array.from(
    container.querySelectorAll('div[role="button"], button, span[role="button"], a[role="button"], span, div[tabindex="0"]')
  );

  for (const el of clickables) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.dataset.tsExpanded === 'true') continue;

    // Kiểm tra nhanh text trước khi gọi reflow layout
    if (isRealSubReplyExpander(el)) {
      foundCount++;
      // Chỉ click tối đa 2 expander mỗi lượt cuộn, chờ 600ms giữa mỗi lần —
      // mở quá nhanh làm Threads reload trang mất toàn bộ trạng thái.
      if (expandedCount < 2) {
        if (el.offsetParent !== null || el.clientHeight > 0) {
          try {
            const txt = (el.textContent ?? '').trim();
            const desc = (s: string) => `tag=${el.tagName.toLowerCase()} class="${(el.className || '').toString().slice(0, 40)}" role="${el.getAttribute('role') ?? ''}" aria="${(el.getAttribute('aria-label') ?? '').slice(0, 30)}" title="${(el.getAttribute('title') ?? '').slice(0, 30)}"`;
            logDebug('expand-inspect', `"${txt.slice(0, 50)}" ${desc('self')}`);

            // KHÔNG click nếu phần tử (hoặc cha trực tiếp) chứa icon composer "Trả lời".
            const hasComposerIcon = el.querySelector('svg[aria-label*="trả lời" i], svg[aria-label*="reply" i]');
            if (hasComposerIcon) {
              logDebug('expand-skip', `skip composer wrapper: "${txt.slice(0, 50)}"`);
              el.dataset.tsExpanded = 'true';
            } else {
              el.dataset.tsExpanded = 'true';
              el.click();
              expandedCount++;
              logDebug('expand', `clicked expander: "${txt.slice(0, 60)}"`);
              await new Promise((r) => setTimeout(r, 600));
            }
          } catch {}
        }
      }
    } else {
      // Chẩn đoán: log các candidate gần giống nút reply nhưng không khớp regex
      const txt = (el.textContent ?? '').trim().toLowerCase();
      if (
        txt.length > 2 && txt.length < 100 &&
        (txt.includes('trả') || txt.includes('phản hồi') || txt.includes('reply') || txt.includes('repl')) &&
        !txt.includes('sao chép') && !txt.includes('mã nhúng') && !txt.includes('không quan tâm') &&
        el.offsetParent !== null && !nearMissCandidates.has(txt)
      ) {
        nearMissCandidates.add(txt);
        if (nearMissCandidates.size <= 8) {
          logDebug('expand-nearmiss', `candidate KHÔNG khớp: "${txt.slice(0, 80)}"`);
        }
      }
    }
  }

  return { found: foundCount, clicked: expandedCount };
}

function countReplies(doc: Document): number {
  return doc.querySelectorAll(
    'a[href*="/@"], div[data-pressable-container="true"], article, div[role="listitem"], .reply-item'
  ).length;
}

export async function autoScrollUntilStable(doc: Document, opts?: { maxComments?: number; maxScrolls?: number }): Promise<void> {
  const maxScrolls = opts?.maxScrolls ?? 180;
  let stableCount = 0;
  let lastBufferCount = -1;
  let lastDomCount = -1;
  let totalExpandersFound = 0;
  let totalExpandersClicked = 0;

  for (let i = 0; i < maxScrolls; i++) {
    if (isScrapeAborted()) break;

    // 1. Quét và bấm mở rộng tất cả các câu trả lời con thực sự
    const { found, clicked } = await expandSubReplies(doc);
    totalExpandersFound += found;
    totalExpandersClicked += clicked;

    if (isScrapeAborted()) break;

    // 2. Cuộn phần tử cuối cùng vào viewport để kích hoạt IntersectionObserver của Threads
    const allCommentCards = Array.from(
      doc.querySelectorAll('div[data-pressable-container="true"], .reply-item, [role="article"], div[role="listitem"]')
    );
    if (allCommentCards.length > 0) {
      const lastCard = allCommentCards[allCommentCards.length - 1];
      if (lastCard && typeof (lastCard as HTMLElement).scrollIntoView === 'function') {
        try {
          (lastCard as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'end' });
        } catch {}
      }
    }

    // 3. Cuộn trang window & các container có thể cuộn
    const w = doc.defaultView;
    if (w) {
      const scrollH = Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0);

      // Nếu đang bị chững lại, cuộn nhấp nhả (jitter) ngược lên 500px rồi cuộn xuống để kích hoạt lại trigger nạp của Threads
      if (stableCount >= 2) {
        try {
          w.scrollBy(0, -600);
          await new Promise((r) => setTimeout(r, 200));
        } catch {}
      }

      try {
        if (typeof w.scrollTo === 'function') {
          w.scrollTo(0, scrollH);
        } else {
          (w as unknown as { scrollY: number }).scrollY = scrollH;
        }
      } catch {}

      try {
        if (typeof w.scrollBy === 'function') {
          w.scrollBy(0, 2000);
        }
      } catch {}

      if (doc.documentElement) {
        doc.documentElement.scrollTop = scrollH;
      }
      if (doc.body) {
        doc.body.scrollTop = scrollH;
      }

      // Cuộn cả thẻ main hoặc scroll container nội bộ nếu có
      const scrollContainers = doc.querySelectorAll('main, [role="main"], div[style*="overflow-y"]');
      scrollContainers.forEach((sc) => {
        if (sc instanceof HTMLElement) {
          sc.scrollTop = sc.scrollHeight;
        }
      });

      try {
        w.dispatchEvent(new WheelEvent('wheel', { deltaY: 1200, bubbles: true }));
        w.dispatchEvent(new Event('scroll'));
      } catch {}
    }

    // Chờ mạng nạp dữ liệu: 500ms - 800ms
    const waitTime = clicked > 0 ? 600 : 500 + Math.floor(Math.random() * 300);
    await new Promise((r) => setTimeout(r, waitTime));

    if (isScrapeAborted()) break;

    const currentBufferCount = getInterceptedCommentsCount();
    const currentDomCount = countReplies(doc);

    // Chỉ tăng stableCount nếu CẢ GraphQL buffer VÀ DOM đều không có thêm dữ liệu mới VÀ không có expander nào vừa click
    if (currentBufferCount === lastBufferCount && currentDomCount === lastDomCount && clicked === 0) {
      stableCount++;
      // Chỉ dừng khi đã kiên trì thử 8 lần liên tiếp (~5-6s) không có bất kỳ dữ liệu mới nào
      if (stableCount >= 8) {
        if (isEndOfCommentsReached(doc) || stableCount >= 10) break;
      }
    } else {
      stableCount = 0;
    }

    lastBufferCount = currentBufferCount;
    lastDomCount = currentDomCount;

    if (opts?.maxComments && currentBufferCount >= opts.maxComments) break;
  }

  debugStats.expandersFound = totalExpandersFound;
  debugStats.expandersClicked = totalExpandersClicked;
  debugStats.repliesCounted = countReplies(doc);
  logDebug('autoscroll', `done: scrolls=${maxScrolls} expandersFound=${totalExpandersFound} expandersClicked=${totalExpandersClicked} buffer=${getInterceptedCommentsCount()}`);
}
