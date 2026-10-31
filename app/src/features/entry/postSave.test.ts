/** @jest-environment node */
import type { AiResult } from '../../ai/client';
import type { AnalyzeEntryRequest, AnalyzeEntryResponse } from '../../ai/contract';
import type { Db } from '../../db/db';
import { createEntry, deleteEntry, getEntry, updateEntry } from '../../db/entriesRepo';
import { takePendingSafety } from '../../db/pendingSafetyRepo';
import { getSettings, updateSettings } from '../../db/settingsRepo';
import { createTestDb } from '../../db/testing/sqljsDb';
import type { Entry, NewEntry, RiskLevel, Suggestions } from '../../domain/types';
import { buildAnalyzeRequest, MAX_ANALYZE_TEXT_LENGTH, runPostSave, type PostSaveDeps } from './postSave';

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));

type AnalyzeResult = AiResult<AnalyzeEntryResponse>;

const NOW = new Date('2026-10-31T05:00:00Z');
const NO_SUGGESTIONS: Suggestions = { contexts: [], experiences: [], copings: [] };

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function okResult(riskLevel: RiskLevel, suggestions: Suggestions = NO_SUGGESTIONS): AnalyzeResult {
  return { ok: true, data: { riskLevel, suggestions } };
}

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

function makeDeps(over: Partial<PostSaveDeps> & { analyze?: () => Promise<AnalyzeResult> } = {}) {
  const analyzeEntry = jest.fn<Promise<AnalyzeResult>, [AnalyzeEntryRequest]>(
    over.analyze ?? (async () => okResult('none')),
  );
  const showSupport = jest.fn<void, [Exclude<RiskLevel, 'none'>, string]>();
  const deps: PostSaveDeps = {
    db,
    ai: { analyzeEntry },
    aiAllowed: async () => true,
    isAppActive: () => true,
    now: () => NOW,
    ...over,
    showSupport: over.showSupport ?? showSupport,
  };
  return { deps, analyzeEntry, showSupport };
}

const save = (input: NewEntry): Promise<Entry> => createEntry(db, input, NOW);

describe('buildAnalyzeRequest', () => {
  it('returns null for an entry without text or with only whitespace', async () => {
    expect(buildAnalyzeRequest(await save({ mood: 3 }))).toBeNull();
    expect(buildAnalyzeRequest(await save({ mood: 3, note: '  \n\t ' }))).toBeNull();
  });

  it('sends the text, mood and taxonomy options (contexts at category level)', async () => {
    const req = buildAnalyzeRequest(await save({ mood: 2, note: 'deadline numpuk' }));
    expect(req).not.toBeNull();
    expect(req!.text).toBe('deadline numpuk');
    expect(req!.mood).toBe(2);
    expect(req!.options.contexts).toContainEqual({ id: 'akademik', label: 'Akademik' });
    expect(req!.options.contexts.map((o) => o.id)).not.toContain('akademik.deadline');
    expect(req!.options.experiences).toContainEqual({ id: 'emosi.cemas', label: 'cemas' });
    expect(req!.options.copings).toContainEqual({ id: 'coping.dengar-musik', label: 'dengar musik' });
  });

  it('keeps a long note under the 20000-char server limit by keeping its end', async () => {
    const note = `${'a'.repeat(15000)}${'b'.repeat(10000)}akhir catatan`;
    const req = buildAnalyzeRequest(await save({ mood: 2, note }));
    expect(req!.text).toHaveLength(MAX_ANALYZE_TEXT_LENGTH);
    expect(MAX_ANALYZE_TEXT_LENGTH).toBe(20000);
    expect(req!.text.endsWith('akhir catatan')).toBe(true);
    expect(req!.text.startsWith('a')).toBe(true);
  });

  it('sends a note of exactly 20000 chars unchanged', async () => {
    const note = 'x'.repeat(20000);
    expect(buildAnalyzeRequest(await save({ mood: 2, note }))!.text).toBe(note);
  });

  it('does not start the cut text with half of an emoji', async () => {
    const note = `😭${'a'.repeat(19999)}`; // 20001 UTF-16 units
    const text = buildAnalyzeRequest(await save({ mood: 2, note }))!.text;
    expect(text).toBe('a'.repeat(19999));
  });
});

