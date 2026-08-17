import type { Env } from '../db';

export function isAdminAuthorized(request: Request, env: Env): boolean {
  const headerKey = request.headers.get('X-Admin-Key');
  const key = headerKey ? headerKey.trim() : '';
  const serverKey = env.ADMIN_SECRET_KEY ? String(env.ADMIN_SECRET_KEY).trim() : '';
  return !!key && !!serverKey && key === serverKey;
}
