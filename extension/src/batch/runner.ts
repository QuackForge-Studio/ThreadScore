import type { ExtensionConfig } from '../lib/storage';
import { pushImport } from '../lib/api';
import type { ScrapedThread } from '../content/scraper';

type Result = { ok: true; commentCount: number } | { ok: false; error: string };

export async function processOneUrl(config: ExtensionConfig, url: string): Promise<Result> {
  let tabId: number | null = null;
  try {
    const tab = await chrome.tabs.create({ url, active: false });
    tabId = tab.id ?? null;
    if (tabId == null) return { ok: false, error: 'Không tạo được tab' };

    // Đợi trang load, tối đa 30 giây
    const deadline = Date.now() + 30_000;
    let status = 'loading';
    while (status !== 'complete' && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 500));
      try {
        status = (await chrome.tabs.get(tabId)).status ?? 'loading';
      } catch { break; }
    }

    const [injected] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => true, // đảm bảo content script được inject (crxjs đã đăng ký qua manifest)
    });
    void injected;

    // Gọi scrape qua message passing tới content script (MV3 không cho import() trong executeScript)
    const payload = await sendScrapeMessage(tabId);
    if (!payload || !payload.comments) return { ok: false, error: 'Scrape thất bại' };

    const pushed = await pushImport(config, payload);
    return { ok: true, commentCount: pushed.commentCount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định' };
  } finally {
    if (tabId != null) await chrome.tabs.remove(tabId).catch(() => null);
  }
}

// Gửi message TS_SCRAPE tới tab, timeout 60s
async function sendScrapeMessage(tabId: number): Promise<ScrapedThread | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Scrape timeout sau 60s')), 60_000);
    chrome.tabs.sendMessage(tabId, { type: 'TS_SCRAPE' }, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      resolve(response ?? null);
    });
  });
}
