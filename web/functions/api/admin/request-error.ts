import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await context.request.json().catch(() => null) as { id?: string; error_message?: string } | null;
  if (!body?.id || !body.error_message) {
    return Response.json({ error: 'Thiếu id hoặc error_message' }, { status: 400 });
  }
  const { updateRequestStatus } = await import('../../../src/server/repo/requests');
  await updateRequestStatus(context.env.DB, body.id, 'error', { errorMessage: body.error_message });
  return Response.json({ ok: true });
};
