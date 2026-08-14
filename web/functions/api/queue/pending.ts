import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { listPendingRequests } = await import('../../../src/server/repo/requests');
  const requests = await listPendingRequests(context.env.DB);
  return Response.json({ requests });
};
