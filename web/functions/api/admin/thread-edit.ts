import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';
import { getThreadById, updateThread } from '../../../src/server/repo/threads';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Khóa quản trị (Secret Key) không hợp lệ hoặc chưa được cung cấp!' }, { status: 401 });
  }

  try {
    const body = (await context.request.json()) as {
      id?: string;
      title?: string | null;
      content?: string | null;
      author_username?: string | null;
      author_name?: string | null;
    };

    const id = body.id?.trim();
    if (!id) {
      return Response.json({ error: 'Thiếu ID bài viết (thread id) cần chỉnh sửa.' }, { status: 400 });
    }

    const existing = await getThreadById(context.env.DB, id);
    if (!existing) {
      return Response.json({ error: 'Không tìm thấy bài viết với ID được chỉ định.' }, { status: 404 });
    }

    const cleanUsername = body.author_username
      ? body.author_username.replace(/^@+/, '').trim()
      : null;

    const patch = {
      title: body.title !== undefined ? (body.title ? body.title.trim() : null) : existing.title,
      content: body.content !== undefined ? (body.content ? body.content.trim() : null) : existing.content,
      author_username: cleanUsername !== undefined ? cleanUsername : existing.author_username,
      author_name: body.author_name !== undefined ? (body.author_name ? body.author_name.trim() : null) : existing.author_name,
    };

    await updateThread(context.env.DB, id, patch);
    const updated = await getThreadById(context.env.DB, id);

    return Response.json({ ok: true, thread: updated, message: 'Đã cập nhật bài viết thành công!' });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Lỗi cập nhật bài viết' }, { status: 500 });
  }
};
