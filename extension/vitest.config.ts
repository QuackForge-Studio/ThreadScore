import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      // scraper dùng HTMLElement/DOM — cần jsdom
      ['tests/scraper.test.ts', 'jsdom'],
    ],
  },
});
