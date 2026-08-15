import type { ExtensionConfig } from '../lib/storage';
import { runBatch } from '../batch/engine';

// Chạy batch từ popup. Trả về kết quả để UI hiển thị.
export async function runBatchFromPopup(config: ExtensionConfig, onProgress: (msg: string) => void): Promise<{ done: number; failed: number }> {
  const result = await runBatch(config, { onProgress, shouldStop: () => false });
  onProgress(`Batch xong: ${result.done} OK, ${result.failed} fail (${result.stoppedReason})`);
  return { done: result.done, failed: result.failed };
}
