import { describe, it, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';

const chromeStub = vi.hoisted(() => ({
  runtime: { onMessage: { addListener: () => {} }, getURL: (() => 'chrome-extension://x/index.html') as () => string },
}));
vi.stubGlobal('chrome', chromeStub);
vi.mock('../src/content/autoScroll', () => ({
  autoScrollUntilStable: vi.fn().mockResolvedValue(undefined),
  isEndOfCommentsReached: vi.fn().mockReturnValue(false),
}));

import { highlightCommentsOnPage } from '../src/content/scraper';

describe('debug highlight', () => {
  it('inspect', () => {
    const html = `
    <!DOCTYPE html><html><body>
      <div data-pressable-container="true">
        <div><a href="/@haian_0409">haian_0409</a></div>
        <div><span dir="auto">main</span></div>
      </div>
      <div data-pressable-container="true">
        <div><a href="/@pistart_uh">pistart_uh</a></div>
        <div><span dir="auto">comment</span></div>
      </div>
    </body></html>`;
    const doc = new JSDOM(html, { url: 'https://www.threads.net/@haian_0409/post/X' }).window.document;

    const links = doc.querySelectorAll('a[href*="/@"]');
    console.log('LINKS:', Array.from(links).map((l) => l.getAttribute('href')));

    const summary = highlightCommentsOnPage(
      doc,
      [
        {
          external_id: '1',
          author_username: 'pistart_uh',
          author_name: null,
          text: 'comment',
          like_count: 0,
          posted_at: null,
          parent_id: null,
        },
      ],
      { mainAuthorUsername: 'haian_0409' }
    );
    console.log('SUMMARY:', JSON.stringify(summary));
    expect(summary.highlighted).toBe(1);
  });
});
