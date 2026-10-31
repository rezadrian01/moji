/** @jest-environment ./src/domain/jakartaEnvironment.js */
import { createEntry } from '../../db/entriesRepo';
import { setFeedback } from '../../db/feedbackRepo';
import { listInsights, saveInsight } from '../../db/insightsRepo';
import type { Db } from '../../db/db';
import { getSettings } from '../../db/settingsRepo';
import { createTestDb } from '../../db/testing/sqljsDb';
import type { AiResult } from '../../ai/client';
import type { WriteInsightRequest, WriteInsightResponse } from '../../ai/contract';
import type { Mood } from '../../domain/types';
import { generateOnDemand, generateWeeklyIfDue, type InsightDeps } from './generate';

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));

// Sabtu 31 Okt 2026 12:00 WIB. Minggu lalu: Sen 19 Okt s.d. Sen 26 Okt.
const NOW = new Date(2026, 9, 31, 12, 0, 0);
const WEEK_KEY = '2026-10-19';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const at = (month: number, day: number) => new Date(2026, month, day, 10, 0, 0).toISOString();

/** n catatan mood rendah berkonteks akademik, plus 3 catatan mood 4 tanpa konteks (agar ada lift). */
async function addEntries(n: number, day = 21, mood: Mood = 1) {
  for (let i = 0; i < 3; i++) await createEntry(db, { mood: 4, createdAt: at(9, day) }, NOW);
  for (let i = 0; i < n; i++) {
    await createEntry(
      db,
      { mood, contexts: [{ category: 'akademik', subTag: null }], createdAt: at(9, day) },
      NOW,
    );
  }
}

async function addPlain(n: number, day: number) {
  for (let i = 0; i < n; i++) await createEntry(db, { mood: 3, createdAt: at(9, day) }, NOW);
}

function fakeAi(result: AiResult<WriteInsightResponse> | Error) {
  return jest.fn(async (_req: WriteInsightRequest) => {
    if (result instanceof Error) throw result;
    return result;
  });
}

const aiOk = (keys: string[]): AiResult<WriteInsightResponse> => ({
  ok: true,
  data: {
    text: 'Teks dari AI',
    patternTexts: Object.fromEntries(keys.map((k) => [k, `AI ${k}`])),
    questions: ['Apa kabarmu?'],
  },
});

const deps = (writeInsight: ReturnType<typeof fakeAi>, aiAllowed = true): InsightDeps => ({
  db,
  ai: { writeInsight },
  aiAllowed,
  now: NOW,
});

const emptySummary = {
  periodStart: 'a',
  periodEnd: 'b',
  entryCount: 4,
  moodDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<Mood, number>,
  patterns: [],
  enoughData: true,
};

