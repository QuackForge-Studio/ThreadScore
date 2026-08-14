import type { ExtensionConfig } from '../lib/storage';
import { fetchQueue, reportBatchError } from '../lib/api';
import { processOneUrl } from '../batch/runner';

export async function runBatch(config: ExtensionConfig, onProgress: (msg: string) => void): Promise<{ done: number; failed: number }> {
  const queue = await fetchQueue(config);
  onProgress(`Tải queue: ${queue.length} request đang chờ`);

  let done = 0;
  let failed = 0;
  for (let i = 0; i < queue.length; i++) {
    const req = queue[i];
    onProgress(`[${i + 1}/${queue.length}] Đang xử lý ${req.url}`);
    const result = await processOneUrl(config, req.url);
    if (result.ok) {
      done++;
      onProgress(`[${i + 1}/${queue.length}] OK — ${result.commentCount} comments`);
    } else {
      failed++;
      onProgress(`[${i + 1}/${queue.length}] LỖI — ${result.error}`);
      await reportBatchError(config, req.id, result.error).catch(() => null);
    }
  }
  onProgress(`Hoàn tất: ${done} thành công, ${failed} thất bại`);
  return { done, failed };
}
