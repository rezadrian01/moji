/** @jest-environment ./src/domain/jakartaEnvironment.js */
import type { Db } from '@/db/db';
import { listEntries } from '@/db/entriesRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { computePatterns } from '@/domain/patterns';
import { previousWeek } from '@/domain/period';

import { seedSampleData } from './seed';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Rabu 12:00 WIB, Senin 00:30 WIB (batas minggu), Minggu 23:00 WIB
const NOWS = [
  new Date('2026-10-28T05:00:00Z'),
  new Date('2026-11-01T17:30:00Z'),
  new Date('2026-11-01T16:00:00Z'),
];

describe('seedSampleData', () => {
  it.each(NOWS)('membuat >= 21 catatan dalam 21 hari terakhir (%s)', async (now) => {
    const count = await seedSampleData(db, now, lcg(1));
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 20);
    const entries = await listEntries(db, { from: from.toISOString() });
    expect(count).toBeGreaterThanOrEqual(21);
    expect(entries).toHaveLength(count);
    expect(entries.every((e) => new Date(e.createdAt).getTime() <= now.getTime())).toBe(true);
    expect(new Set(entries.map((e) => e.createdAt.slice(0, 10))).size).toBe(21);
  });

  it.each(NOWS)('pola akademik -> mood rendah lolos untuk minggu lalu (%s)', async (now) => {
    await seedSampleData(db, now, lcg(7));
    const entries = await listEntries(db, {});
    const summary = computePatterns(entries, previousWeek(now), []);
    expect(summary.enoughData).toBe(true);
    expect(summary.patterns.map((p) => p.key)).toContain('low_mood_context:akademik');
  });

  it('deterministik dengan rand tetap', async () => {
    const now = NOWS[0];
    await seedSampleData(db, now, lcg(3));
    const a = (await listEntries(db, {})).map(({ id: _id, ...rest }) => rest);
    const db2 = await createTestDb();
    await seedSampleData(db2, now, lcg(3));
    const b = (await listEntries(db2, {})).map(({ id: _id, ...rest }) => rest);
    expect(b).toEqual(a);
  });
});
