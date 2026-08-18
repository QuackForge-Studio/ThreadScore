import type { Env } from '../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const { getThreadById, getAdjacentThreads } = await import('../../../src/server/repo/threads');
  const { getCommentsByThread } = await import('../../../src/server/repo/comments');
  const { getScoresForThread } = await import('../../../src/server/repo/scores');
  const { getVoteCounts } = await import('../../../src/server/repo/votes');
  const { listUserCommentsByThread } = await import('../../../src/server/repo/userComments');

  const thread = await getThreadById(context.env.DB, id);
  if (!thread) return Response.json({ error: 'Không tìm thấy bài viết' }, { status: 404 });

  const [comments, scores, userComments, adjacent] = await Promise.all([
    getCommentsByThread(context.env.DB, id),
    getScoresForThread(context.env.DB, id),
    listUserCommentsByThread(context.env.DB, id),
    getAdjacentThreads(context.env.DB, thread),
  ]);

  const scoreMap = new Map(scores.map(s => [s.comment_id, s]));
  const commentsWithScores = comments.map(c => ({ ...c, score: scoreMap.get(c.id) ?? null }));

  const voteCounts: Record<string, { correct: number; incorrect: number }> = {};
  for (const c of comments) voteCounts[c.id] = await getVoteCounts(context.env.DB, c.id);

  const breakdown = thread.score_breakdown ? JSON.parse(thread.score_breakdown) : null;

  return Response.json({ thread, comments: commentsWithScores, breakdown, user_comments: userComments, vote_counts: voteCounts, adjacent });
};
