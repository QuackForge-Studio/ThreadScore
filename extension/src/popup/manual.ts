import type { ScrapedThread } from '../content/scraper';

export async function scrapeActiveTab(): Promise<ScrapedThread> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('Không tìm thấy tab đang mở');

  const payload = await new Promise<ScrapedThread | null>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Scrape timeout sau 60s')), 60_000);
    chrome.tabs.sendMessage(tab.id!, { type: 'TS_SCRAPE' }, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      resolve(response ?? null);
    });
  });

  if (!payload || !payload.comments) throw new Error('Scrape thất bại — hãy mở một bài Threads');
  return payload;
}
