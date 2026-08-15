import type { ExtensionConfig } from '../lib/storage';
import { fetchQueue, reportBatchError } from '../lib/api';
import { processOneUrl } from './runner';
import {
  type UsageState, getUsage, timeUntilAllowed, recordCompleted, scheduleRetry,
  setCooldown, isCooldownActive, getAttempt, getLastError, jitterDelay, sleep,
} from '../lib/policy';

export interface BatchResult {
  done: number;
  failed: number;
  stoppedReason: 'queue-empty' | 'quota' | 'cooldown' | 'error' | 'stopped';
  attempted: number;
}

export interface BatchCallbacks {
  onProgress: (msg: string) => void;
  shouldStop?: () => boolean; // popup đóng / user bấm dừng thì trả true
}

// Chạy tối đa 1 vòng lặp queue. Đã có retry + throttle + quota bên trong.
// Trả về số URL đã xử lý và lý do dừng để caller (popup/background) quyết định có lên lịch lại không.
export async function runBatch(config: ExtensionConfig, cb: BatchCallbacks): Promise<BatchResult> {
  const usage = await getUsage();
  const waitMs = timeUntilAllowed(usage);
  if (waitMs > 0) {
    if (isCooldownActive(usage)) {
      cb.onProgress(`⏸ Đang trong cooldown (nghi bị chặn) — còn ${Math.ceil(waitMs / 60_000)} phút`);
      return { done: 0, failed: 0, attempted: 0, stoppedReason: 'cooldown' };
    }
    cb.onProgress(`⏸ Đã đạt quota giờ/ngày — đợi ${Math.ceil(waitMs / 60_000)} phút`);
    return { done: 0, failed: 0, attempted: 0, stoppedReason: 'quota' };
  }

  const queue = await fetchQueue(config);
  cb.onProgress(`Queue: ${queue.length} request đang chờ`);

  let done = 0;
  let failed = 0;
  let attempted = 0;

  for (let i = 0; i < queue.length; i++) {
    if (cb.shouldStop?.()) return { done, failed, attempted, stoppedReason: 'stopped' };

    const req = queue[i];
    const attempt = getAttempt(usage, req.url);

    // Kiểm tra lại quota trước mỗi URL — queue dài cũng không vượt được giới hạn
    const wait = timeUntilAllowed(usage);
    if (wait > 0) {
      cb.onProgress(`⏸ Hết quota giữa chừng (đã làm ${attempted} URL) — dừng, phần còn lại để lần sau`);
      return { done, failed, attempted, stoppedReason: 'quota' };
    }

    cb.onProgress(`[${i + 1}/${queue.length}] Đang xử lý ${req.url}${attempt > 0 ? ` (lần thử ${attempt + 1})` : ''}`);
    const result = await processOneUrl(config, req.url);

    if (result.ok) {
      done++;
      cb.onProgress(`[${i + 1}/${queue.length}] OK — ${result.commentCount} comments`);
      await recordCompleted(usage, req.url);
      usage.timestamps = (await getUsage()).timestamps; // sync version
    } else {
      // Lỗi bị chặn: dừng toàn bộ batch + cooldown, không retry vội
      if (result.kind === 'login-wall' || result.kind === 'rate-limited') {
        cb.onProgress(`⛔ Nghi bị chặn (${result.kind}) — dừng batch, cooldown ${Math.round(POLICY_COOLDOWN_MIN)} phút`);
        await setCooldown(usage, result.error);
        failed++;
        attempted++;
        return { done, failed, attempted, stoppedReason: 'cooldown' };
      }

      // Lỗi tạm thời: retry theo backoff, không tính vào quota ngay (recordCompleted chỉ khi bỏ hẳn)
      const { retry, delayMs } = await scheduleRetry(usage, req.url, result.error);
      if (retry) {
        cb.onProgress(`[${i + 1}/${queue.length}] LỖI tạm thời — thử lại sau ${Math.round(delayMs / 60_000)} phút: ${result.error}`);
        await sleep(delayMs);
        // sau khi ngủ, kiểm tra lại quota rồi thử lại chính URL này
        const waitAgain = timeUntilAllowed(usage);
        if (waitAgain > 0) {
          cb.onProgress(`⏸ Hết quota sau retry — dừng`);
          return { done, failed, attempted, stoppedReason: 'quota' };
        }
        i--; // chạy lại chính URL này
        continue;
      }

      // Hết lượt retry -> bỏ hẳn
      failed++;
      attempted++;
      cb.onProgress(`[${i + 1}/${queue.length}] LỖI vĩnh viễn sau ${POLICY_MAX_ATTEMPTS} lần: ${result.error}`);
      await recordCompleted(usage, req.url);
      await reportBatchError(config, req.id, getLastError(usage, req.url) ?? result.error).catch(() => null);
      usage.timestamps = (await getUsage()).timestamps;
    }

    // Nghỉ giữa các URL — kể cả sau URL thành công
    if (i < queue.length - 1) {
      const delay = jitterDelay();
      cb.onProgress(`⏳ Nghỉ ${Math.round(delay / 1000)}s cho đỡ bị phát hiện...`);
      await sleep(delay);
      if (cb.shouldStop?.()) return { done, failed, attempted, stoppedReason: 'stopped' };
    }
  }

  cb.onProgress(`Hoàn tất: ${done} thành công, ${failed} thất bại`);
  return { done, failed, attempted, stoppedReason: 'queue-empty' };
}

const POLICY_COOLDOWN_MIN = 180;
const POLICY_MAX_ATTEMPTS = 3;
