// Auto-scroll orchestrator: Cuộn thông minh, tự động mở rộng sub-replies ("Xem 9 câu trả lời"),
// tự động vào xem "Câu trả lời đã ẩn" rồi bấm Quay lại (←) về trang chính.

export async function autoScrollUntilStable(doc: Document, opts?: { maxComments?: number; maxScrolls?: number }): Promise<void> {
  const maxScrolls = opts?.maxScrolls ?? 50;
  let stableCount = 0;
  let lastCount = -1;

  // 1. Cuộn trang chính và mở rộng các câu trả lời con ("Xem 9 câu trả lời", "3 replies", v.v.)
  for (let i = 0; i < maxScrolls; i++) {
    await expandSubReplies(doc);

    // Cuộn trang xuống cuối
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

  // 2. Xử lý phần "Câu trả lời đã ẩn" (nếu có) rồi tự động quay lại
  await handleHiddenRepliesIfPresent(doc);
}

// Mở rộng các câu trả lời con cấp 2 ("Xem 9 câu trả lời", "Xem 3 phản hồi")
async function expandSubReplies(doc: Document): Promise<void> {
  const clickables = Array.from(
    doc.querySelectorAll('div[role="button"], button, span, a, div[tabindex="0"]')
  );

  for (const el of clickables) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest('#ts-sidebar-container, header, nav, [role="navigation"]')) continue;

    const txt = el.textContent?.trim().toLowerCase() ?? '';
    if (!txt || txt.length > 80) continue;

    // Bỏ qua các nút hành động (Trả lời, 3 chấm, like, share)
    const ariaLabel = (el.getAttribute('aria-label') ?? '').toLowerCase();
    const title = (el.getAttribute('title') ?? '').toLowerCase();
    if (
      txt === 'trả lời' ||
      txt === 'reply' ||
      txt === 'xem thêm' ||
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
    // "Xem 9 câu trả lời", "9 câu trả lời", "Xem 3 phản hồi", "9 replies", "View 9 replies"
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

// Xử lý mục "Đã ẩn một số thread trả lời. Xem tất cả" -> vào cuộn -> bấm nút Quay lại (←)
async function handleHiddenRepliesIfPresent(doc: Document): Promise<void> {
  // 1. Nếu đang ở sẵn trong trang "Câu trả lời đã ẩn", cuộn rồi bấm nút quay lại
  if (isInHiddenRepliesView(doc)) {
    await scrollPage(doc, 3);
    await clickBackButton(doc);
    return;
  }

  // 2. Tìm nút "Xem tất cả" hoặc "Đã ẩn một số"
  const clickables = Array.from(
    doc.querySelectorAll('div[role="button"], button, span, a, div[tabindex="0"]')
  );

  let hiddenTrigger: HTMLElement | null = null;
  for (const el of clickables) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest('#ts-sidebar-container, header, nav, [role="navigation"]')) continue;

    const txt = el.textContent?.trim().toLowerCase() ?? '';
    if (txt.includes('đã ẩn') || (txt.includes('xem tất cả') && !txt.includes('thông báo'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        hiddenTrigger = el;
        break;
      }
    }
  }

  if (hiddenTrigger) {
    try {
      hiddenTrigger.click();
      await new Promise((r) => setTimeout(r, 600));

      // Cuộn để tải hết các bình luận ẩn
      await scrollPage(doc, 3);

      // Bấm nút Quay lại (←) để trở về trang bài viết chính
      await clickBackButton(doc);
    } catch {}
  }
}

function isInHiddenRepliesView(doc: Document): boolean {
  const headings = Array.from(doc.querySelectorAll('h1, h2, span, div'));
  return headings.some((h) => {
    const t = h.textContent?.trim().toLowerCase() ?? '';
    return t === 'câu trả lời đã ẩn' || t === 'hidden replies';
  });
}

// Bấm nút Quay lại (←) ở góc trên bên trái bài viết Threads
async function clickBackButton(doc: Document): Promise<boolean> {
  // Tìm nút có aria-label="Quay lại" / "Back" hoặc chứa icon mũi tên quay lại
  const backButtons = Array.from(
    doc.querySelectorAll('div[role="button"], button, a')
  );

  for (const btn of backButtons) {
    if (!(btn instanceof HTMLElement)) continue;
    if (btn.closest('#ts-sidebar-container')) continue;

    const label = (btn.getAttribute('aria-label') ?? '').toLowerCase();
    const isBack =
      label === 'quay lại' ||
      label === 'back' ||
      label.includes('quay lại') ||
      label.includes('trở lại') ||
      label.includes('back');

    // Kiểm tra có icon mũi tên trái (back arrow)
    const hasBackSvg = btn.querySelector('svg [d*="M19"], svg polyline, svg path') !== null;

    const rect = btn.getBoundingClientRect();
    // Nút quay lại thường nằm ở góc trên bên trái cột nội dung chính
    if ((isBack || hasBackSvg) && rect.top < 150 && rect.left < 600 && rect.width > 0) {
      try {
        btn.click();
        await new Promise((r) => setTimeout(r, 500));
        return true;
      } catch {}
    }
  }

  // Fallback: Sử dụng history.back() của cửa sổ trình duyệt nếu không tìm thấy nút
  if (typeof doc.defaultView?.history?.back === 'function') {
    doc.defaultView.history.back();
    await new Promise((r) => setTimeout(r, 500));
    return true;
  }

  return false;
}

async function scrollPage(doc: Document, times: number): Promise<void> {
  const w = doc.defaultView;
  for (let i = 0; i < times; i++) {
    if (w) {
      const body = doc.body;
      if (typeof w.scrollTo === 'function') w.scrollTo(0, body.scrollHeight);
      else (w as unknown as { scrollY: number }).scrollY = body.scrollHeight;
    }
    await new Promise((r) => setTimeout(r, 350));
  }
}

function countReplies(doc: Document): number {
  return doc.querySelectorAll(
    'a[href*="/@"], div[data-pressable-container="true"], article, div[role="listitem"], .reply-item'
  ).length;
}
