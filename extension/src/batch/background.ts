import { runBatch } from './engine';
import './tabBridge'; // đăng ký listener tab cho popup/iframe sidebar
import './alarms'; // đăng ký alarm listener + side panel behavior

// Chạy một vòng batch trong nền (từ chrome.alarms). Không cần UI — log vào storage để popup đọc được.
export async function runBackgroundBatch(): Promise<void> {
  try {
    const { getConfig } = await import('../lib/storage');
    const config = await getConfig();
    if (!config.webUrl || !config.adminKey) return; // chưa cấu hình

    const { getUsage } = await import('../lib/policy');
    const usage = await getUsage();

    const logs: string[] = [];
    const result = await runBatch(config, {
      onProgress: (msg) => {
        logs.push(msg);
        // lưu log mới nhất để popup hiển thị
        void chrome.storage.local.set({ ts_last_bg_log: msg, ts_bg_logs: logs.slice(-50) });
      },
      shouldStop: () => false,
    });

    await chrome.storage.local.set({
      ts_last_bg_result: JSON.stringify({
        at: Date.now(),
        ...result,
      }),
    });
    void usage;
  } catch (e) {
    await chrome.storage.local.set({ ts_last_bg_log: `Lỗi background: ${e instanceof Error ? e.message : e}` });
  }
}
