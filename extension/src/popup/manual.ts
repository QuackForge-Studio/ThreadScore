import type { ScrapedThread } from '../content/scraper';

// UI (App.tsx) chạy trong 3 context: side panel Chrome thật, iframe nhúng vào trang
// Threads (web_accessible_resources — KHÔNG có chrome.tabs), và đôi khi là popup.
// Thay vì gọi chrome.tabs/scripting trực tiếp (vốn chỉ có ở extension pages/background),
// mọi thao tác tab được chuyển qua background service worker (xem src/batch/tabBridge.ts).

interface BridgeResponse<T> {
  ok: boolean;
  payload?: T;
  error?: string;
}

async function requestBridge<T>(type: string, limit?: number): Promise<T> {
  const resp = (await chrome.runtime.sendMessage({ type, limit })) as BridgeResponse<T> | undefined;
  if (!resp) throw new Error('Background service worker không phản hồi. Hãy kiểm tra extension đã được tải lại chưa.');
  if (!resp.ok) throw new Error(resp.error ?? 'Lỗi không xác định từ background.');
  if (!resp.payload) throw new Error('Background trả về dữ liệu rỗng.');
  return resp.payload;
}

export async function scrapeActiveTab(): Promise<ScrapedThread> {
  return requestBridge<ScrapedThread>('TS_SCRAPE_ACTIVE_TAB');
}

export async function scrapeTestActiveTab(limit: number = 5): Promise<ScrapedThread> {
  return requestBridge<ScrapedThread>('TS_TEST_SCRAPE_ACTIVE_TAB', limit);
}

export async function stopActiveTabScrape(): Promise<void> {
  await chrome.runtime.sendMessage({ type: 'TS_STOP_SCRAPE_ACTIVE_TAB' }).catch(() => {});
}
