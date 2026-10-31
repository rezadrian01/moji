/**
 * @jest-environment ./src/domain/jakartaEnvironment.js
 */
import type { ContextCategory, CopingHelped, Entry, Mood } from './types';
import { PATTERN_RULES, computePatterns } from './patterns';

const period = { start: new Date(2026, 9, 26), end: new Date(2026, 10, 2) };
let seq = 0;

function entry(o: {
  mood: Mood;
  contexts?: ContextCategory[];
  experiences?: string[];
  copings?: [string, CopingHelped][];
  createdAt?: string;
}): Entry {
  seq += 1;
  const at = o.createdAt ?? '2026-10-28T09:00:00+07:00';
  return {
    id: `e${seq}`,
    createdAt: at,
    updatedAt: at,
    mood: o.mood,
    note: null,
    contexts: (o.contexts ?? []).map((category) => ({ category, subTag: null })),
    experiences: (o.experiences ?? []).map((tag) => ({ dimension: 'fisik', tag })),
    copings: (o.copings ?? []).map(([tag, helped]) => ({ tag, helped })),
    aiSuggested: [],
    pendingSuggestions: null,
    safetyShownLevel: 'none',
  };
}
const many = (n: number, f: () => Entry) => Array.from({ length: n }, f);
const find = (entries: Entry[], key: string, rejected: string[] = []) =>
  computePatterns(entries, period, rejected).patterns.find((p) => p.key === key);

