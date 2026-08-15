// Scroll có jitter: thời gian giữa các scroll ngẫu nhiên 200-700ms + thỉnh thoảng pause lâu hơn,
// để không tạo pattern đều đặn máy móc (dễ bị phát hiện là bot).
export async function autoScrollUntilStable(doc: Document, opts?: { maxComments?: number; maxScrolls?: number }): Promise<void> {
  const maxScrolls = opts?.maxScrolls ?? 60;
  let stableCount = 0;
  let lastCount = -1;

  for (let i = 0; i < maxScrolls; i++) {
    const w = doc.defaultView;
    if (w) {
      const body = doc.body;
      if (typeof w.scrollTo === 'function') w.scrollTo(0, body.scrollHeight);
      else (w as unknown as { scrollY: number }).scrollY = body.scrollHeight;
    }

    // Jitter: 200-700ms, thỉnh thoảng (10%) pause 1.5-3s như người đọc thật
    const jitter = 200 + Math.floor(Math.random() * 500);
    const occasionalPause = Math.random() < 0.1 ? 1500 + Math.floor(Math.random() * 1500) : 0;
    await new Promise(r => setTimeout(r, jitter + occasionalPause));

    const count = countReplies(doc);
    if (count === lastCount) {
      stableCount++;
      if (stableCount >= 3) return;
    } else {
      stableCount = 0;
    }
    lastCount = count;
    if (opts?.maxComments && count >= opts.maxComments) return;
  }
}

function countReplies(doc: Document): number {
  return doc.querySelectorAll('[data-testid="reply-thread"] .reply-item, [data-testid="reply-thread"] div[role="listitem"]').length;
}
