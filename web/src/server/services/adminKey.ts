import type { Env } from '../db';

export function isAdminAuthorized(request: Request, env: Env): boolean {
  const key = request.headers.get('X-Admin-Key');
  return !!key && key === env.ADMIN_SECRET_KEY;
}
