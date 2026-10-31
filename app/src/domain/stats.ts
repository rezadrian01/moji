import { CONTEXTS, EXPERIENCES, MOOD_LABELS, labelForTag } from './taxonomy';
import { localDateKey, startOfLocalDay } from './period';
import type { ContextCategory, Entry, ExperienceDimension, Mood } from './types';

export type StatsRange = '7d' | '30d' | 'all';

export interface PersonalStats {
  entryCount: number;
  dailyAverages: { date: string; average: number; count: number }[];
  moodDistribution: Record<Mood, number>;
  contextFrequency: { category: ContextCategory; label: string; count: number }[];
  moodByContext: { category: ContextCategory; label: string; average: number; count: number }[];
  helpfulCopings: { tag: string; label: string; helped: number; rated: number }[];
  frequentExperiences: Record<ExperienceDimension, { tag: string; label: string; count: number }[]>;
}

const MOODS: Mood[] = [1, 2, 3, 4, 5];
const RANGE_DAYS: Record<'7d' | '30d', number> = { '7d': 7, '30d': 30 };

export function rangeStart(range: StatsRange, now: Date): Date | null {
  if (range === 'all') return null;
  const today = startOfLocalDay(now);
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - (RANGE_DAYS[range] - 1));
}

export function computeStats(entries: Entry[], range: StatsRange, now: Date): PersonalStats {
  const start = rangeStart(range, now);
  const inRange = entries.filter((e) => {
    const t = new Date(e.createdAt).getTime();
    return (start === null || t >= start.getTime()) && t <= now.getTime();
  });

  const moodDistribution: Record<Mood, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const days = new Map<string, { sum: number; count: number }>();
  const ctx = new Map<ContextCategory, { sum: number; count: number }>();
  const cop = new Map<string, { helped: number; rated: number }>();
  const exp = new Map<string, { dimension: ExperienceDimension; count: number }>();

  for (const e of inRange) {
    moodDistribution[e.mood] += 1;

    const key = localDateKey(new Date(e.createdAt));
    const d = days.get(key) ?? { sum: 0, count: 0 };
    d.sum += e.mood;
    d.count += 1;
    days.set(key, d);

    for (const category of new Set(e.contexts.map((c) => c.category))) {
      const c = ctx.get(category) ?? { sum: 0, count: 0 };
      c.sum += e.mood;
      c.count += 1;
      ctx.set(category, c);
    }

    for (const c of e.copings) {
      if (c.helped === 'belum_tahu') continue;
      const r = cop.get(c.tag) ?? { helped: 0, rated: 0 };
      r.rated += 1;
      if (c.helped === 'ya') r.helped += 1;
      cop.set(c.tag, r);
    }

    for (const x of new Map(e.experiences.map((t) => [t.tag, t])).values()) {
      const r = exp.get(x.tag) ?? { dimension: x.dimension, count: 0 };
      r.count += 1;
      exp.set(x.tag, r);
    }
  }

  const present = CONTEXTS.filter((c) => ctx.has(c.id)).map((c) => ({
    category: c.id,
    label: c.label,
    ...ctx.get(c.id)!,
  }));
  const byCount = [...present].sort((a, b) => b.count - a.count);

  const frequentExperiences = Object.fromEntries(
    EXPERIENCES.map((dim) => [
      dim.dimension,
      [...exp.entries()]
        .filter(([, v]) => v.dimension === dim.dimension)
        .map(([tag, v]) => ({ tag, label: labelForTag(tag), count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
    ]),
  ) as PersonalStats['frequentExperiences'];

  return {
    entryCount: inRange.length,
    dailyAverages: [...days.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, v]) => ({ date, average: v.sum / v.count, count: v.count })),
    moodDistribution,
    contextFrequency: byCount.map(({ category, label, count }) => ({ category, label, count })),
    moodByContext: byCount.map((c) => ({
      category: c.category,
      label: c.label,
      average: c.sum / c.count,
      count: c.count,
    })),
    helpfulCopings: [...cop.entries()]
      .map(([tag, v]) => ({ tag, label: labelForTag(tag), ...v }))
      .sort((a, b) => b.helped / b.rated - a.helped / a.rated || b.helped - a.helped || a.tag.localeCompare(b.tag)),
    frequentExperiences,
  };
}

/** Kalimat netral (fakta saja): tanpa penilaian, skor, atau perubahan. */
export function describeStats(s: PersonalStats): string[] {
  if (s.entryCount === 0) return [];
  const lines: string[] = [];
  for (const m of MOODS) {
    const n = s.moodDistribution[m];
    if (n > 0) lines.push(`Ada ${n} catatan dengan mood ${MOOD_LABELS[m]}.`);
  }
  const topCtx = s.contextFrequency[0];
  if (topCtx) {
    lines.push(`Konteks yang paling sering kamu catat: ${topCtx.label} (${topCtx.count} kali).`);
  }
  const topCoping = s.helpfulCopings.find((c) => c.helped > 0);
  if (topCoping) {
    lines.push(
      `Kamu menandai ${topCoping.label} membantu ${topCoping.helped} dari ${topCoping.rated} kali.`,
    );
  }
  return lines;
}
