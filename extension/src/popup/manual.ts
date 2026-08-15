import type { ScrapedThread } from '../content/scraper';

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  let tab = tabs[0];
  if (!tab?.id) {
    const allTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tab = allTabs[0];
  }

  if (!tab?.id) throw new Error('Không tìm thấy tab đang mở.');

  const url = tab.url ?? '';
  if (!url.includes('threads.net') && !url.includes('threads.com')) {
    throw new Error('Vui lòng mở một trang bài viết trên Threads (threads.net hoặc threads.com) để quét!');
  }

  if (chrome.scripting) {
    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        files: ['src/content/scraper.ts'],
      })
      .catch(() => {});
  }

  return tab;
}

export async function scrapeActiveTab(): Promise<ScrapedThread> {
  const tab = await getActiveTab();

  const payload = await new Promise<ScrapedThread | null>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Thao tác quá thời gian (Timeout 90s).')), 90_000);
    chrome.tabs.sendMessage(tab.id!, { type: 'TS_SCRAPE' }, (response) => {
      clearTimeout(timer);
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error('Chưa kết nối được trang Threads. Hãy bấm F5 làm mới lại trang Threads và thử lại!'));
        return;
      }
      resolve(response ?? null);
    });
  });

  if (!payload || !payload.comments) {
    throw new Error('Không tìm thấy nội dung bài viết Threads trên trang hiện tại.');
  }

  return payload;
}

export async function scrapeTestActiveTab(limit: number = 5): Promise<ScrapedThread> {
  const tab = await getActiveTab();

  const payload = await new Promise<ScrapedThread | null>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Thao tác quá thời gian (Timeout 30s).')), 30_000);
    chrome.tabs.sendMessage(tab.id!, { type: 'TS_TEST_SCRAPE', limit }, (response) => {
      clearTimeout(timer);
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error('Chưa kết nối được trang Threads. Hãy bấm F5 làm mới lại trang Threads và thử lại!'));
        return;
      }
      resolve(response ?? null);
    });
  });

  if (!payload || !payload.comments) {
    throw new Error('Không tìm thấy nội dung bình luận để test.');
  }

  return payload;
}
