export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ADMIN_SECRET_KEY: string;
  AI_BASE_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function newId(): string {
  return crypto.randomUUID();
}

export function getDB(env: Env): D1Database {
  return env.DB;
}
