import type { ExtensionConfig } from '../lib/storage';
import { runBatch } from '../batch/engine';
import { fetchRandomRequest } from '../lib/api';
import { processOneUrl } from '../batch/runner';

// Chạy batch từ popup. Trả về kết quả để UI hiển thị.
export async function runBatchFromPopup(config: ExtensionConfig, onProgress: (msg: string) => void): Promise<{ done: number; failed: number }> {
  const result = await runBatch(config, { onProgress, shouldStop: () => false });
  onProgress(`Batch xong: ${result.done} OK, ${result.failed} fail (${result.stoppedReason})`);
  return { done: result.done, failed: result.failed };
}

// Pick 1 bài viết ngẫu nhiên từ queue, mở tab nền, tự cào + tự push, đóng tab.
export async function runRandomFromPopup(config: ExtensionConfig, onProgress: (msg: string) => void): Promise<{ ok: boolean; url?: string; commentCount?: number; error?: string }> {
  const url = await fetchRandomRequest(config);
  if (!url) {
    onProgress('Queue rỗng — không có bài pending nào để cào ngẫu nhiên.');
    return { ok: false, error: 'Queue rỗng' };
  }

  onProgress(`🎲 Pick random: ${url}`);
  const result = await processOneUrl(config, url);
  if (result.ok) {
    onProgress(`✅ Random xong: ${url} — ${result.commentCount} comments (đã push lên web).`);
    return { ok: true, url, commentCount: result.commentCount };
  }
  onProgress(`❌ Random thất bại: ${url} — ${result.error}`);
  return { ok: false, url, error: result.error };
}
