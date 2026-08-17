import type { Env } from '../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const sort = (url.searchParams.get('sort') ?? 'newest') as 'newest' | 'hottest' | 'most_comments';
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 10)));
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const offset = url.searchParams.has('offset')
    ? Math.max(0, Number(url.searchParams.get('offset')))
    : (page - 1) * limit;

  const { listThreads, countThreads } = await import('../../../src/server/repo/threads');
  const [threads, total] = await Promise.all([
    listThreads(context.env.DB, { sort, limit, offset }),
    countThreads(context.env.DB),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return Response.json({
    threads,
    total,
    page,
    limit,
    totalPages,
  });
};
