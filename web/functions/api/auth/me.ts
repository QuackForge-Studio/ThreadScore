import type { Env } from '../../../src/server/db';
import { getSession } from '../../../src/server/services/session';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getSession(context.env, context.request);
  return Response.json({ user: user ? { provider: user.provider, name: user.name } : null });
};
