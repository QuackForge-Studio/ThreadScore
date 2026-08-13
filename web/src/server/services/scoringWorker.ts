// web/src/server/services/scoringWorker.ts
import { MAX_AI_BATCH, MAX_WORKER_BATCHES, SCORING_LOCK_KEY } from '../../shared/constants';
import { labelFromScore } from '../../shared/labels';
import { nowSec, newId } from '../db';
import type { Env } from '../db';
import { listPendingScoring, updateThread } from '../repo/threads';
import { getCommentsByThread } from '../repo/comments';
import { hasScoresForComment, insertScores } from '../repo/scores';
import { scoreCommentsWithAI } from './aiScoring';

export interface ScoringWorkerResult {
  processedThreads: number;
  scoredComments: number;
}

export async function runScoringWorker(env: Env): Promise<ScoringWorkerResult> {
  // KV lock: get-then-put with a 600s TTL.
  // NOTE: miniflare 3.20240718 + @cloudflare/workers-types 4.20240806 do not support
  // the conditional `onlyIf: 'no_exists'` KV put from the brief, so we fall back to a
  // get-then-put lock (documented deviation). The TTL guarantees the lock self-releases
  // even if a worker crashes before the finally block.
  const existing = await env.KV.get(SCORING_LOCK_KEY);
  if (existing !== null) return { processedThreads: 0, scoredComments: 0 };
  await env.KV.put(SCORING_LOCK_KEY, String(nowSec()), { expirationTtl: 600 });

  try {
    const threads = await listPendingScoring(env.DB, 5);
    let scoredComments = 0;

    for (const thread of threads) {
      await updateThread(env.DB, thread.id, { scoring_status: 'scoring' });

      const allComments = await getCommentsByThread(env.DB, thread.id);
      const pendingComments: typeof allComments = [];
      for (const c of allComments) {
        if (!(await hasScoresForComment(env.DB, c.id))) pendingComments.push(c);
      }

      const context = `${thread.title ?? ''}\n${thread.content ?? ''}`.trim();
      let batchCount = 0;
      for (let start = 0; start < pendingComments.length && batchCount < MAX_WORKER_BATCHES; start += MAX_AI_BATCH, batchCount++) {
        const slice = pendingComments.slice(start, start + MAX_AI_BATCH);
        const results = await scoreCommentsWithAI(env, slice.map(c => ({ id: c.id, text: c.text, context })));
        await insertScores(env.DB, results.map((r, j) => ({
          id: newId(),
          comment_id: slice[j].id,
          score: r.score,
          label: r.label,
          reason: r.reason,
          model: r.model,
          created_at: nowSec(),
        })));
        scoredComments += slice.length;
      }

      const allDone = pendingComments.length <= batchCount * MAX_AI_BATCH;
      if (allDone) {
        const { results } = await env.DB.prepare(
          'SELECT score, label FROM ai_scores WHERE comment_id IN (SELECT id FROM comments WHERE thread_id = ?)'
        ).bind(thread.id).all<{ score: number; label: string }>();
        const rows = results ?? [];
        const avg = rows.length > 0 ? rows.reduce((s, r) => s + r.score, 0) / rows.length : null;
        const breakdown = { bang_no: 0, trung_lap: 0, vui_ve: 0 };
        for (const r of rows) {
          const lbl = labelFromScore(r.score);
          if (lbl === 'BÙNG NỔ') breakdown.bang_no++;
          else if (lbl === 'TRUNG LẬP') breakdown.trung_lap++;
          else breakdown.vui_ve++;
        }
        await updateThread(env.DB, thread.id, {
          scoring_status: 'scored',
          avg_anger_score: avg,
          score_breakdown: JSON.stringify(breakdown),
        });
      }
      // else: giữ 'scoring', lần chạy sau xử lý tiếp
    }

    return { processedThreads: threads.length, scoredComments };
  } finally {
    await env.KV.delete(SCORING_LOCK_KEY);
  }
}
