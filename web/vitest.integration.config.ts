import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const migrations = await readD1Migrations('migrations');

// Build web/functions/ into a single Worker bundle that vitest-pool-workers can
// use as the `main` worker, so `SELF.fetch('https://example.com/api/...')` hits
// the actual Pages Functions handlers. The bundle is gitignored (see .wrangler/).
const root = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.join(root, 'functions');
const built = path.join(root, '.wrangler', 'functions-build', 'worker.js');

function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const stat = statSync(full);
    if (stat.isDirectory()) newest = Math.max(newest, newestMtime(full));
    else newest = Math.max(newest, stat.mtimeMs);
  }
  return newest;
}

if (!existsSync(built) || newestMtime(functionsDir) > statSync(built).mtimeMs) {
  const res = spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'build-functions.cjs')],
    { cwd: root, stdio: 'inherit' },
  );
  if (res.status !== 0) {
    throw new Error(`Failed to build Pages Functions for integration tests (exit ${res.status})`);
  }
}

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        main: '.wrangler/functions-build/worker.js',
        miniflare: {
          bindings: { ADMIN_SECRET_KEY: 'test-secret', TEST_MIGRATIONS: migrations },
          d1Databases: { DB: 'threadscore-test' },
          kvNamespaces: { KV: 'threadscore-test-kv' },
          compatibilityDate: '2024-08-01',
        },
      },
    },
    setupFiles: ['tests/integration/setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
  },
});
