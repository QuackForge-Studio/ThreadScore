import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { runScoringWorker } = await import('../../../src/server/services/scoringWorker');
  const result = await runScoringWorker(context.env);
  return Response.json(result);
};
