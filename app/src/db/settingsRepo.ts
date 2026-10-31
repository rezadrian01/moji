import type { AppSettings, NewEntry } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import type { Db } from './db';
import { emitDataChanged } from './events';

const SETTINGS_KEY = 'settings';
const DRAFT_KEY = 'draft';

async function readKv<T>(db: Db, key: string): Promise<T | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return row ? (JSON.parse(row.value) as T) : null;
}

async function writeKv(db: Db, key: string, value: unknown): Promise<void> {
  await db.runAsync(
    `INSERT INTO kv (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [key, JSON.stringify(value)],
  );
}

export async function getSettings(db: Db): Promise<AppSettings> {
  const stored = await readKv<Partial<AppSettings>>(db, SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function updateSettings(db: Db, patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...(await getSettings(db)), ...patch };
  await writeKv(db, SETTINGS_KEY, next);
  emitDataChanged('settings');
  return next;
}

export async function getDraft(db: Db): Promise<Partial<NewEntry> | null> {
  return readKv<Partial<NewEntry>>(db, DRAFT_KEY);
}

export async function saveDraft(db: Db, d: Partial<NewEntry> | null): Promise<void> {
  if (d === null) await db.runAsync('DELETE FROM kv WHERE key = ?', [DRAFT_KEY]);
  else await writeKv(db, DRAFT_KEY, d);
}

export async function wipeAll(db: Db): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of ['entries', 'insights', 'pattern_feedback', 'pending_safety', 'kv']) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
  });
  emitDataChanged('entries');
  emitDataChanged('insights');
  emitDataChanged('feedback');
  emitDataChanged('settings');
}
