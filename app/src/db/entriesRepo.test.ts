/** @jest-environment node */
import type { Db } from './db';
import { createTestDb } from './testing/sqljsDb';
import { createEntry, deleteEntry, getEntry, listEntries, updateEntry } from './entriesRepo';
import { addPendingSafety, takePendingSafety } from './pendingSafetyRepo';
import { onDataChanged } from './events';

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const t = (iso: string) => new Date(iso);

describe('entriesRepo', () => {
  it('round-trips every field including custom tags', async () => {
    const created = await createEntry(
      db,
      {
        mood: 2,
        note: 'capek banget',
        createdAt: '2026-10-30T08:00:00+07:00',
        contexts: [
          { category: 'akademik', subTag: null },
          { category: 'internal', subTag: 'custom:kangen rumah' },
        ],
        experiences: [{ dimension: 'fisik', tag: 'custom:pegal' }],
        copings: [{ tag: 'tidur', helped: 'ya' }],
      },
      t('2026-10-30T01:00:05Z'),
    );
    const loaded = await getEntry(db, created.id);
    expect(loaded).toEqual(created);
    expect(loaded).toMatchObject({
      mood: 2,
      note: 'capek banget',
      createdAt: '2026-10-30T08:00:00+07:00',
      contexts: [
        { category: 'akademik', subTag: null },
        { category: 'internal', subTag: 'custom:kangen rumah' },
      ],
      experiences: [{ dimension: 'fisik', tag: 'custom:pegal' }],
      copings: [{ tag: 'tidur', helped: 'ya' }],
      aiSuggested: [],
      pendingSuggestions: null,
      safetyShownLevel: 'none',
    });
    expect(created.id).toEqual(expect.any(String));
  });

  it('defaults optional fields and uses now for createdAt', async () => {
    const e = await createEntry(db, { mood: 4 }, t('2026-10-30T01:00:00Z'));
    expect(e.note).toBeNull();
    expect(e.contexts).toEqual([]);
    expect(new Date(e.createdAt).getTime()).toBe(t('2026-10-30T01:00:00Z').getTime());
    expect(e.updatedAt).toBe(e.createdAt);
  });

  it('persists patch fields such as pendingSuggestions and safetyShownLevel', async () => {
    const e = await createEntry(db, { mood: 1 }, t('2026-10-30T01:00:00Z'));
    const updated = await updateEntry(
      db,
      e.id,
      {
        pendingSuggestions: { contexts: ['akademik'], experiences: ['x'], copings: [] },
        safetyShownLevel: 'concern',
        aiSuggested: ['x'],
        note: 'baru',
      },
      t('2026-10-30T02:00:00Z'),
    );
    expect(await getEntry(db, e.id)).toEqual(updated);
    expect(updated?.safetyShownLevel).toBe('concern');
    expect(updated?.pendingSuggestions?.contexts).toEqual(['akademik']);
  });

  it('lists newest first and respects from (inclusive) and to (exclusive)', async () => {
    const mk = (createdAt: string) =>
      createEntry(db, { mood: 3, createdAt }, t('2026-10-31T00:00:00Z'));
    const a = await mk('2026-10-26T00:00:00+07:00');
    const b = await mk('2026-10-27T00:00:00+07:00');
    const c = await mk('2026-10-28T00:00:00+07:00');
    expect((await listEntries(db, {})).map((e) => e.id)).toEqual([c.id, b.id, a.id]);
    const ranged = await listEntries(db, {
      from: '2026-10-27T00:00:00+07:00',
      to: '2026-10-28T00:00:00+07:00',
    });
    expect(ranged.map((e) => e.id)).toEqual([b.id]);
  });

  it('updateEntry changes updatedAt but not createdAt unless given', async () => {
    const e = await createEntry(
      db,
      { mood: 3, createdAt: '2026-10-30T08:00:00+07:00' },
      t('2026-10-30T01:00:00Z'),
    );
    const u1 = await updateEntry(db, e.id, { mood: 5 }, t('2026-10-30T03:00:00Z'));
    expect(u1?.mood).toBe(5);
    expect(u1?.createdAt).toBe('2026-10-30T08:00:00+07:00');
    expect(new Date(u1!.updatedAt).getTime()).toBe(t('2026-10-30T03:00:00Z').getTime());
    const u2 = await updateEntry(
      db,
      e.id,
      { createdAt: '2026-10-29T08:00:00+07:00' },
      t('2026-10-30T04:00:00Z'),
    );
    expect(u2?.createdAt).toBe('2026-10-29T08:00:00+07:00');
  });

  it('updateEntry returns null for unknown id', async () => {
    expect(await updateEntry(db, 'nope', { mood: 2 }, new Date())).toBeNull();
  });

  it('deleteEntry removes the entry and its pending safety', async () => {
    const e = await createEntry(db, { mood: 1 }, new Date());
    await addPendingSafety(db, e.id, 'urgent');
    await deleteEntry(db, e.id);
    expect(await getEntry(db, e.id)).toBeNull();
    expect(await takePendingSafety(db)).toBeNull();
  });

  it('emits data change for entries on writes', async () => {
    const seen: string[] = [];
    const off = onDataChanged((tbl) => seen.push(tbl));
    const e = await createEntry(db, { mood: 3 }, new Date());
    await updateEntry(db, e.id, { mood: 4 }, new Date());
    await deleteEntry(db, e.id);
    off();
    expect(seen).toEqual(['entries', 'entries', 'entries']);
  });
});
