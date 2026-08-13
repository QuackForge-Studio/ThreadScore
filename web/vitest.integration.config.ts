import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

const migrations = await readD1Migrations('migrations');

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
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
