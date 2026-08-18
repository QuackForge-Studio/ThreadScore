// Auto-scroll orchestrator: Cuộn trang kiên trì, nhận diện & mở rộng toàn bộ câu trả lời con (sub-replies).

import { debugStats } from './debug';
import { isScrapeAborted } from './scraper';

// Kiểm tra xem đã chạm đến thông báo chân trang Threads (Đã ẩn một số thread trả lời / hidden_replies) hay chưa
export function isEndOfCommentsReached(doc: Document): boolean {
  // 1. Kiểm tra link chứa /hidden_replies
  const hiddenLink = doc.querySelector('a[href*="/hidden_replies"], a[href*="hidden_replies"]');
  if (hiddenLink) return true;

  // 2. Kiểm tra các phần tử văn bản thông báo chân trang
  const clickables = Array.from(doc.querySelectorAll('span, div, p, a, [role="button"]'));
  for (const el of clickables) {
    const txt = (el.textContent ?? '').trim().toLowerCase();
    if (!txt || txt.length > 120) continue;
    if (
      txt.includes('đã ẩn một số thread trả lời') ||
      txt.includes('đã ẩn một số phản hồi') ||
      txt.includes('đã ẩn một số câu trả lời') ||
      txt.includes('some replies were hidden') ||
      txt.includes('some replies may be hidden') ||
      txt.includes('hidden_replies')
    ) {
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

  // Bỏ qua các menu và nút tương tác cơ bản (so khớp chính xác để không chặn nút expander có chữ "trả lời")
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

  const txt = (el.textContent ?? '').trim().toLowerCase();
  if (!txt || txt.length < 2 || txt.length > 100) return false;

  // Lọc các từ cấm
  if (
    txt === 'trả lời' ||
    txt === 'reply' ||
    txt === 'thích' ||
    txt === 'like' ||
    txt === 'chia sẻ' ||
    txt === 'share' ||
    txt === 'xem thêm' ||
    txt === 'xem hoạt động' ||
    txt === 'hàng đầu' ||
    txt === 'mới đây' ||
    txt.includes('đã ẩn') ||
    txt.includes('bị ẩn') ||
    txt.includes('hidden') ||
    txt.includes('sao chép') ||
    txt.includes('mã nhúng') ||
    txt.includes('không quan tâm') ||
    txt.includes('bảng feed') ||
    txt.startsWith('trả lời @') ||
    txt.startsWith('reply to @')
  ) {
    return false;
  }

  // Nhận diện các nút mở câu trả lời con (tiếng Việt & tiếng Anh):
  return (
    /\d+\s*(câu\s+trả\s+lời|phản\s+hồi|replies|reply)/i.test(txt) ||
    /(xem|view|show)\s+.*(câu\s+trả\s+lời|phản\s+hồi|replies|reply)/i.test(txt) ||
    /^\d+\s*(câu\s+trả\s+lời|phản\s+hồi)$/i.test(txt) ||
    /^\d+\s*(replies|reply)$/i.test(txt)
  );
}

// Mở rộng các câu trả lời con (sub-replies) trực tiếp trên từng bình luận (tối ưu hóa chống lag DOM)
async function expandSubReplies(doc: Document): Promise<{ found: number; clicked: number }> {
  let expandedCount = 0;
  let foundCount = 0;
  // Giới hạn trong main feed để không quét cả document
  const container = doc.querySelector('main, [role="main"]') || doc.body;
  const clickables = Array.from(
    container.querySelectorAll('div[role="button"], button, span[role="button"], a[role="button"]')
  );

  for (const el of clickables) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.dataset.tsExpanded === 'true') continue;

    // Kiểm tra nhanh text trước khi gọi reflow layout
    if (isRealSubReplyExpander(el)) {
      foundCount++;
      // Chỉ click tối đa 6 expander mỗi lượt cuộn để tránh treo luồng giao diện
      if (expandedCount < 6) {
        if (el.offsetParent !== null || el.clientHeight > 0) {
          try {
            el.dataset.tsExpanded = 'true';
            el.click();
            expandedCount++;
            await new Promise((r) => setTimeout(r, 60));
          } catch {}
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
  const maxScrolls = opts?.maxScrolls ?? 100;
  let stableCount = 0;
  let lastCount = -1;
  let totalExpandersFound = 0;
  let totalExpandersClicked = 0;

  for (let i = 0; i < maxScrolls; i++) {
    // 0. Kiểm tra nếu người dùng bấm dừng hoặc đã chạm đến thông báo chân trang ("Đã ẩn một số thread trả lời")
    if (isScrapeAborted()) break;
    if (isEndOfCommentsReached(doc)) break;

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

      // Nếu đang bị chững lại, cuộn nhấp nhả (jitter) ngược lên 400px rồi cuộn xuống để kích hoạt lại trigger nạp của Threads
      if (stableCount >= 2) {
        try {
          w.scrollBy(0, -400);
          await new Promise((r) => setTimeout(r, 220));
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
          w.scrollBy(0, 1500);
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
        w.dispatchEvent(new WheelEvent('wheel', { deltaY: 1000, bubbles: true }));
        w.dispatchEvent(new Event('scroll'));
      } catch {}
    }

    // Chờ mạng nạp dữ liệu: 700ms - 1100ms (đủ thời gian cho GraphQL pagination phản hồi ổn định)
    const waitTime = clicked > 0 ? 800 : 700 + Math.floor(Math.random() * 400);
    await new Promise((r) => setTimeout(r, waitTime));

    if (isScrapeAborted() || isEndOfCommentsReached(doc)) break;

    const count = countReplies(doc);
    if (count === lastCount && clicked === 0) {
      stableCount++;
      // Chờ tới 8 lần kiểm tra (~7-8 giây) hoàn toàn không có thêm comment mới mới dừng
      if (stableCount >= 8) break;
    } else {
      stableCount = 0;
    }
    lastCount = count;
    if (opts?.maxComments && count >= opts.maxComments) break;
  }

  debugStats.expandersFound = totalExpandersFound;
  debugStats.expandersClicked = totalExpandersClicked;
  debugStats.repliesCounted = countReplies(doc);
}


