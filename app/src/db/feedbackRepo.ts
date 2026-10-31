import type { FeedbackValue } from '../domain/types';
import { toLocalIso } from './db';
import type { Db } from './db';
import { emitDataChanged } from './events';

export async function setFeedback(
  db: Db,
  insightId: string,
  patternKey: string,
  value: FeedbackValue,
  now: Date,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO pattern_feedback (insight_id, pattern_key, value, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (insight_id, pattern_key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [insightId, patternKey, value, toLocalIso(now)],
  );
  emitDataChanged('feedback');
}

export async function getFeedbackForInsight(
  db: Db,
  insightId: string,
): Promise<Record<string, FeedbackValue>> {
  const rows = await db.getAllAsync<{ pattern_key: string; value: FeedbackValue }>(
    'SELECT pattern_key, value FROM pattern_feedback WHERE insight_id = ?',
    [insightId],
  );
  return Object.fromEntries(rows.map((r) => [r.pattern_key, r.value]));
}

/** Key yang feedback terakhirnya (lintas insight) 'tidak_sesuai'. */
export async function rejectedPatternKeys(db: Db): Promise<string[]> {
  const rows = await db.getAllAsync<{ pattern_key: string; value: FeedbackValue }>(
    'SELECT pattern_key, value FROM pattern_feedback ORDER BY updated_at ASC, rowid ASC',
  );
  const latest = new Map<string, FeedbackValue>();
  for (const r of rows) latest.set(r.pattern_key, r.value);
  return [...latest].filter(([, v]) => v === 'tidak_sesuai').map(([k]) => k);
}