describe('runPostSave: local safety', () => {
  it('shows urgent support right away, before the AI task settles, and stores the level', async () => {
    const pending = deferred<AnalyzeResult>();
    const { deps, showSupport } = makeDeps({ analyze: () => pending.promise });
    const entry = await save({ mood: 1, note: 'pengen mati aja' });

    const { localLevel, aiTask } = await runPostSave(entry, deps);

    expect(localLevel).toBe('urgent');
    expect(showSupport).toHaveBeenCalledWith('urgent', entry.id);
    expect((await getEntry(db, entry.id))!.safetyShownLevel).toBe('urgent');
    expect(aiTask).not.toBeNull();
    pending.resolve(okResult('none'));
    await aiTask;
  });

  it('does not call the AI for an entry without text', async () => {
    const { deps, analyzeEntry, showSupport } = makeDeps();
    const { localLevel, aiTask } = await runPostSave(await save({ mood: 4 }), deps);
    expect(localLevel).toBe('none');
    expect(aiTask).toBeNull();
    expect(analyzeEntry).not.toHaveBeenCalled();
    expect(showSupport).not.toHaveBeenCalled();
  });

  it('does not call the AI when AI is not allowed', async () => {
    const { deps, analyzeEntry } = makeDeps({ aiAllowed: async () => false });
    const { aiTask } = await runPostSave(await save({ mood: 3, note: 'hari biasa' }), deps);
    expect(aiTask).toBeNull();
    expect(analyzeEntry).not.toHaveBeenCalled();
  });

  it('on edit, does not show the sheet again at the same level but does when the level rises', async () => {
    const { deps, showSupport } = makeDeps({ aiAllowed: async () => false });
    const entry = await save({ mood: 2, note: 'putus asa' });
    await updateEntry(db, entry.id, { safetyShownLevel: 'concern' }, NOW);

    const edited = (await updateEntry(db, entry.id, { note: 'aku capek, nggak kuat lagi' }, NOW))!;
    expect((await runPostSave(edited, deps)).localLevel).toBe('concern');
    expect(showSupport).not.toHaveBeenCalled();

    const urgent = (await updateEntry(db, entry.id, { note: 'aku pengen mati aja' }, NOW))!;
    await runPostSave(urgent, deps);
    expect(showSupport).toHaveBeenCalledTimes(1);
    expect(showSupport).toHaveBeenCalledWith('urgent', entry.id);
    expect((await getEntry(db, entry.id))!.safetyShownLevel).toBe('urgent');
  });

  it('compares against the level currently stored, not the possibly stale entry passed in', async () => {
    const { deps, showSupport } = makeDeps({ aiAllowed: async () => false });
    const entry = await save({ mood: 1, note: 'pengen mati aja' });
    await updateEntry(db, entry.id, { safetyShownLevel: 'urgent' }, NOW);
    await runPostSave(entry, deps); // entry.safetyShownLevel is still 'none' in memory
    expect(showSupport).not.toHaveBeenCalled();
  });

  describe('worsening pattern', () => {
    async function seedLowMoods(count: number) {
      for (let i = 1; i <= count; i++) {
        await createEntry(db, { mood: 1, createdAt: new Date(NOW.getTime() - i * 3_600_000).toISOString() }, NOW);
      }
    }

    it('shows concern support and records lastWorseningPromptAt', async () => {
      const { deps, showSupport } = makeDeps({ aiAllowed: async () => false });
      await seedLowMoods(4);
      const entry = await save({ mood: 1 });

      const { localLevel } = await runPostSave(entry, deps);

      expect(localLevel).toBe('concern');
      expect(showSupport).toHaveBeenCalledWith('concern', entry.id);
      expect((await getEntry(db, entry.id))!.safetyShownLevel).toBe('concern');
      const prompted = (await getSettings(db)).lastWorseningPromptAt;
      expect(prompted).not.toBeNull();
      expect(new Date(prompted!).getTime()).toBe(NOW.getTime());
    });

    it('respects the cooldown and leaves lastWorseningPromptAt alone', async () => {
      const { deps, showSupport } = makeDeps({ aiAllowed: async () => false });
      const earlier = new Date(NOW.getTime() - 10 * 3_600_000).toISOString();
      await updateSettings(db, { lastWorseningPromptAt: earlier });
      await seedLowMoods(4);

      expect((await runPostSave(await save({ mood: 1 }), deps)).localLevel).toBe('none');
      expect(showSupport).not.toHaveBeenCalled();
      expect((await getSettings(db)).lastWorseningPromptAt).toBe(earlier);
    });

    it('below the threshold nothing happens', async () => {
      const { deps, showSupport } = makeDeps({ aiAllowed: async () => false });
      await seedLowMoods(3);
      expect((await runPostSave(await save({ mood: 1 }), deps)).localLevel).toBe('none');
      expect(showSupport).not.toHaveBeenCalled();
      expect((await getSettings(db)).lastWorseningPromptAt).toBeNull();
    });
  });
});

