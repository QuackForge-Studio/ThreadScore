import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'ThreadScore Importer',
  version: '0.2.0',
  description: 'Import bài viết + comments từ Threads vào ThreadScore',
  permissions: ['storage', 'activeTab', 'tabs', 'scripting', 'alarms', 'notifications', 'sidePanel'],
  host_permissions: [
    'https://*.threads.net/*',
    'https://*.threads.com/*',
    'https://threads.net/*',
    'https://threads.com/*',
  ],
  action: { default_title: 'ThreadScore Importer' },
  side_panel: {
    default_path: 'index.html',
  },
  background: { service_worker: 'src/batch/background.ts', type: 'module' },
  content_scripts: [
    {
      matches: [
        'https://*.threads.net/*',
        'https://*.threads.com/*',
        'https://threads.net/*',
        'https://threads.com/*',
      ],
      js: ['src/content/interceptor.ts'],
      run_at: 'document_start',
      world: 'MAIN',
    },
    {
      matches: [
        'https://*.threads.net/*',
        'https://*.threads.com/*',
        'https://threads.net/*',
        'https://threads.com/*',
      ],
      js: ['src/content/scraper.ts'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['index.html', 'assets/*'],
      matches: [
        'https://*.threads.net/*',
        'https://*.threads.com/*',
        'https://threads.net/*',
        'https://threads.com/*',
      ],
    },
  ],
});
