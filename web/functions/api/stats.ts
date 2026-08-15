import type { Env } from '../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { getOverallStats } = await import('../../src/server/repo/stats');
  return Response.json(await getOverallStats(context.env.DB));
};
