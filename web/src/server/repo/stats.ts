import type { ThreadRecord } from '../../shared/types';

export async function getOverallStats(db: D1Database): Promise<{
  threads: number;
  comments: number;
  avg_anger: number | null;
  breakdown: { bang_no: number; trung_lap: number; vui_ve: number };
  top_threads: Array<Pick<ThreadRecord, 'id' | 'title' | 'avg_anger_score' | 'total_comments'>>;
}> {
  const [t, c, breakdownRows, avgRow] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM threads`).first<{ n: number }>(),
    db.prepare(`SELECT COUNT(*) AS n FROM comments`).first<{ n: number }>(),
    db.prepare(
      `SELECT label, COUNT(*) AS n FROM ai_scores GROUP BY label`
    ).all<{ label: string; n: number }>(),
    db.prepare(
      `SELECT AVG(avg_anger_score) AS avg FROM threads WHERE scoring_status = 'scored' AND avg_anger_score IS NOT NULL`
    ).first<{ avg: number | null }>(),
  ]);

  const breakdown = { bang_no: 0, trung_lap: 0, vui_ve: 0 };
  for (const row of breakdownRows.results ?? []) {
    if (row.label === 'BÙNG NỔ') breakdown.bang_no = row.n;
    else if (row.label === 'TRUNG LẬP') breakdown.trung_lap = row.n;
    else if (row.label === 'VUI VẺ') breakdown.vui_ve = row.n;
  }

  const { results } = await db.prepare(
    `SELECT id, title, avg_anger_score, total_comments FROM threads
     WHERE scoring_status = 'scored' AND avg_anger_score IS NOT NULL
     ORDER BY avg_anger_score DESC LIMIT 3`
  ).all<Pick<ThreadRecord, 'id' | 'title' | 'avg_anger_score' | 'total_comments'>>();

  return {
    threads: t?.n ?? 0,
    comments: c?.n ?? 0,
    avg_anger: avgRow?.avg != null ? Math.round(avgRow.avg * 10) / 10 : null,
    breakdown,
    top_threads: results ?? [],
  };
}
