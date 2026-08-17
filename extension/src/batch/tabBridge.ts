// Cầu nối tab dành cho popup/iframe sidebar.
//
// Vấn đề: UI (App.tsx) vừa chạy trong side panel Chrome thật, vừa chạy trong iframe
// được content script nhúng vào trang Threads (web_accessible_resources). Trong iframe
// đó `chrome.tabs` / `chrome.scripting` KHÔNG tồn tại (chỉ có chrome.runtime), nên
// gọi chrome.tabs.query trực tiếp sẽ văng "Cannot read properties of undefined (reading 'query')".
//
// Giải pháp: mọi thao tác tab chạy trong background service worker (nơi có đủ API),
// popup/iframe chỉ gọi chrome.runtime.sendMessage.

import type { ScrapedThread } from '../content/scraper';

function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0] ?? null;
      if (tab?.id) {
        resolve(tab);
        return;
      }
      // Fallback: cửa sổ được focus gần nhất (ví dụ popup mở trên tab khác cửa sổ)
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs2) => {
        resolve(tabs2[0] ?? null);
      });
    });
  });
}

function validateThreadsUrl(url: string | undefined): boolean {
  return !!url && (url.includes('threads.net') || url.includes('threads.com'));
}

// Gửi message tới content script của tab với timeout (chỉ định rõ frameId: 0 là top frame)
function sendToTab<T>(tabId: number, message: { type: string; limit?: number }, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Thao tác quá thời gian (Timeout).')), timeoutMs);
    chrome.tabs.sendMessage(tabId, message, { frameId: 0 }, (response) => {
      const err = chrome.runtime.lastError;
      if (err || response === undefined) {
        // Fallback gửi không frameId
        chrome.tabs.sendMessage(tabId, message, (response2) => {
          clearTimeout(timer);
          const err2 = chrome.runtime.lastError;
          if (err2) {
            reject(new Error('Chưa kết nối được trang Threads. Hãy bấm F5 làm mới lại trang Threads và thử lại!'));
            return;
          }
          resolve(response2 as T);
        });
        return;
      }
      clearTimeout(timer);
      resolve(response as T);
    });
  });
}

async function handleScrapeActive(
  messageType: 'TS_SCRAPE' | 'TS_TEST_SCRAPE',
  limit: number | undefined
): Promise<ScrapedThread> {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('Không tìm thấy tab đang mở.');
  if (!validateThreadsUrl(tab.url)) {
    throw new Error('Vui lòng mở một trang bài viết trên Threads (threads.net hoặc threads.com) để quét!');
  }

  // Content scripts (interceptor MAIN world + scraper) đã được manifest inject sẵn
  // khi trang load. Nếu trang mở trước khi cài extension, sendMessage sẽ báo lỗi
  // "Could not establish connection" → user F5 là đủ.

  const payload = await sendToTab<ScrapedThread | null>(
    tab.id,
    { type: messageType, ...(limit != null ? { limit } : {}) },
    messageType === 'TS_TEST_SCRAPE' ? 30_000 : 90_000
  );

  if (!payload || !payload.comments) {
    throw new Error(
      messageType === 'TS_TEST_SCRAPE'
        ? 'Không tìm thấy nội dung bình luận để test.'
        : 'Không tìm thấy nội dung bài viết Threads trên trang hiện tại.'
    );
  }
  return payload;
}

chrome.runtime.onMessage.addListener(
  (message: { type?: string; limit?: number }, _sender, sendResponse) => {
    if (message.type === 'TS_SCRAPE_ACTIVE_TAB') {
      handleScrapeActive('TS_SCRAPE', undefined)
        .then((payload) => sendResponse({ ok: true, payload }))
        .catch((e) => sendResponse({ ok: false, error: e instanceof Error ? e.message : 'Scrape lỗi' }));
      return true; // async response
    }
    if (message.type === 'TS_TEST_SCRAPE_ACTIVE_TAB') {
      handleScrapeActive('TS_TEST_SCRAPE', message.limit ?? 5)
        .then((payload) => sendResponse({ ok: true, payload }))
        .catch((e) => sendResponse({ ok: false, error: e instanceof Error ? e.message : 'Test scrape lỗi' }));
      return true;
    }
    if (message.type === 'TS_STOP_SCRAPE_ACTIVE_TAB') {
      getActiveTab().then((tab) => {
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'TS_STOP_SCRAPE' }, { frameId: 0 }, () => {});
        }
        sendResponse({ ok: true });
      });
      return true;
    }
    if (message.type === 'TS_GET_TAB_INFO') {
      getActiveTab().then((tab) => {
        const isThreads = validateThreadsUrl(tab?.url);
        let username: string | null = null;
        if (tab?.url) {
          const match = tab.url.match(/threads\.(?:net|com)\/@([^/?#]+)/i);
          if (match) username = match[1];
        }
        sendResponse({
          ok: true,
          payload: {
            title: tab?.title || '',
            url: tab?.url || '',
            isThreads,
            username,
          },
        });
      });
      return true;
    }
    return false;
  }
);
