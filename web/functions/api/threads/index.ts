import type { Env } from '../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const sort = (url.searchParams.get('sort') ?? 'newest') as 'newest' | 'hottest' | 'most_comments';
  const limit = Math.min(100, Number(url.searchParams.get('limit') ?? 20));
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0));

  const { listThreads } = await import('../../../src/server/repo/threads');
  const threads = await listThreads(context.env.DB, { sort, limit, offset });

  return Response.json({ threads });
};
