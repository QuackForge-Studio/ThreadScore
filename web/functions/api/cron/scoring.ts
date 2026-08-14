import type { Env } from '../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = context.request.headers.get('Authorization');
  const secret = (context.env as unknown as Record<string, string>).CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { runScoringWorker } = await import('../../../src/server/services/scoringWorker');
  const result = await runScoringWorker(context.env);
  return Response.json(result);
};
