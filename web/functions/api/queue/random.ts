import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

// Trả 1 request pending ngẫu nhiên chưa được cào (chưa tồn tại trong bảng threads).
// Dùng cho tính năng "pick random bài viết rồi tự cào + push" của extension.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listPendingRequests } = await import('../../../src/server/repo/requests');
  const { getThreadByUrl } = await import('../../../src/server/repo/threads');

  const requests = await listPendingRequests(context.env.DB);
  // Lọc các request đã có thread (đã cào xong nhưng chưa cập nhật status)
  const available: { url: string }[] = [];
  for (const r of requests) {
    const thread = await getThreadByUrl(context.env.DB, r.url);
    if (!thread) available.push({ url: r.url });
  }

  if (available.length === 0) {
    return Response.json({ url: null });
  }

  const pick = available[Math.floor(Math.random() * available.length)];
  return Response.json({ url: pick.url });
};
