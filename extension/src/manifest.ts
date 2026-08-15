import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'ThreadScore Importer',
  version: '0.1.2',
  description: 'Import bài viết + comments từ Threads vào ThreadScore',
  permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'notifications', 'sidePanel'],
  host_permissions: ['https://*.threads.net/*'],
  action: { default_title: 'ThreadScore Importer' },
  side_panel: {
    default_path: 'index.html',
  },
  background: { service_worker: 'src/batch/background.ts', type: 'module' },
  content_scripts: [
    {
      matches: ['https://*.threads.net/*'],
      js: ['src/content/scraper.ts'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['index.html', 'assets/*'],
      matches: ['https://*.threads.net/*'],
    },
  ],
});
