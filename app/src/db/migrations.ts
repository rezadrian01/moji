import type { Db } from './db';

const V1 = `
CREATE TABLE entries (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  mood INTEGER NOT NULL,
  note TEXT,
  contexts TEXT NOT NULL DEFAULT '[]',
  experiences TEXT NOT NULL DEFAULT '[]',
  copings TEXT NOT NULL DEFAULT '[]',
  ai_suggested TEXT NOT NULL DEFAULT '[]',
  pending_suggestions TEXT,
  safety_shown_level TEXT NOT NULL DEFAULT 'none'
);
CREATE INDEX idx_entries_created_at ON entries (created_at);
CREATE TABLE insights (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  kind TEXT NOT NULL,
  week_key TEXT,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  summary TEXT NOT NULL,
  text TEXT NOT NULL,
  pattern_texts TEXT NOT NULL DEFAULT '{}',
  questions TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL,
  reflection TEXT
);
CREATE UNIQUE INDEX idx_insights_week_key ON insights (week_key) WHERE week_key IS NOT NULL;
CREATE TABLE pattern_feedback (
  insight_id TEXT NOT NULL,
  pattern_key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (insight_id, pattern_key)
);
CREATE TABLE pending_safety (
  entry_id TEXT PRIMARY KEY NOT NULL,
  level TEXT NOT NULL
);
CREATE TABLE kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

const MIGRATIONS: string[] = [V1];

export async function migrate(db: Db): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
