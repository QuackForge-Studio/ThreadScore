import type { ExtensionConfig } from '../lib/storage';
import { pushImport } from '../lib/api';
import type { ScrapedThread } from '../content/scraper';
import { ScrapeError, detectBlockFromUrl, detectBlockFromText, looksLikeThreadPage } from './errors';

export type Result =
  | { ok: true; commentCount: number }
  | { ok: false; error: string; kind?: 'login-wall' | 'rate-limited' | 'transient' | 'permanent' };

// Timeout tải tab: 30s; bị chặn thường load rất nhanh sang login/checkpoint nên không cần chờ đủ 30s
export async function processOneUrl(config: ExtensionConfig, url: string): Promise<Result> {
  let tabId: number | null = null;
  try {
    const tab = await chrome.tabs.create({ url, active: false });
    tabId = tab.id ?? null;
    if (tabId == null) return { ok: false, error: 'Không tạo được tab', kind: 'transient' };

    // Vòng lặp chờ load, nhưng mỗi lần poll đều kiểm tra URL hiện tại xem có bị redirect sang login/checkpoint không
    const deadline = Date.now() + 30_000;
    let status = 'loading';
    while (status !== 'complete' && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 500));
      let current: chrome.tabs.Tab;
      try {
        current = await chrome.tabs.get(tabId);
      } catch {
        return { ok: false, error: 'Không thể kiểm tra trạng thái tab', kind: 'transient' };
      }
      status = current.status ?? 'loading';
      const blocked = current.url ? detectBlockFromUrl(current.url) : null;
      if (blocked) return { ok: false, error: `Bị chặn (redirect: ${blocked})`, kind: blocked };
    }

    if (status !== 'complete') {
      return { ok: false, error: 'Tab không load xong sau 30s', kind: 'transient' };
    }

    // Xác nhận có thể inject script + kiểm tra nội dung trang (tránh trang home/explore không phải bài)
    const [{ result: injected }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const text = (document.body?.innerText ?? '').slice(0, 2000);
        const url = location.href;
        return { text, url };
      },
    });
    void injected;

    if (!looksLikeThreadPage(injected.url, injected.text)) {
      const block = detectBlockFromText(injected.text);
      if (block) return { ok: false, error: `Bị chặn (${block})`, kind: block };
      return { ok: false, error: 'Trang không phải bài Threads (có thể đã redirect)', kind: 'transient' };
    }

    // Gọi scrape qua message passing tới content script (MV3 không cho import() trong executeScript)
    const payload = await sendScrapeMessage(tabId);
    if (!payload || !payload.comments) {
      return { ok: false, error: 'Scrape thất bại — không lấy được dữ liệu', kind: 'transient' };
    }

    const pushed = await pushImport(config, payload);
    return { ok: true, commentCount: pushed.commentCount };
  } catch (e) {
    if (e instanceof ScrapeError) return { ok: false, error: e.message, kind: e.kind };
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định', kind: 'transient' };
  } finally {
    if (tabId != null) await chrome.tabs.remove(tabId).catch(() => null);
  }
}

// Gửi message TS_SCRAPE tới tab, timeout 60s
function sendScrapeMessage(tabId: number): Promise<ScrapedThread | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ScrapeError('transient', 'Scrape timeout sau 60s')), 60_000);
    chrome.tabs.sendMessage(tabId, { type: 'TS_SCRAPE' }, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        reject(new ScrapeError('transient', chrome.runtime.lastError.message ?? 'Không kết nối được content script'));
        return;
      }
      resolve(response ?? null);
    });
  });
}
