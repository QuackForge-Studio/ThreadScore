// Auto-scroll orchestrator: Cuộn trang kiên trì, nhận diện & mở rộng toàn bộ câu trả lời con (sub-replies).

import { debugStats } from './debug';

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

// Mở rộng các câu trả lời con (sub-replies) trực tiếp trên từng bình luận
async function expandSubReplies(doc: Document): Promise<{ found: number; clicked: number }> {
  let expandedCount = 0;
  let foundCount = 0;
  const clickables = Array.from(
    doc.querySelectorAll('div[role="button"], button, span[role="button"], a, div[tabindex="0"]')
  );

  for (const el of clickables) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.dataset.tsExpanded === 'true') continue;

    if (isRealSubReplyExpander(el)) {
      foundCount++;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        try {
          el.dataset.tsExpanded = 'true';
          el.click();
          expandedCount++;
          await new Promise((r) => setTimeout(r, 200));
        } catch {}
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
  const maxScrolls = opts?.maxScrolls ?? 60;
  let stableCount = 0;
  let lastCount = -1;
  let totalExpandersFound = 0;
  let totalExpandersClicked = 0;

  for (let i = 0; i < maxScrolls; i++) {
    // 1. Quét và bấm mở rộng tất cả các câu trả lời con thực sự
    const { found, clicked } = await expandSubReplies(doc);
    totalExpandersFound += found;
    totalExpandersClicked += clicked;

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

      // Nếu đang bị chững lại, cuộn nhấp nhả (jitter) ngược lên 350px rồi cuộn xuống để kích hoạt lại trigger nạp của Threads
      if (stableCount >= 2) {
        try {
          w.scrollBy(0, -350);
          await new Promise((r) => setTimeout(r, 180));
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
        w.dispatchEvent(new Event('scroll'));
      } catch {}
    }

    // Chờ mạng nạp dữ liệu: 500ms - 750ms (đủ thời gian cho GraphQL pagination phản hồi)
    const waitTime = clicked > 0 ? 650 : 500 + Math.floor(Math.random() * 250);
    await new Promise((r) => setTimeout(r, waitTime));

    const count = countReplies(doc);
    if (count === lastCount && clicked === 0) {
      stableCount++;
      // Cần 6 lần liên tiếp (~4-5 giây) hoàn toàn không có thêm comment mới mới dừng
      if (stableCount >= 6) break;
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


