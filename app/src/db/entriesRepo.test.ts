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

  it('treats Z bounds and +07:00 bounds as the same instants', async () => {
    const mk = (createdAt: string) =>
      createEntry(db, { mood: 3, createdAt }, t('2026-10-31T00:00:00Z'));
    const sun = await mk('2026-10-25T20:00:00+07:00'); // 13:00Z, before Monday WIB
    const monStart = await mk('2026-10-26T00:00:00+07:00'); // exactly 17:00Z Sunday
    const monLater = await mk('2026-10-26T09:30:00.500+07:00');
    const nextMon = await mk('2026-11-02T00:00:00+07:00'); // exactly `to`
    const viaZ = await listEntries(db, {
      from: '2026-10-25T17:00:00.000Z',
      to: '2026-11-01T17:00:00.000Z',
    });
    const viaWib = await listEntries(db, {
      from: '2026-10-26T00:00:00+07:00',
      to: '2026-11-02T00:00:00+07:00',
    });
    expect(viaZ.map((e) => e.id)).toEqual([monLater.id, monStart.id]);
    expect(viaWib.map((e) => e.id)).toEqual(viaZ.map((e) => e.id));
    expect(viaZ.map((e) => e.id)).not.toContain(sun.id);
    expect(viaZ.map((e) => e.id)).not.toContain(nextMon.id);
  });

  it('includes an entry exactly at from with or without milliseconds', async () => {
    const e = await createEntry(
      db,
      { mood: 3, createdAt: '2026-10-26T00:00:00+07:00' },
      t('2026-10-31T00:00:00Z'),
    );
    for (const from of ['2026-10-26T00:00:00+07:00', '2026-10-25T17:00:00.000Z']) {
      expect((await listEntries(db, { from })).map((x) => x.id)).toEqual([e.id]);
    }
  });

  it('orders by instant across mixed offsets', async () => {
    const mk = (createdAt: string) =>
      createEntry(db, { mood: 3, createdAt }, t('2026-10-31T00:00:00Z'));
    const a = await mk('2026-10-26T10:00:00+07:00'); // 03:00Z
    const b = await mk('2026-10-26T04:00:00Z'); // later instant, smaller-looking string
    expect((await listEntries(db, {})).map((e) => e.id)).toEqual([b.id, a.id]);
  });

  it('re-indexes a backdated entry when createdAt changes', async () => {
    const e = await createEntry(
      db,
      { mood: 3, createdAt: '2026-10-30T08:00:00+07:00' },
      t('2026-10-31T00:00:00Z'),
    );
    await updateEntry(db, e.id, { createdAt: '2026-10-20T08:00:00+07:00' }, new Date());
    const hits = await listEntries(db, {
      from: '2026-10-20T00:00:00+07:00',
      to: '2026-10-21T00:00:00+07:00',
    });
    expect(hits.map((x) => x.id)).toEqual([e.id]);
  });

  it('updateEntry returns null and keeps a deleted row deleted', async () => {
    const e = await createEntry(db, { mood: 3 }, new Date());
    await deleteEntry(db, e.id);
    expect(await updateEntry(db, e.id, { mood: 4 }, new Date())).toBeNull();
    expect(await getEntry(db, e.id)).toBeNull();
  });

  it('keeps both of two different-field patches applied back to back', async () => {
    const e = await createEntry(db, { mood: 3 }, new Date());
    await Promise.all([
      updateEntry(db, e.id, { note: 'a' }, new Date()),
      updateEntry(db, e.id, { aiSuggested: ['x'] }, new Date()),
    ]);
    const loaded = await getEntry(db, e.id);
    expect(loaded?.note).toBe('a');
    expect(loaded?.aiSuggested).toEqual(['x']);
  });

  it('drops patch keys whose value is undefined', async () => {
    const e = await createEntry(db, { mood: 3, note: 'tetap' }, new Date());
    const u = await updateEntry(db, e.id, { mood: undefined, note: undefined }, new Date());
    expect(u?.mood).toBe(3);
    expect(u?.note).toBe('tetap');
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
