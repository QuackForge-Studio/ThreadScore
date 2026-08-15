// Scroll có jitter + tự động click mở rộng bình luận bị ẩn và câu trả lời ẩn (sub-replies).
export async function autoScrollUntilStable(doc: Document, opts?: { maxComments?: number; maxScrolls?: number }): Promise<void> {
  const maxScrolls = opts?.maxScrolls ?? 60;
  let stableCount = 0;
  let lastCount = -1;

  for (let i = 0; i < maxScrolls; i++) {
    // 1. Tự động click mở rộng các nút "Xem tất cả", "Đã ẩn một số thread trả lời", "View replies", v.v.
    await expandHiddenReplies(doc);

    // 2. Cuộn trang xuống cuối
    const w = doc.defaultView;
    if (w) {
      const body = doc.body;
      if (typeof w.scrollTo === 'function') w.scrollTo(0, body.scrollHeight);
      else (w as unknown as { scrollY: number }).scrollY = body.scrollHeight;
    }

    // Jitter: 200-600ms + 10% pause 1-2s như người thật
    const jitter = 200 + Math.floor(Math.random() * 400);
    const occasionalPause = Math.random() < 0.1 ? 1000 + Math.floor(Math.random() * 1000) : 0;
    await new Promise((r) => setTimeout(r, jitter + occasionalPause));

    const count = countReplies(doc);
    if (count === lastCount) {
      stableCount++;
      if (stableCount >= 3) {
        // Thử click mở rộng một lần cuối trước khi kết thúc
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

// Click tự động mở rộng các bình luận bị ẩn / trả lời bình luận
async function expandHiddenReplies(doc: Document): Promise<boolean> {
  let clickedAny = false;
  const clickables = Array.from(
    doc.querySelectorAll('div[role="button"], button, span, a, div[tabindex="0"]')
  );

  for (const el of clickables) {
    if (!(el instanceof HTMLElement)) continue;
    const txt = el.textContent?.trim().toLowerCase() ?? '';
    if (!txt || txt.length > 90) continue;

    const isExpandTarget =
      txt.includes('xem tất cả') ||
      txt.includes('xem thêm') ||
      txt.includes('bị ẩn') ||
      txt.includes('câu trả lời') ||
      txt.includes('trả lời') ||
      txt.includes('view all') ||
      txt.includes('view replies') ||
      txt.includes('hidden replies') ||
      txt.includes('more replies') ||
      txt.includes('show replies');

    if (isExpandTarget) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        try {
          el.click();
          clickedAny = true;
          await new Promise((r) => setTimeout(r, 300));
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
