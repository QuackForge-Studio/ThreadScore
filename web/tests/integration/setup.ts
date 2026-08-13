import { beforeAll } from 'vitest';
import { applyD1Migrations, env } from 'cloudflare:test';

interface TestMigration {
  name: string;
  queries: string[];
}

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database;
    KV: KVNamespace;
    ADMIN_SECRET_KEY: string;
    TEST_MIGRATIONS: TestMigration[];
  }
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
