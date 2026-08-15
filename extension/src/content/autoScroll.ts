// Auto-scroll orchestrator: Cuộn trang kiên trì, nhận diện & mở rộng toàn bộ câu trả lời con (sub-replies).

export async function autoScrollUntilStable(doc: Document, opts?: { maxComments?: number; maxScrolls?: number }): Promise<void> {
  const maxScrolls = opts?.maxScrolls ?? 80;
  let stableCount = 0;
  let lastCount = -1;

  for (let i = 0; i < maxScrolls; i++) {
    // 1. Quét và bấm mở rộng tất cả các câu trả lời con chưa được mở
    const expandedCount = await expandSubReplies(doc);

    // 2. Cuộn trang xuống cuối để kích hoạt nạp thêm bình luận
    const w = doc.defaultView;
    if (w) {
      const body = doc.body;
      if (typeof w.scrollTo === 'function') w.scrollTo(0, body.scrollHeight);
      else (w as unknown as { scrollY: number }).scrollY = body.scrollHeight;
    }

    // Chờ mạng nạp dữ liệu: 450 - 750ms
    const waitTime = expandedCount > 0 ? 800 : 500 + Math.floor(Math.random() * 250);
    await new Promise((r) => setTimeout(r, waitTime));

    const count = countReplies(doc);
    if (count === lastCount && expandedCount === 0) {
      stableCount++;
      // Cần ít nhất 5 lần liên tiếp không có comment mới mới dừng hẳn
      if (stableCount >= 5) break;
    } else {
      stableCount = 0;
    }
    lastCount = count;
    if (opts?.maxComments && count >= opts.maxComments) break;
  }
}

// Mở rộng các câu trả lời con (sub-replies) trực tiếp trên từng bình luận
async function expandSubReplies(doc: Document): Promise<number> {
  let expandedCount = 0;
  const clickables = Array.from(
    doc.querySelectorAll('div[role="button"], button, span, a, div[tabindex="0"]')
  );

  for (const el of clickables) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest('#ts-sidebar-container, header, nav, [role="navigation"]')) continue;

    // Bỏ qua nếu phần tử này đã được click mở rộng trước đó
    if (el.dataset.tsExpanded === 'true') continue;

    const txt = el.textContent?.trim().toLowerCase() ?? '';
    if (!txt || txt.length > 80) continue;

    // LỌC BỎ: Nút hành động, menu 3 chấm, và block chuyển sang trang "bị ẩn"
    const ariaLabel = (el.getAttribute('aria-label') ?? '').toLowerCase();
    const title = (el.getAttribute('title') ?? '').toLowerCase();

    if (
      txt === 'trả lời' ||
      txt === 'reply' ||
      txt === 'xem thêm' ||
      txt.includes('đã ẩn') ||
      txt.includes('bị ẩn') ||
      txt.includes('xem tất cả') ||
      txt.includes('hidden replies') ||
      txt.startsWith('trả lời @') ||
      txt.startsWith('reply to') ||
      ariaLabel === 'trả lời' ||
      ariaLabel === 'reply' ||
      ariaLabel.includes('tùy chọn') ||
      ariaLabel.includes('khác') ||
      ariaLabel.includes('more') ||
      ariaLabel.includes('menu') ||
      title.includes('tùy chọn') ||
      title.includes('more')
    ) {
      continue;
    }

    // NHẬN DIỆN CÂU TRẢ LỜI CON:
    // "Xem 9 câu trả lời", "9 câu trả lời", "9 phản hồi", "1 phản hồi", "Xem 3 phản hồi", "9 replies", "1 reply", "View 9 replies"
    const isSubReplyExpander =
      /\d+\s+câu\s+trả\s+lời/i.test(txt) ||
      /\d+\s+trả\s+lời/i.test(txt) ||
      /\d+\s+phản\s+hồi/i.test(txt) ||
      /\d+\s+replies/i.test(txt) ||
      /\d+\s+reply/i.test(txt) ||
      /xem\s+.*câu\s+trả\s+lời/i.test(txt) ||
      /xem\s+.*phản\s+hồi/i.test(txt) ||
      /view\s+.*replies/i.test(txt);

    if (isSubReplyExpander) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        try {
          el.dataset.tsExpanded = 'true';
          el.click();
          expandedCount++;
          await new Promise((r) => setTimeout(r, 350));
        } catch {}
      }
    }
  }

  return expandedCount;
}

function countReplies(doc: Document): number {
  return doc.querySelectorAll(
    'a[href*="/@"], div[data-pressable-container="true"], article, div[role="listitem"], .reply-item'
  ).length;
}
