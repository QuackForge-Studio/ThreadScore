import type { Env } from '../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  
  const { listThreads, countThreads, getThreadActiveDates } = await import('../../../src/server/repo/threads');

  // Nếu client chỉ yêu cầu danh sách các ngày có bài viết
  if (url.searchParams.get('dates_only') === 'true') {
    const dates = await getThreadActiveDates(context.env.DB);
    return Response.json({ dates });
  }

  const sort = (url.searchParams.get('sort') ?? 'newest') as 'newest' | 'hottest' | 'most_comments';
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 10)));
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const offset = url.searchParams.has('offset')
    ? Math.max(0, Number(url.searchParams.get('offset')))
    : (page - 1) * limit;
  const date = url.searchParams.get('date') || undefined;

  const [threads, total] = await Promise.all([
    listThreads(context.env.DB, { sort, limit, offset, date }),
    countThreads(context.env.DB, date),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return Response.json({
    threads,
    total,
    page,
    limit,
    totalPages,
    date: date ?? null,
  });
};
