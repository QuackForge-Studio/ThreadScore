import { describe, it, expect, vi, beforeEach } from 'vitest';

const createdTabs: number[] = [];
const SCRAPED = {
  url: 'https://www.threads.net/@x/post/C1',
  title: 'T', content: null, author_username: 'x', author_name: null, posted_at: null,
  comments: [{ external_id: null, author_username: 'u', author_name: null, text: 'đồ ngu', like_count: 0, posted_at: null }],
};
vi.stubGlobal('chrome', {
  tabs: {
    create: vi.fn(async () => { const id = createdTabs.length + 100; createdTabs.push(id); return { id }; }),
    remove: vi.fn(async (id: number) => { createdTabs.splice(createdTabs.indexOf(id), 1); }),
    get: vi.fn(async () => ({ status: 'complete' })),
    sendMessage: vi.fn(async (_tabId: number, _msg: unknown, cb: (resp: unknown) => void) => cb(SCRAPED)),
  },
  scripting: { executeScript: vi.fn(async () => [{ result: true }]) },
  runtime: { lastError: undefined },
});

vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
  if (url.includes('/api/admin/import')) return new Response(JSON.stringify({ threadId: 't1', isUpdate: false, commentCount: 1 }), { status: 200 });
  return new Response('{}', { status: 404 });
}));

import { processOneUrl } from '../src/batch/runner';

describe('processOneUrl', () => {
  beforeEach(() => { createdTabs.length = 0; });

  it('opens tab, scrapes via message, pushes import, closes tab', async () => {
    const cfg = { webUrl: 'https://ts.example.com', adminKey: 'k' };
    const result = await processOneUrl(cfg, 'https://www.threads.net/@x/post/C1');
    expect(result).toEqual({ ok: true, commentCount: 1 });
    expect(chrome.tabs.create).toHaveBeenCalled();
    expect(chrome.tabs.sendMessage).toHaveBeenCalled();
    expect(chrome.tabs.remove).toHaveBeenCalled();
  });
});
