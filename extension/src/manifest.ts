import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'ThreadScore Importer',
  version: '0.1.0',
  description: 'Import bài viết + comments từ Threads vào ThreadScore',
  permissions: ['storage', 'activeTab', 'scripting'],
  host_permissions: ['https://*.threads.net/*'],
  action: { default_popup: 'index.html', default_title: 'ThreadScore Importer' },
  content_scripts: [
    {
      matches: ['https://*.threads.net/*'],
      js: ['src/content/scraper.ts'],
      run_at: 'document_idle',
    },
  ],
});
