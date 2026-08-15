// Auto-scroll orchestrator: Cuộn thông minh & mở rộng câu trả lời con (sub-replies) trực tiếp trên bài viết.
// Đã loại bỏ hoàn toàn việc click vào trang "Câu trả lời đã ẩn" để tránh chuyển trang hay bị timeout.

export async function autoScrollUntilStable(doc: Document, opts?: { maxComments?: number; maxScrolls?: number }): Promise<void> {
  const maxScrolls = opts?.maxScrolls ?? 50;
  let stableCount = 0;
  let lastCount = -1;

  for (let i = 0; i < maxScrolls; i++) {
    // 1. Chỉ mở rộng các câu trả lời con trực tiếp ("Xem 9 câu trả lời", "3 replies", v.v.)
    await expandSubReplies(doc);

    // 2. Cuộn trang xuống cuối
    const w = doc.defaultView;
    if (w) {
      const body = doc.body;
      if (typeof w.scrollTo === 'function') w.scrollTo(0, body.scrollHeight);
      else (w as unknown as { scrollY: number }).scrollY = body.scrollHeight;
    }

    const jitter = 250 + Math.floor(Math.random() * 250);
    await new Promise((r) => setTimeout(r, jitter));

    const count = countReplies(doc);
    if (count === lastCount) {
      stableCount++;
      if (stableCount >= 2) break;
    } else {
      stableCount = 0;
    }
    lastCount = count;
    if (opts?.maxComments && count >= opts.maxComments) break;
  }
}

// Mở rộng các câu trả lời con trực tiếp trên bài viết
async function expandSubReplies(doc: Document): Promise<void> {
  const clickables = Array.from(
    doc.querySelectorAll('div[role="button"], button, span, a, div[tabindex="0"]')
  );

  for (const el of clickables) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest('#ts-sidebar-container, header, nav, [role="navigation"]')) continue;

    const txt = el.textContent?.trim().toLowerCase() ?? '';
    if (!txt || txt.length > 80) continue;

    // LỌC BỎ các nút hành động, menu, và BLOCK HOÀN TOÀN các nút chuyển trang "bị ẩn" / "xem tất cả"
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
      ariaLabel.includes('trả lời') ||
      ariaLabel.includes('reply') ||
      ariaLabel.includes('tùy chọn') ||
      ariaLabel.includes('khác') ||
      ariaLabel.includes('more') ||
      ariaLabel.includes('menu') ||
      title.includes('tùy chọn') ||
      title.includes('more')
    ) {
      continue;
    }

    // CHỈ nhận diện các nút chứa số lượng câu trả lời con:
    // Ví dụ: "Xem 9 câu trả lời", "9 câu trả lời", "Xem 3 phản hồi", "9 replies", "View 9 replies"
    const isSubReplyExpander =
      /xem\s+\d+\s+câu\s+trả\s+lời/i.test(txt) ||
      /^\d+\s+câu\s+trả\s+lời/i.test(txt) ||
      /xem\s+\d+\s+phản\s+hồi/i.test(txt) ||
      /^\d+\s+phản\s+hồi/i.test(txt) ||
      /view\s+\d+\s+replies/i.test(txt) ||
      /^\d+\s+replies/i.test(txt) ||
      txt.includes('xem thêm câu trả lời') ||
      txt.includes('xem thêm phản hồi');

    if (isSubReplyExpander) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        try {
          el.click();
          await new Promise((r) => setTimeout(r, 300));
        } catch {}
      }
    }
  }
}

function countReplies(doc: Document): number {
  return doc.querySelectorAll(
    'a[href*="/@"], div[data-pressable-container="true"], article, div[role="listitem"], .reply-item'
  ).length;
}
