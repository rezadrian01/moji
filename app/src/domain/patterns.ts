import { labelForTag } from './taxonomy';
import type { Entry, Mood, Pattern, PatternKind, PatternSummary } from './types';

/**
 * Aturan deteksi pola (satu-satunya sumber fakta untuk insight).
 * - lowMoodMax: mood <= 2 dianggap rendah.
 * - minEntries: di bawah ini `enoughData` false dan tidak ada pola.
 * - context (low_mood_context): kategori muncul di >= minCount catatan,
 *   rate (low / count) >= minRate, dan rate - baselineRate >= minLift.
 * - experience (low_mood_experience): tag muncul di >= minLowCount catatan
 *   low-mood dan di >= minShareOfLow dari seluruh catatan low-mood.
 * - coping (helpful_coping): tag dengan >= minRated penilaian selain
 *   `belum_tahu`, proporsi `ya` + `sedikit` >= minHelpfulRate. baselineRate 0.
 * - Urutan: konteks dan pengalaman menurut lift (menurun), lalu coping
 *   menurut rate (menurun). Maksimal maxPatterns pola.
 */
export const PATTERN_RULES = {
  lowMoodMax: 2,
  minEntries: 4,
  context: { minCount: 3, minRate: 0.5, minLift: 0.2 },
  experience: { minLowCount: 3, minShareOfLow: 0.4 },
  coping: { minRated: 2, minHelpfulRate: 0.6 },
  maxPatterns: 4,
} as const;

type Candidate = Pattern & { sortValue: number };

function bump(map: Map<string, { count: number; hit: number }>, key: string, hit: boolean) {
  const cur = map.get(key) ?? { count: 0, hit: 0 };
  cur.count += 1;
  if (hit) cur.hit += 1;
  map.set(key, cur);
}

export function computePatterns(
  entries: Entry[],
  period: { start: Date; end: Date },
  rejectedKeys: string[],
): PatternSummary {
  const startMs = period.start.getTime();
  const endMs = period.end.getTime();
  const inPeriod = entries.filter((e) => {
    const t = new Date(e.createdAt).getTime();
    return t >= startMs && t < endMs;
  });

  const moodDistribution: Record<Mood, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const e of inPeriod) moodDistribution[e.mood] += 1;

  const entryCount = inPeriod.length;
  const enoughData = entryCount >= PATTERN_RULES.minEntries;
  const summary: PatternSummary = {
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    entryCount,
    moodDistribution,
    patterns: [],
    enoughData,
  };
  if (!enoughData) return summary;

  const isLow = (e: Entry) => e.mood <= PATTERN_RULES.lowMoodMax;
  const lowTotal = inPeriod.filter(isLow).length;
  const baselineRate = lowTotal / entryCount;
  const rejected = new Set(rejectedKeys);

  const make = (
    kind: PatternKind,
    subject: string,
    count: number,
    hitCount: number,
    baseline: number,
    sortValue: number,
  ): Candidate => {
    const key = `${kind}:${subject}`;
    return {
      key,
      kind,
      subject,
      subjectLabel: labelForTag(subject),
      count,
      hitCount,
      rate: hitCount / count,
      baselineRate: baseline,
      previouslyRejected: rejected.has(key),
      sortValue,
    };
  };

  const contextStats = new Map<string, { count: number; hit: number }>();
  const experienceStats = new Map<string, { count: number; hit: number }>();
  const copingStats = new Map<string, { count: number; hit: number }>();

  for (const e of inPeriod) {
    const low = isLow(e);
    for (const c of new Set(e.contexts.map((x) => x.category))) bump(contextStats, c, low);
    for (const t of new Set(e.experiences.map((x) => x.tag))) bump(experienceStats, t, low);
    for (const c of e.copings) {
      if (c.helped === 'belum_tahu') continue;
      bump(copingStats, c.tag, c.helped === 'ya' || c.helped === 'sedikit');
    }
  }

  const lifted: Candidate[] = [];
  const rules = PATTERN_RULES;
  for (const [subject, s] of contextStats) {
    const rate = s.hit / s.count;
    const lift = rate - baselineRate;
    if (s.count >= rules.context.minCount && rate >= rules.context.minRate && lift >= rules.context.minLift - 1e-9) {
      lifted.push(make('low_mood_context', subject, s.count, s.hit, baselineRate, lift));
    }
  }
  for (const [subject, s] of experienceStats) {
    if (s.hit >= rules.experience.minLowCount && s.hit / lowTotal >= rules.experience.minShareOfLow) {
      lifted.push(make('low_mood_experience', subject, s.count, s.hit, baselineRate, s.hit / s.count - baselineRate));
    }
  }
  lifted.sort((a, b) => b.sortValue - a.sortValue);

  const coping: Candidate[] = [];
  for (const [subject, s] of copingStats) {
    const rate = s.hit / s.count;
    if (s.count >= rules.coping.minRated && rate >= rules.coping.minHelpfulRate) {
      coping.push(make('helpful_coping', subject, s.count, s.hit, 0, rate));
    }
  }
  coping.sort((a, b) => b.sortValue - a.sortValue);

  summary.patterns = [...lifted, ...coping].slice(0, rules.maxPatterns).map(({ sortValue: _s, ...p }) => p);
  return summary;
}
