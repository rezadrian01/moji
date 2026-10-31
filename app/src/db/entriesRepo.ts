import type { Entry, NewEntry } from '../domain/types';
import { newId, toLocalIso } from './db';
import type { Db } from './db';
import { emitDataChanged } from './events';

interface EntryRow {
  id: string;
  created_at: string;
  updated_at: string;
  mood: number;
  note: string | null;
  contexts: string;
  experiences: string;
  copings: string;
  ai_suggested: string;
  pending_suggestions: string | null;
  safety_shown_level: string;
}

function fromRow(r: EntryRow): Entry {
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    mood: r.mood as Entry['mood'],
    note: r.note,
    contexts: JSON.parse(r.contexts),
    experiences: JSON.parse(r.experiences),
    copings: JSON.parse(r.copings),
    aiSuggested: JSON.parse(r.ai_suggested),
    pendingSuggestions: r.pending_suggestions ? JSON.parse(r.pending_suggestions) : null,
    safetyShownLevel: r.safety_shown_level as Entry['safetyShownLevel'],
  };
}

async function insertOrReplace(db: Db, e: Entry): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO entries (id, created_at, updated_at, mood, note, contexts, experiences,
       copings, ai_suggested, pending_suggestions, safety_shown_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.id,
      e.createdAt,
      e.updatedAt,
      e.mood,
      e.note,
      JSON.stringify(e.contexts),
      JSON.stringify(e.experiences),
      JSON.stringify(e.copings),
      JSON.stringify(e.aiSuggested),
      e.pendingSuggestions ? JSON.stringify(e.pendingSuggestions) : null,
      e.safetyShownLevel,
    ],
  );
}

export async function createEntry(db: Db, input: NewEntry, now: Date): Promise<Entry> {
  const stamp = toLocalIso(now);
  const entry: Entry = {
    id: newId(),
    createdAt: input.createdAt ?? stamp,
    updatedAt: stamp,
    mood: input.mood,
    note: input.note ?? null,
    contexts: input.contexts ?? [],
    experiences: input.experiences ?? [],
    copings: input.copings ?? [],
    aiSuggested: [],
    pendingSuggestions: null,
    safetyShownLevel: 'none',
  };
  await insertOrReplace(db, entry);
  emitDataChanged('entries');
  return entry;
}

export async function getEntry(db: Db, id: string): Promise<Entry | null> {
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', [id]);
  return row ? fromRow(row) : null;
}

export async function updateEntry(
  db: Db,
  id: string,
  patch: Partial<Omit<Entry, 'id' | 'createdAt'>> & { createdAt?: string },
  now: Date,
): Promise<Entry | null> {
  const existing = await getEntry(db, id);
  if (!existing) return null;
  const next: Entry = { ...existing, ...patch, id, updatedAt: toLocalIso(now) };
  await insertOrReplace(db, next);
  emitDataChanged('entries');
  return next;
}

export async function deleteEntry(db: Db, id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM pending_safety WHERE entry_id = ?', [id]);
    await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
  });
  emitDataChanged('entries');
}

export async function listEntries(
  db: Db,
  range: { from?: string; to?: string },
): Promise<Entry[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (range.from !== undefined) {
    where.push('created_at >= ?');
    params.push(range.from);
  }
  if (range.to !== undefined) {
    where.push('created_at < ?');
    params.push(range.to);
  }
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT * FROM entries${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`,
    params,
  );
  return rows.map(fromRow);
}
