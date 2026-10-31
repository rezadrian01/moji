/** @jest-environment node */
import type { Insight } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import type { Db } from './db';
import { createTestDb } from './testing/sqljsDb';
import {
  DuplicateWeeklyInsightError,
  getInsight,
  hasWeeklyInsight,
  latestInsight,
  listInsights,
  saveInsight,
  setReflection,
} from './insightsRepo';
import { getFeedbackForInsight, rejectedPatternKeys, setFeedback } from './feedbackRepo';
import { addPendingSafety, takePendingSafety } from './pendingSafetyRepo';
import { getDraft, getSettings, saveDraft, updateSettings, wipeAll } from './settingsRepo';
import { createEntry } from './entriesRepo';
import { onDataChanged } from './events';


let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const baseInsight = (over: Partial<Omit<Insight, 'id' | 'createdAt'>> = {}) => ({
  kind: 'weekly' as const,
  weekKey: '2026-10-26' as string | null,
  periodStart: '2026-10-26T00:00:00+07:00',
  periodEnd: '2026-11-02T00:00:00+07:00',
  summary: {
    periodStart: '2026-10-26T00:00:00+07:00',
    periodEnd: '2026-11-02T00:00:00+07:00',
    entryCount: 5,
    moodDistribution: { 1: 0, 2: 1, 3: 2, 4: 1, 5: 1 },
    patterns: [],
    enoughData: true,
  },
  text: 'Minggu ini cukup beragam.',
  patternTexts: { 'low_mood_context:akademik': 'teks' },
  questions: ['Apa yang membantu?'],
  source: 'local' as const,
  reflection: null,
  ...over,
});

describe('insightsRepo', () => {
  it('saves and reads back an insight; hasWeeklyInsight true afterwards', async () => {
    expect(await hasWeeklyInsight(db, '2026-10-26')).toBe(false);
    const saved = await saveInsight(db, baseInsight(), new Date('2026-11-02T01:00:00Z'));
    expect(await hasWeeklyInsight(db, '2026-10-26')).toBe(true);
    expect(await hasWeeklyInsight(db, '2026-10-19')).toBe(false);
    expect(await getInsight(db, saved.id)).toEqual(saved);
    expect(saved.summary.moodDistribution[3]).toBe(2);
  });

  it('rejects a second weekly insight with the same weekKey', async () => {
    await saveInsight(db, baseInsight(), new Date());
    await expect(saveInsight(db, baseInsight(), new Date())).rejects.toThrow();
  });

  it('throws DuplicateWeeklyInsightError for a duplicate weekKey', async () => {
    await saveInsight(db, baseInsight(), new Date());
    await expect(saveInsight(db, baseInsight(), new Date())).rejects.toBeInstanceOf(
      DuplicateWeeklyInsightError,
    );
  });

  it('allows many on-demand insights with null weekKey', async () => {
    await saveInsight(db, baseInsight({ kind: 'on_demand', weekKey: null }), new Date());
    await saveInsight(db, baseInsight({ kind: 'on_demand', weekKey: null }), new Date());
    expect(await listInsights(db)).toHaveLength(2);
  });

  it('lists newest first and latestInsight returns the newest', async () => {
    expect(await latestInsight(db)).toBeNull();
    await saveInsight(db, baseInsight({ weekKey: '2026-10-19' }), new Date('2026-10-26T01:00:00Z'));
    const newer = await saveInsight(db, baseInsight(), new Date('2026-11-02T01:00:00Z'));
    expect((await listInsights(db))[0].id).toBe(newer.id);
    expect((await latestInsight(db))?.id).toBe(newer.id);
  });

  it('setReflection stores and clears text', async () => {
    const s = await saveInsight(db, baseInsight(), new Date());
    await setReflection(db, s.id, 'catatanku');
    expect((await getInsight(db, s.id))?.reflection).toBe('catatanku');
    await setReflection(db, s.id, null);
    expect((await getInsight(db, s.id))?.reflection).toBeNull();
  });
});

