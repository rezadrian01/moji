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

function toMs(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`Tanggal tidak valid: ${iso}`);
  return ms;
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
  await db.runAsync(
    `INSERT INTO entries (id, created_at, created_at_ms, updated_at, mood, note, contexts, experiences,
       copings, ai_suggested, pending_suggestions, safety_shown_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.createdAt,
      toMs(entry.createdAt),
      entry.updatedAt,
      entry.mood,
      entry.note,
      JSON.stringify(entry.contexts),
      JSON.stringify(entry.experiences),
      JSON.stringify(entry.copings),
      JSON.stringify(entry.aiSuggested),
      null,
      entry.safetyShownLevel,
    ],
  );
  emitDataChanged('entries');
  return entry;
}

export async function getEntry(db: Db, id: string): Promise<Entry | null> {
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', [id]);
  return row ? fromRow(row) : null;
}

type Patch = Partial<Omit<Entry, 'id' | 'createdAt'>> & { createdAt?: string };

export async function updateEntry(
  db: Db,
  id: string,
  patch: Patch,
  now: Date,
): Promise<Entry | null> {
  const sets: string[] = ['updated_at = ?'];
  const params: unknown[] = [toLocalIso(now)];
  const add = (col: string, value: unknown) => {
    sets.push(`${col} = ?`);
    params.push(value);
  };
  const json = (v: unknown) => JSON.stringify(v);
  if (patch.createdAt !== undefined) {
    add('created_at', patch.createdAt);
    add('created_at_ms', toMs(patch.createdAt));
  }
  if (patch.mood !== undefined) add('mood', patch.mood);
  if (patch.note !== undefined) add('note', patch.note);
  if (patch.contexts !== undefined) add('contexts', json(patch.contexts));
  if (patch.experiences !== undefined) add('experiences', json(patch.experiences));
  if (patch.copings !== undefined) add('copings', json(patch.copings));
  if (patch.aiSuggested !== undefined) add('ai_suggested', json(patch.aiSuggested));
  if (patch.pendingSuggestions !== undefined) {
    add('pending_suggestions', patch.pendingSuggestions ? json(patch.pendingSuggestions) : null);
  }
  if (patch.safetyShownLevel !== undefined) add('safety_shown_level', patch.safetyShownLevel);
  if (patch.updatedAt !== undefined) params[0] = patch.updatedAt;
  params.push(id);
  const { changes } = await db.runAsync(`UPDATE entries SET ${sets.join(', ')} WHERE id = ?`, params);
  if (changes === 0) return null;
  emitDataChanged('entries');
  return getEntry(db, id);
}

export async function deleteEntry(db: Db, id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM pending_safety WHERE entry_id = ?', [id]);
    await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
  });
  emitDataChanged('entries');
}

/** `from` inklusif, `to` eksklusif; ISO dengan offset apa pun, dibandingkan sebagai instan. */
export async function listEntries(
  db: Db,
  range: { from?: string; to?: string },
): Promise<Entry[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (range.from !== undefined) {
    where.push('created_at_ms >= ?');
    params.push(toMs(range.from));
  }
  if (range.to !== undefined) {
    where.push('created_at_ms < ?');
    params.push(toMs(range.to));
  }
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT * FROM entries${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at_ms DESC, rowid DESC`,
    params,
  );
  return rows.map(fromRow);
}
