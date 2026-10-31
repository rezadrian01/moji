import type { Insight } from '../domain/types';
import { newId, toLocalIso } from './db';
import type { Db } from './db';
import { emitDataChanged } from './events';

interface InsightRow {
  id: string;
  created_at: string;
  kind: string;
  week_key: string | null;
  period_start: string;
  period_end: string;
  summary: string;
  text: string;
  pattern_texts: string;
  questions: string;
  source: string;
  reflection: string | null;
}

function fromRow(r: InsightRow): Insight {
  return {
    id: r.id,
    createdAt: r.created_at,
    kind: r.kind as Insight['kind'],
    weekKey: r.week_key,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    summary: JSON.parse(r.summary),
    text: r.text,
    patternTexts: JSON.parse(r.pattern_texts),
    questions: JSON.parse(r.questions),
    source: r.source as Insight['source'],
    reflection: r.reflection,
  };
}

export async function saveInsight(
  db: Db,
  insight: Omit<Insight, 'id' | 'createdAt'>,
  now: Date,
): Promise<Insight> {
  const saved: Insight = { ...insight, id: newId(), createdAt: toLocalIso(now) };
  await db.runAsync(
    `INSERT INTO insights (id, created_at, kind, week_key, period_start, period_end, summary, text,
       pattern_texts, questions, source, reflection)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      saved.id,
      saved.createdAt,
      saved.kind,
      saved.weekKey,
      saved.periodStart,
      saved.periodEnd,
      JSON.stringify(saved.summary),
      saved.text,
      JSON.stringify(saved.patternTexts),
      JSON.stringify(saved.questions),
      saved.source,
      saved.reflection,
    ],
  );
  emitDataChanged('insights');
  return saved;
}

export async function getInsight(db: Db, id: string): Promise<Insight | null> {
  const row = await db.getFirstAsync<InsightRow>('SELECT * FROM insights WHERE id = ?', [id]);
  return row ? fromRow(row) : null;
}

export async function listInsights(db: Db): Promise<Insight[]> {
  const rows = await db.getAllAsync<InsightRow>(
    'SELECT * FROM insights ORDER BY created_at DESC, rowid DESC',
  );
  return rows.map(fromRow);
}

export async function latestInsight(db: Db): Promise<Insight | null> {
  const row = await db.getFirstAsync<InsightRow>(
    'SELECT * FROM insights ORDER BY created_at DESC, rowid DESC LIMIT 1',
  );
  return row ? fromRow(row) : null;
}

export async function hasWeeklyInsight(db: Db, weekKey: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT 1 AS n FROM insights WHERE kind = 'weekly' AND week_key = ? LIMIT 1",
    [weekKey],
  );
  return row !== null;
}

export async function setReflection(db: Db, id: string, text: string | null): Promise<void> {
  await db.runAsync('UPDATE insights SET reflection = ? WHERE id = ?', [text, id]);
  emitDataChanged('insights');
}