describe('feedbackRepo', () => {
  it('latest wins by instant even with mixed offsets and missing milliseconds', async () => {
    // Later instant (04:00Z) but lexicographically smaller than the earlier one (03:00Z string "10:00+07").
    await setFeedback(db, 'i1', 'k', 'tidak_sesuai', new Date('2026-11-01T03:00:00Z'));
    await setFeedback(db, 'i2', 'k', 'sesuai', new Date('2026-11-01T04:00:00Z'));
    expect(await rejectedPatternKeys(db)).toEqual([]);
    await setFeedback(db, 'i3', 'k', 'tidak_sesuai', new Date('2026-11-01T05:00:00Z'));
    expect(await rejectedPatternKeys(db)).toEqual(['k']);
  });

  it('upserts per (insight, key) and reads as a record', async () => {
    await setFeedback(db, 'i1', 'k1', 'sesuai', new Date('2026-11-01T00:00:00Z'));
    await setFeedback(db, 'i1', 'k1', 'sebagian', new Date('2026-11-01T01:00:00Z'));
    await setFeedback(db, 'i1', 'k2', 'tidak_sesuai', new Date('2026-11-01T02:00:00Z'));
    expect(await getFeedbackForInsight(db, 'i1')).toEqual({ k1: 'sebagian', k2: 'tidak_sesuai' });
    expect(await getFeedbackForInsight(db, 'other')).toEqual({});
  });

  it('rejectedPatternKeys uses the latest feedback per key', async () => {
    await setFeedback(db, 'i1', 'a', 'tidak_sesuai', new Date('2026-11-01T00:00:00Z'));
    await setFeedback(db, 'i1', 'b', 'tidak_sesuai', new Date('2026-11-01T00:00:00Z'));
    await setFeedback(db, 'i2', 'b', 'sesuai', new Date('2026-11-02T00:00:00Z'));
    await setFeedback(db, 'i2', 'c', 'sesuai', new Date('2026-11-02T00:00:00Z'));
    await setFeedback(db, 'i3', 'c', 'tidak_sesuai', new Date('2026-11-03T00:00:00Z'));
    expect((await rejectedPatternKeys(db)).sort()).toEqual(['a', 'c']);
  });
});

describe('pendingSafetyRepo', () => {
  it('returns urgent over concern, then the table is empty', async () => {
    await addPendingSafety(db, 'e1', 'concern');
    await addPendingSafety(db, 'e2', 'urgent');
    expect(await takePendingSafety(db)).toEqual({ entryId: 'e2', level: 'urgent' });
    expect(await takePendingSafety(db)).toBeNull();
  });

  it('returns null when empty', async () => {
    expect(await takePendingSafety(db)).toBeNull();
  });

  it('upgrading level for the same entry keeps a single row', async () => {
    await addPendingSafety(db, 'e1', 'concern');
    await addPendingSafety(db, 'e1', 'urgent');
    expect(await takePendingSafety(db)).toEqual({ entryId: 'e1', level: 'urgent' });
    expect(await takePendingSafety(db)).toBeNull();
  });
});

describe('settingsRepo', () => {
  it('returns DEFAULT_SETTINGS on an empty db', async () => {
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it('updateSettings merges patches and persists', async () => {
    const next = await updateSettings(db, { aiEnabled: true, reminderTime: '20:00' });
    expect(next).toEqual({ ...DEFAULT_SETTINGS, aiEnabled: true, reminderTime: '20:00' });
    await updateSettings(db, { weeklyNudgeDay: 3 });
    expect(await getSettings(db)).toEqual({
      ...DEFAULT_SETTINGS,
      aiEnabled: true,
      reminderTime: '20:00',
      weeklyNudgeDay: 3,
    });
  });

  it('saves, reads and clears a draft', async () => {
    expect(await getDraft(db)).toBeNull();
    await saveDraft(db, { mood: 2, note: 'setengah jadi' });
    expect(await getDraft(db)).toEqual({ mood: 2, note: 'setengah jadi' });
    await saveDraft(db, null);
    expect(await getDraft(db)).toBeNull();
  });

  it('saveDraft emits a settings change', async () => {
    const seen: string[] = [];
    const off = onDataChanged((t) => seen.push(t));
    await saveDraft(db, { mood: 2 });
    await saveDraft(db, null);
    off();
    expect(seen).toEqual(['settings', 'settings']);
  });

  it('wipeAll empties every table', async () => {
    const e = await createEntry(db, { mood: 2 }, new Date());
    await saveInsight(db, baseInsight(), new Date());
    await setFeedback(db, 'i', 'k', 'sesuai', new Date());
    await addPendingSafety(db, e.id, 'urgent');
    await updateSettings(db, { aiEnabled: true });
    await saveDraft(db, { mood: 1 });
    await wipeAll(db);
    for (const table of ['entries', 'insights', 'pattern_feedback', 'pending_safety', 'kv']) {
      const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
      expect(row?.n).toBe(0);
    }
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it('write functions emit change events for their table', async () => {
    const seen: string[] = [];
    const off = onDataChanged((t) => seen.push(t));
    await saveInsight(db, baseInsight(), new Date());
    await setFeedback(db, 'i', 'k', 'sesuai', new Date());
    await updateSettings(db, { aiEnabled: true });
    off();
    expect(seen).toEqual(['insights', 'feedback', 'settings']);
  });
});