describe('generateWeeklyIfDue', () => {
  it('membuat insight mingguan dengan teks AI', async () => {
    await addEntries(5);
    const w = fakeAi(aiOk(['low_mood_context:akademik']));
    const out = await generateWeeklyIfDue(deps(w));
    expect(out.status).toBe('created');
    if (out.status !== 'created') return;
    expect(out.insight.weekKey).toBe(WEEK_KEY);
    expect(out.insight.kind).toBe('weekly');
    expect(out.insight.source).toBe('ai');
    expect(out.insight.text).toBe('Teks dari AI');
    expect(w.mock.calls[0][0].periodLabel).toBe('19 Okt – 25 Okt');
    expect(await listInsights(db)).toHaveLength(1);
  });

  it('panggilan kedua mengembalikan exists tanpa memanggil AI', async () => {
    await addEntries(5);
    await generateWeeklyIfDue(deps(fakeAi(aiOk([]))));
    const w = fakeAi(aiOk([]));
    expect(await generateWeeklyIfDue(deps(w))).toEqual({ status: 'exists' });
    expect(w).not.toHaveBeenCalled();
  });

  it('memetakan DuplicateWeeklyInsightError ke exists', async () => {
    await addEntries(5);
    // Saat menunggu AI, penulis lain menyimpan insight minggu yang sama.
    const slow = jest.fn(async (_req: WriteInsightRequest): Promise<AiResult<WriteInsightResponse>> => {
      await saveInsight(
        db,
        {
          kind: 'weekly',
          weekKey: WEEK_KEY,
          periodStart: 'a',
          periodEnd: 'b',
          summary: emptySummary,
          text: 't',
          patternTexts: {},
          questions: [],
          source: 'local',
          reflection: null,
        },
        NOW,
      );
      return aiOk([]);
    });
    expect(await generateWeeklyIfDue({ ...deps(slow), ai: { writeInsight: slow } })).toEqual({
      status: 'exists',
    });
    expect(await listInsights(db)).toHaveLength(1);
  });

  it('memakai teks lokal lengkap saat AI gagal', async () => {
    await addEntries(5);
    const out = await generateWeeklyIfDue(deps(fakeAi({ ok: false, reason: 'timeout' })));
    expect(out.status).toBe('created');
    if (out.status !== 'created') return;
    expect(out.insight.source).toBe('local');
    expect(out.insight.summary.patterns.length).toBeGreaterThan(0);
    expect(Object.keys(out.insight.patternTexts)).toEqual(
      out.insight.summary.patterns.map((p) => p.key),
    );
  });

  it.each([
    ['invalid_invite', 'invalid'],
    ['revoked_invite', 'revoked'],
  ] as const)('%s dari writeInsight menandai masalah kode, insight tetap lokal', async (reason, problem) => {
    await addEntries(5);
    const out = await generateWeeklyIfDue(deps(fakeAi({ ok: false, reason })));
    expect(out.status === 'created' && out.insight.source).toBe('local');
    expect((await getSettings(db)).aiCodeProblem).toBe(problem);
  });

  it('memakai teks lokal saat writeInsight melempar error', async () => {
    await addEntries(5);
    const out = await generateWeeklyIfDue(deps(fakeAi(new Error('SecureStore gagal'))));
    expect(out.status).toBe('created');
    if (out.status === 'created') expect(out.insight.source).toBe('local');
  });

  it('tidak memanggil AI saat aiAllowed false', async () => {
    await addEntries(5);
    const w = fakeAi(aiOk([]));
    const out = await generateWeeklyIfDue(deps(w, false));
    expect(w).not.toHaveBeenCalled();
    expect(out.status === 'created' && out.insight.source).toBe('local');
  });

  it('3 catatan: not_enough_data dan tidak disimpan', async () => {
    await addPlain(3, 21);
    const w = fakeAi(aiOk([]));
    expect(await generateWeeklyIfDue(deps(w))).toEqual({ status: 'not_enough_data', entryCount: 3 });
    expect(w).not.toHaveBeenCalled();
    expect(await listInsights(db)).toHaveLength(0);
  });
});

describe('generateOnDemand', () => {
  it('mengabaikan catatan berumur 31 hari', async () => {
    await addPlain(3, 30);
    await createEntry(db, { mood: 1, createdAt: new Date(2026, 8, 30, 10).toISOString() }, NOW);
    const out = await generateOnDemand(deps(fakeAi(aiOk([]))));
    expect(out).toEqual({ status: 'not_enough_data', entryCount: 3 });
  });

  it('membuat insight on_demand tanpa weekKey', async () => {
    await addEntries(1, 30);
    const out = await generateOnDemand(deps(fakeAi({ ok: false, reason: 'network' })));
    expect(out.status).toBe('created');
    if (out.status !== 'created') return;
    expect(out.insight.kind).toBe('on_demand');
    expect(out.insight.weekKey).toBeNull();
  });

  it('mengirim pola yang pernah ditolak dengan previouslyRejected true', async () => {
    const prior = await saveInsight(
      db,
      {
        kind: 'on_demand',
        weekKey: null,
        periodStart: 'a',
        periodEnd: 'b',
        summary: emptySummary,
        text: 't',
        patternTexts: {},
        questions: [],
        source: 'local',
        reflection: null,
      },
      NOW,
    );
    await setFeedback(db, prior.id, 'low_mood_context:akademik', 'tidak_sesuai', NOW);
    await addEntries(5, 30);
    const w = fakeAi(aiOk([]));
    await generateOnDemand(deps(w));
    const req = w.mock.calls[0][0];
    expect(req.patterns).toHaveLength(1);
    expect(req.patterns[0]).toMatchObject({
      key: 'low_mood_context:akademik',
      previouslyRejected: true,
    });
  });
});
