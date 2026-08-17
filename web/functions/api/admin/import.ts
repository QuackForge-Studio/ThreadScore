import type { Env } from '../../../src/server/db';
import { ZodError } from 'zod';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await context.request.json().catch(() => null);
  if (!body) return Response.json({ error: 'Invalid JSON' }, { status: 400 });

  const { importThreadPayload } = await import('../../../src/server/services/importService');
  try {
    const result = await importThreadPayload(context.env, body);
    // best-effort scoring kick
    const { runScoringWorker } = await import('../../../src/server/services/scoringWorker');
    await runScoringWorker(context.env).catch(() => null);
    return Response.json(result);
  } catch (e) {
    if (e instanceof ZodError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    return Response.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 });
  }
};
