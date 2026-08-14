// web/src/server/services/scoringWorker.ts
import { MAX_AI_BATCH, MAX_WORKER_BATCHES, SCORING_LOCK_KEY, SCORING_LOCK_TTL } from '../../shared/constants';
import { labelFromScore } from '../../shared/labels';
import { nowSec, newId } from '../db';
import type { Env } from '../db';
import { listPendingScoring, updateThread } from '../repo/threads';
import { getCommentsByThread } from '../repo/comments';
import { insertScores } from '../repo/scores';
import { scoreCommentsWithAI } from './aiScoring';

export interface ScoringWorkerResult {
  processedThreads: number;
  scoredComments: number;
}

/**
 * Atomically acquire the scoring lock in D1.
 *
 * The upsert either inserts a fresh lock row or, if a row already exists, only
 * re-acquires it when the previous lock has expired. We then read back the row
 * and only consider ourselves the owner when `expires_at` equals our requested
 * expiry — a still-valid lock from another worker keeps its own expiry and we
 * do not acquire.
 */
async function acquireScoringLock(env: Env): Promise<boolean> {
  const now = nowSec();
  const expiresAt = now + SCORING_LOCK_TTL;
  await env.DB.prepare(
    `INSERT INTO locks (name, expires_at) VALUES (?, ?)
     ON CONFLICT(name) DO UPDATE SET expires_at = excluded.expires_at
     WHERE locks.expires_at < ?`
  ).bind(SCORING_LOCK_KEY, expiresAt, now).run();
  const row = await env.DB.prepare('SELECT expires_at FROM locks WHERE name = ?')
    .bind(SCORING_LOCK_KEY).first<{ expires_at: number }>();
  return row?.expires_at === expiresAt;
}

async function releaseScoringLock(env: Env): Promise<void> {
  await env.DB.prepare('DELETE FROM locks WHERE name = ?').bind(SCORING_LOCK_KEY).run();
}

export async function runScoringWorker(env: Env): Promise<ScoringWorkerResult> {
  // Atomic D1-based lock (600s). A concurrent worker that cannot acquire the
  // lock returns immediately without touching any threads.
  if (!(await acquireScoringLock(env))) {
    return { processedThreads: 0, scoredComments: 0 };
  }

  try {
    const threads = await listPendingScoring(env.DB, 5);
    let scoredComments = 0;

    for (const thread of threads) {
      try {
        await updateThread(env.DB, thread.id, { scoring_status: 'scoring' });

        const allComments = await getCommentsByThread(env.DB, thread.id);
        const { results: scoredIds } = await env.DB.prepare(
          'SELECT comment_id FROM ai_scores WHERE comment_id IN (SELECT id FROM comments WHERE thread_id = ?)'
        ).bind(thread.id).all<{ comment_id: string }>();
        const scoredSet = new Set((scoredIds ?? []).map(r => r.comment_id));
        const pendingComments = allComments.filter(c => !scoredSet.has(c.id));

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
      } catch {
        // Crash recovery: reset to pending_scoring so the next run re-picks it.
        await updateThread(env.DB, thread.id, { scoring_status: 'pending_scoring' });
      }
    }

    return { processedThreads: threads.length, scoredComments };
  } finally {
    await releaseScoringLock(env);
  }
}