describe('computePatterns', () => {
  it('exposes the documented rules', () => {
    expect(PATTERN_RULES).toEqual({
      lowMoodMax: 2,
      minEntries: 4,
      context: { minCount: 3, minRate: 0.5, minLift: 0.2 },
      experience: { minLowCount: 3, minShareOfLow: 0.4 },
      coping: { minRated: 2, minHelpfulRate: 0.6 },
      maxPatterns: 4,
    });
  });

  it('handles empty data', () => {
    const s = computePatterns([], period, []);
    expect(s.entryCount).toBe(0);
    expect(s.enoughData).toBe(false);
    expect(s.patterns).toEqual([]);
    expect(s.periodStart).toBe(period.start.toISOString());
    expect(s.periodEnd).toBe(period.end.toISOString());
  });

  it('is not enough data with 3 entries', () => {
    const e = many(3, () => entry({ mood: 1, contexts: ['akademik'] }));
    const s = computePatterns(e, period, []);
    expect(s.enoughData).toBe(false);
    expect(s.patterns).toEqual([]);
  });

  it('finds a low-mood context', () => {
    const e = [
      ...many(3, () => entry({ mood: 1, contexts: ['akademik'] })),
      entry({ mood: 4, contexts: ['akademik'] }),
      ...many(3, () => entry({ mood: 4 })),
    ];
    const p = find(e, 'low_mood_context:akademik');
    expect(p).toMatchObject({
      kind: 'low_mood_context',
      subject: 'akademik',
      count: 4,
      hitCount: 3,
      rate: 0.75,
      previouslyRejected: false,
    });
    expect(p!.baselineRate).toBeCloseTo(3 / 7);
    expect(p!.subjectLabel).toBeTruthy();
  });

  it('ignores a context in only 2 entries', () => {
    const e = [
      ...many(2, () => entry({ mood: 1, contexts: ['akademik'] })),
      ...many(3, () => entry({ mood: 4 })),
    ];
    expect(find(e, 'low_mood_context:akademik')).toBeUndefined();
  });

  it('ignores a context with lift of only 0.1', () => {
    const e = [
      ...many(2, () => entry({ mood: 1, contexts: ['akademik'] })),
      ...many(2, () => entry({ mood: 4, contexts: ['akademik'] })),
      ...many(2, () => entry({ mood: 1 })),
      ...many(4, () => entry({ mood: 4 })),
    ]; // rate 0.5, baseline 0.4
    expect(find(e, 'low_mood_context:akademik')).toBeUndefined();
  });

  it('counts multiple contexts in one entry for each', () => {
    const e = [
      ...many(3, () => entry({ mood: 2, contexts: ['akademik', 'finansial'] })),
      ...many(2, () => entry({ mood: 5 })),
    ];
    expect(find(e, 'low_mood_context:akademik')).toBeDefined();
    expect(find(e, 'low_mood_context:finansial')).toBeDefined();
  });

  it('finds a low-mood experience', () => {
    const e = [
      ...many(3, () => entry({ mood: 1, experiences: ['fisik.lelah'] })),
      entry({ mood: 2 }),
      ...many(2, () => entry({ mood: 4 })),
    ];
    const p = find(e, 'low_mood_experience:fisik.lelah');
    expect(p).toMatchObject({ count: 3, hitCount: 3, rate: 1, subjectLabel: 'lelah' });
  });

  it('ignores an experience below 3 low entries or 40% of low', () => {
    const two = [
      ...many(2, () => entry({ mood: 1, experiences: ['fisik.lelah'] })),
      ...many(3, () => entry({ mood: 4 })),
    ];
    expect(find(two, 'low_mood_experience:fisik.lelah')).toBeUndefined();
    const share = [
      ...many(3, () => entry({ mood: 1, experiences: ['fisik.lelah'] })),
      ...many(5, () => entry({ mood: 1 })),
    ];
    expect(find(share, 'low_mood_experience:fisik.lelah')).toBeUndefined();
  });

  it('counts custom tags', () => {
    const e = [
      ...many(3, () => entry({ mood: 1, experiences: ['custom:bosan'] })),
      ...many(2, () => entry({ mood: 4 })),
    ];
    expect(find(e, 'low_mood_experience:custom:bosan')?.subjectLabel).toBe('bosan');
  });

  it('finds helpful coping, ignoring belum_tahu', () => {
    const music = 'coping.dengar_musik';
    const e = [
      entry({ mood: 3, copings: [[music, 'ya']] }),
      entry({ mood: 3, copings: [[music, 'sedikit']] }),
      entry({ mood: 3, copings: [[music, 'tidak']] }),
      entry({ mood: 3 }),
    ];
    const p = find(e, `helpful_coping:${music}`);
    expect(p).toMatchObject({ count: 3, hitCount: 2, baselineRate: 0 });
    expect(p!.rate).toBeCloseTo(0.67, 2);

    const unknown = [
      entry({ mood: 3, copings: [[music, 'belum_tahu']] }),
      entry({ mood: 3, copings: [[music, 'belum_tahu']] }),
      entry({ mood: 3 }),
      entry({ mood: 3 }),
    ];
    expect(find(unknown, `helpful_coping:${music}`)).toBeUndefined();
  });

  it('marks previously rejected patterns', () => {
    const e = [
      ...many(3, () => entry({ mood: 1, contexts: ['akademik'] })),
      ...many(2, () => entry({ mood: 4 })),
    ];
    const key = 'low_mood_context:akademik';
    expect(find(e, key, [key])?.previouslyRejected).toBe(true);
    expect(find(e, key, [])?.previouslyRejected).toBe(false);
  });

  it('caps at 4 patterns, contexts/experiences before coping', () => {
    const cats: ContextCategory[] = ['akademik', 'interpersonal', 'internal', 'finansial', 'media'];
    const e = [
      ...many(3, () => entry({ mood: 1, contexts: cats, experiences: ['fisik.lelah'] })),
      ...many(2, () => entry({ mood: 4, copings: [['coping.dengar_musik', 'ya']] })),
    ];
    const s = computePatterns(e, period, []);
    expect(s.patterns).toHaveLength(4);
    expect(s.patterns.every((p) => p.kind !== 'helpful_coping')).toBe(true);
  });

  it('orders by descending lift', () => {
    const e = [
      ...many(3, () => entry({ mood: 1, contexts: ['media', 'akademik'] })),
      entry({ mood: 4, contexts: ['media'] }),
      ...many(2, () => entry({ mood: 4 })),
    ];
    // akademik rate 1 (lift .5); media rate .75 (lift .25)
    const keys = computePatterns(e, period, []).patterns.map((p) => p.key);
    expect(keys.indexOf('low_mood_context:akademik')).toBeLessThan(
      keys.indexOf('low_mood_context:media'),
    );
  });

  it('ignores entries outside the period (end exclusive)', () => {
    const e = [
      ...many(3, () => entry({ mood: 1, contexts: ['akademik'] })),
      entry({ mood: 4 }),
      entry({ mood: 1, createdAt: '2026-10-25T23:59:00+07:00' }),
      entry({ mood: 1, createdAt: '2026-11-02T00:00:00+07:00' }),
    ];
    const s = computePatterns(e, period, []);
    expect(s.entryCount).toBe(4);
    expect(s.moodDistribution[1]).toBe(3);
  });

  it('includes the period start instant', () => {
    const e = [entry({ mood: 3, createdAt: '2026-10-26T00:00:00+07:00' })];
    expect(computePatterns(e, period, []).entryCount).toBe(1);
  });

  it('always has mood distribution keys 1-5', () => {
    expect(computePatterns([], period, []).moodDistribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    const s = computePatterns([entry({ mood: 5 })], period, []);
    expect(s.moodDistribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 });
  });
});
