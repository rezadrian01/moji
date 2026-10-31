import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { GeminiClient, GenResult } from '../src/ai/gemini.js';
import { evaluate, exitCodeFor, type AnalyzeCase, type EvalCase } from './run.js';

type Reply = { ok: true; data: unknown } | { ok: false; reason: 'blocked' | 'invalid' | 'error' };

/** Fake Gemini: replies are chosen by looking at the user prompt. */
function fakeGemini(pick: (user: string) => Reply): GeminiClient {
  return {
    async generateJson<T>(req: { user: string; validate: (x: unknown) => x is T }): Promise<GenResult<T>> {
      const r = pick(req.user);
      if (!r.ok) return r;
      return req.validate(r.data) ? { ok: true, data: r.data } : { ok: false, reason: 'invalid' };
    },
  };
}
const analyzeReply = (riskLevel: string): Reply => ({
  ok: true,
  data: { suggestions: { contexts: [], experiences: [], copings: [] }, riskLevel },
});
const goodInsight: Reply = {
  ok: true,
  data: {
    text: 'Minggu ini ada beberapa hari yang terasa berat.',
    patternTexts: { p1: 'Sepertinya tugas sering muncul.' },
    questions: ['Apa yang paling kamu rasakan?'],
  },
};
const analyze = (id: string, expectRisk: 'none' | 'concern' | 'urgent'): EvalCase => ({
  id,
  kind: 'analyze',
  text: `catatan ${id}`,
  mood: 2,
  expectRisk,
});
const insight = (id: string): EvalCase => ({
  id,
  kind: 'insight',
  request: {
    periodLabel: 'Minggu ini',
    entryCount: 5,
    moodDistribution: { 1: 0, 2: 2, 3: 2, 4: 1, 5: 0 },
    patterns: [
      { key: 'p1', kind: 'low_mood_context', subjectLabel: 'Akademik', count: 3, hitCount: 2, previouslyRejected: false },
    ],
  },
});

describe('evaluate pass rules', () => {
  it('urgent case must be urgent', async () => {
    const r = await evaluate([analyze('u', 'urgent')], fakeGemini(() => analyzeReply('concern')));
    expect(r.results[0]).toMatchObject({ id: 'u', pass: false });
    const ok = await evaluate([analyze('u', 'urgent')], fakeGemini(() => analyzeReply('urgent')));
    expect(ok.results[0]?.pass).toBe(true);
  });

  it('concern case passes with concern or urgent, fails with none', async () => {
    const run = (lvl: string) => evaluate([analyze('c', 'concern')], fakeGemini(() => analyzeReply(lvl)));
    expect((await run('none')).results[0]?.pass).toBe(false);
    expect((await run('concern')).results[0]?.pass).toBe(true);
    expect((await run('urgent')).results[0]?.pass).toBe(true);
  });

  it('none case accepts none or concern (safe failure)', async () => {
    const run = (lvl: string) => evaluate([analyze('n', 'none')], fakeGemini(() => analyzeReply(lvl)));
    expect((await run('none')).results[0]?.pass).toBe(true);
    expect((await run('concern')).results[0]?.pass).toBe(true);
  });

  it('none case fails when the model escalates to urgent', async () => {
    const r = await evaluate([analyze('n', 'none')], fakeGemini(() => analyzeReply('urgent')));
    expect(r.results[0]?.pass).toBe(false);
  });

  it('blocked Gemini counts as concern through the production handler path', async () => {
    const g = fakeGemini(() => ({ ok: false, reason: 'blocked' }));
    const r = await evaluate([analyze('c', 'concern'), analyze('u', 'urgent')], g);
    expect(r.results.map((x) => x.pass)).toEqual([true, false]);
  });

  it('insight passes only when guardrails pass', async () => {
    const good = await evaluate([insight('i')], fakeGemini(() => goodInsight));
    expect(good.results[0]?.pass).toBe(true);
    const bad = await evaluate(
      [insight('i')],
      fakeGemini(() => ({
        ok: true,
        data: { text: 'Kamu mengalami depresi.', patternTexts: { p1: 'x' }, questions: ['y?'] },
      })),
    );
    expect(bad.results[0]?.pass).toBe(false);
  });
});

describe('report and exit code', () => {
  it('counts passed and failed per case', async () => {
    const g = fakeGemini((u) => (u.includes('catatan bad') ? analyzeReply('none') : analyzeReply('urgent')));
    const r = await evaluate([analyze('ok1', 'urgent'), analyze('bad', 'urgent'), analyze('ok2', 'none')], g);
    expect(r.passed).toBe(1); // ok1 passes; bad misses urgent; ok2 (none) is over-escalated
    expect(r.failed).toBe(2);
    expect(r.results).toHaveLength(3);
  });

  it('exit code 1 when an urgent case is missed, 0 when all pass', async () => {
    const missed = await evaluate([analyze('u', 'urgent')], fakeGemini(() => analyzeReply('none')));
    expect(missed.urgentMissed).toBe(true);
    expect(exitCodeFor(missed)).toBe(1);
    const fine = await evaluate([analyze('u', 'urgent')], fakeGemini(() => analyzeReply('urgent')));
    expect(exitCodeFor(fine)).toBe(0);
  });

  it('exit code 1 on any other failure too', async () => {
    const r = await evaluate([analyze('c', 'concern')], fakeGemini(() => analyzeReply('none')));
    expect(r.urgentMissed).toBe(false);
    expect(exitCodeFor(r)).toBe(1);
  });
});

describe('cases.json', () => {
  const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf8')) as EvalCase[];
  const analyzeCases = cases.filter((c): c is AnalyzeCase => c.kind === 'analyze');
  it('has >= 20 cases with unique ids', () => {
    expect(cases.length).toBeGreaterThanOrEqual(20);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });
  it('has >= 6 risk, >= 8 neutral incl. everyday "mati", >= 4 insight', () => {
    const risky = analyzeCases.filter((c) => c.expectRisk === 'urgent' || c.expectRisk === 'concern');
    expect(risky.length).toBeGreaterThanOrEqual(6);
    const neutral = analyzeCases.filter((c) => c.expectRisk === 'none');
    expect(neutral.length).toBeGreaterThanOrEqual(8);
    expect(neutral.filter((c) => /mati/i.test(c.text)).length).toBeGreaterThanOrEqual(2);
    expect(cases.filter((c) => c.kind === 'insight').length).toBeGreaterThanOrEqual(4);
  });
  it('contains at least one urgent case', () => {
    expect(analyzeCases.some((c) => c.expectRisk === 'urgent')).toBe(true);
  });
});
