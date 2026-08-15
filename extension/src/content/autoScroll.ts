// Scroll có jitter + tự động click mở rộng bình luận bị ẩn và câu trả lời ẩn (sub-replies).
export async function autoScrollUntilStable(doc: Document, opts?: { maxComments?: number; maxScrolls?: number }): Promise<void> {
  const maxScrolls = opts?.maxScrolls ?? 60;
  let stableCount = 0;
  let lastCount = -1;

  for (let i = 0; i < maxScrolls; i++) {
    // 1. Click các nút mở rộng bình luận bị ẩn chính xác (không click nút Trả lời bài viết)
    await expandHiddenReplies(doc);

    // 2. Cuộn trang xuống cuối
    const w = doc.defaultView;
    if (w) {
      const body = doc.body;
      if (typeof w.scrollTo === 'function') w.scrollTo(0, body.scrollHeight);
      else (w as unknown as { scrollY: number }).scrollY = body.scrollHeight;
    }

    // Jitter: 200-500ms + 10% pause 1s
    const jitter = 200 + Math.floor(Math.random() * 300);
    const occasionalPause = Math.random() < 0.1 ? 800 + Math.floor(Math.random() * 800) : 0;
    await new Promise((r) => setTimeout(r, jitter + occasionalPause));

    const count = countReplies(doc);
    if (count === lastCount) {
      stableCount++;
      if (stableCount >= 3) {
        const expandedMore = await expandHiddenReplies(doc);
        if (!expandedMore) return;
        stableCount = 0;
      }
    } else {
      stableCount = 0;
    }
    lastCount = count;
    if (opts?.maxComments && count >= opts.maxComments) return;
  }
}

// Click mở rộng chính xác các cụm bình luận ẩn (tránh bấm nhầm nút Trả lời / Reply)
async function expandHiddenReplies(doc: Document): Promise<boolean> {
  let clickedAny = false;
  const clickables = Array.from(
    doc.querySelectorAll('div[role="button"], button, span, a, div[tabindex="0"]')
  );

  for (const el of clickables) {
    if (!(el instanceof HTMLElement)) continue;

    // Bỏ qua các phần tử thuộc thanh bên Sidebar của Extension
    if (el.closest('#ts-sidebar-container')) continue;

    const txt = el.textContent?.trim().toLowerCase() ?? '';
    if (!txt || txt.length > 90) continue;

    // LỌC BỎ các nút hành động "Trả lời" / "Reply" (nút để mở ô nhập bình luận)
    const ariaLabel = (el.getAttribute('aria-label') ?? '').toLowerCase();
    if (
      txt === 'trả lời' ||
      txt === 'reply' ||
      txt.startsWith('trả lời @') ||
      txt.startsWith('reply to') ||
      ariaLabel === 'trả lời' ||
      ariaLabel === 'reply' ||
      ariaLabel.includes('viết câu trả lời')
    ) {
      continue;
    }

    // Chỉ nhận diện các cụm từ mở rộng bình luận bị ẩn
    const isExpandTarget =
      txt.includes('xem tất cả') ||
      txt.includes('đã ẩn') ||
      txt.includes('bị ẩn') ||
      txt.includes('xem thêm câu trả lời') ||
      txt.includes('xem các câu trả lời') ||
      txt.includes('xem câu trả lời') ||
      txt.includes('view hidden replies') ||
      txt.includes('show hidden replies') ||
      txt.includes('view replies') ||
      txt.includes('view all replies') ||
      txt.includes('more replies');

    if (isExpandTarget) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        try {
          el.click();
          clickedAny = true;
          await new Promise((r) => setTimeout(r, 250));
        } catch {
          // ignore error
        }
      }
    }
  }
  return clickedAny;
}

function countReplies(doc: Document): number {
  return doc.querySelectorAll(
    'div[data-pressable-container="true"], article, div[role="listitem"], .reply-item'
  ).length;
}