describe('runPostSave: AI task', () => {
  it('does not show a second sheet when AI says concern after local urgent', async () => {
    const { deps, showSupport } = makeDeps({ analyze: async () => okResult('concern') });
    const entry = await save({ mood: 1, note: 'pengen mati aja' });
    const { aiTask } = await runPostSave(entry, deps);
    await aiTask;
    expect(showSupport).toHaveBeenCalledTimes(1);
    expect(await takePendingSafety(db)).toBeNull();
    expect((await getEntry(db, entry.id))!.safetyShownLevel).toBe('urgent');
  });

  it('shows the sheet and stores the level when AI raises the risk while the app is active', async () => {
    const { deps, showSupport } = makeDeps({ analyze: async () => okResult('concern') });
    const entry = await save({ mood: 2, note: 'hari ini berat' });
    const { localLevel, aiTask } = await runPostSave(entry, deps);
    expect(localLevel).toBe('none');
    await aiTask;
    expect(showSupport).toHaveBeenCalledWith('concern', entry.id);
    expect((await getEntry(db, entry.id))!.safetyShownLevel).toBe('concern');
    expect(await takePendingSafety(db)).toBeNull();
  });

  it('stores pending safety without a sheet when AI raises the risk while the app is in background', async () => {
    const { deps, showSupport } = makeDeps({
      analyze: async () => okResult('concern'),
      isAppActive: () => false,
    });
    const entry = await save({ mood: 2, note: 'hari ini berat' });
    const { aiTask } = await runPostSave(entry, deps);
    await aiTask;
    expect(showSupport).not.toHaveBeenCalled();
    expect(await takePendingSafety(db)).toEqual({ entryId: entry.id, level: 'concern' });
  });

  it('checks whether the app is active when the response arrives, not when the request starts', async () => {
    let active = true;
    const pending = deferred<AnalyzeResult>();
    const { deps, showSupport } = makeDeps({ analyze: () => pending.promise, isAppActive: () => active });
    const entry = await save({ mood: 2, note: 'hari ini berat' });
    const { aiTask } = await runPostSave(entry, deps);
    active = false;
    pending.resolve(okResult('urgent'));
    await aiTask;
    expect(showSupport).not.toHaveBeenCalled();
    expect(await takePendingSafety(db)).toEqual({ entryId: entry.id, level: 'urgent' });
  });

  it('stores only suggestions not already on the entry', async () => {
    const { deps } = makeDeps({
      analyze: async () =>
        okResult('none', {
          contexts: ['akademik', 'finansial'],
          experiences: ['emosi.cemas', 'fisik.lelah'],
          copings: ['coping.dengar-musik', 'coping.menulis'],
        }),
    });
    const entry = await save({
      mood: 2,
      note: 'deadline numpuk, capek',
      contexts: [{ category: 'akademik', subTag: 'akademik.deadline' }],
      experiences: [{ dimension: 'emosi', tag: 'emosi.cemas' }],
      copings: [{ tag: 'coping.dengar-musik', helped: 'sedikit' }],
    });
    const { aiTask } = await runPostSave(entry, deps);
    await aiTask;
    expect((await getEntry(db, entry.id))!.pendingSuggestions).toEqual({
      contexts: ['finansial'],
      experiences: ['fisik.lelah'],
      copings: ['coping.menulis'],
    });
  });

  it('drops suggested ids that were not offered and leaves nothing when no suggestion remains', async () => {
    const { deps } = makeDeps({
      analyze: async () =>
        okResult('none', { contexts: [], experiences: ['emosi.depresi', 'emosi.sedih'], copings: ['coping.ngawur'] }),
    });
    const entry = await save({ mood: 2, note: 'sedih', experiences: [{ dimension: 'emosi', tag: 'emosi.sedih' }] });
    const { aiTask } = await runPostSave(entry, deps);
    await aiTask;
    expect((await getEntry(db, entry.id))!.pendingSuggestions).toBeNull();
  });

  it('when the entry is deleted before the response: no pending safety, no suggestions, no error', async () => {
    const pending = deferred<AnalyzeResult>();
    const { deps, showSupport } = makeDeps({ analyze: () => pending.promise, isAppActive: () => false });
    const entry = await save({ mood: 2, note: 'hari ini berat' });
    const { aiTask } = await runPostSave(entry, deps);
    await deleteEntry(db, entry.id);
    pending.resolve(okResult('urgent', { contexts: ['akademik'], experiences: [], copings: [] }));
    await expect(aiTask).resolves.toBeUndefined();
    expect(showSupport).not.toHaveBeenCalled();
    expect(await takePendingSafety(db)).toBeNull();
    expect(await getEntry(db, entry.id)).toBeNull();
  });

  it('when the entry is deleted right as pending safety is written: no orphan pending safety', async () => {
    // Simulasi hapus yang menyela tepat setelah INSERT pending_safety.
    const racingDb: Db = {
      ...db,
      runAsync: async (sql, params) => {
        const r = await db.runAsync(sql, params);
        if (sql.includes('INSERT INTO pending_safety')) {
          await db.runAsync('DELETE FROM entries WHERE id = ?', [params?.[0]]);
        }
        return r;
      },
    };
    const { deps, showSupport } = makeDeps({
      db: racingDb,
      analyze: async () => okResult('urgent'),
      isAppActive: () => false,
    });
    const entry = await save({ mood: 2, note: 'hari ini berat' });
    const { aiTask } = await runPostSave(entry, deps);
    await expect(aiTask).resolves.toBeUndefined();
    expect(showSupport).not.toHaveBeenCalled();
    expect(await takePendingSafety(db)).toBeNull();
  });

  it('when AI gets disabled before the response: nothing is stored', async () => {
    let allowed = true;
    const pending = deferred<AnalyzeResult>();
    const { deps, showSupport } = makeDeps({
      analyze: () => pending.promise,
      aiAllowed: async () => allowed,
      isAppActive: () => false,
    });
    const entry = await save({ mood: 2, note: 'deadline numpuk' });
    const { aiTask } = await runPostSave(entry, deps);
    allowed = false;
    pending.resolve(okResult('concern', { contexts: ['akademik'], experiences: [], copings: [] }));
    await aiTask;
    const stored = (await getEntry(db, entry.id))!;
    expect(stored.pendingSuggestions).toBeNull();
    expect(stored.safetyShownLevel).toBe('none');
    expect(showSupport).not.toHaveBeenCalled();
    expect(await takePendingSafety(db)).toBeNull();
  });

  it('when the note was edited before the response: stale suggestions are dropped, risk still counts', async () => {
    const pending = deferred<AnalyzeResult>();
    const { deps, showSupport } = makeDeps({ analyze: () => pending.promise });
    const entry = await save({ mood: 2, note: 'deadline numpuk' });
    const { aiTask } = await runPostSave(entry, deps);
    await updateEntry(db, entry.id, { note: 'udah beres kok' }, NOW);
    pending.resolve(okResult('concern', { contexts: ['akademik'], experiences: [], copings: [] }));
    await aiTask;
    expect((await getEntry(db, entry.id))!.pendingSuggestions).toBeNull();
    expect(showSupport).toHaveBeenCalledWith('concern', entry.id);
  });

  it.each<[string, () => Promise<AnalyzeResult>]>([
    ['timeout', async () => ({ ok: false, reason: 'timeout' })],
    ['network', async () => ({ ok: false, reason: 'network' })],
    ['a thrown error (e.g. SecureStore rejection)', async () => Promise.reject(new Error('secure store'))],
  ])('AI failure via %s changes nothing and does not throw', async (_label, analyze) => {
    const { deps, showSupport } = makeDeps({ analyze });
    const entry = await save({ mood: 2, note: 'hari ini berat' });
    const { aiTask } = await runPostSave(entry, deps);
    await expect(aiTask).resolves.toBeUndefined();
    const stored = (await getEntry(db, entry.id))!;
    expect(stored).toEqual(entry);
    expect(showSupport).not.toHaveBeenCalled();
    expect(await takePendingSafety(db)).toBeNull();
  });

  it.each<[AnalyzeResult, 'invalid' | 'revoked']>([
    [{ ok: false, reason: 'invalid_invite' }, 'invalid'],
    [{ ok: false, reason: 'revoked_invite' }, 'revoked'],
  ])('a 401/403 from analyzeEntry (%j) marks the invite problem and leaves AI settings alone', async (r, problem) => {
    await updateSettings(db, { aiEnabled: true, aiConsentAt: '2026-10-31T09:00:00.000+07:00' });
    const { deps } = makeDeps({ analyze: async () => r });
    const { aiTask } = await runPostSave(await save({ mood: 2, note: 'hari ini berat' }), deps);
    await aiTask;
    const settings = await getSettings(db);
    expect(settings.aiCodeProblem).toBe(problem);
    expect(settings.aiEnabled).toBe(true);
    expect(settings.aiConsentAt).toBe('2026-10-31T09:00:00.000+07:00');
  });

  it('a network failure does not mark an invite problem', async () => {
    const { deps } = makeDeps({ analyze: async () => ({ ok: false, reason: 'network' }) });
    const { aiTask } = await runPostSave(await save({ mood: 2, note: 'hari ini berat' }), deps);
    await aiTask;
    expect((await getSettings(db)).aiCodeProblem).toBeNull();
  });
});
