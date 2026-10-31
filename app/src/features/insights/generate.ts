import type { createAiClient } from '../../ai/client';
import type { Db } from '../../db/db';
import { listEntries } from '../../db/entriesRepo';
import { rejectedPatternKeys } from '../../db/feedbackRepo';
import { DuplicateWeeklyInsightError, hasWeeklyInsight, saveInsight } from '../../db/insightsRepo';
import { localInsightText } from '../../domain/insightText';
import { computePatterns } from '../../domain/patterns';
import { formatPeriodLabel, lastNDays, previousWeek } from '../../domain/period';
import type { Insight } from '../../domain/types';

export type GenerateOutcome =
  | { status: 'created'; insight: Insight }
  | { status: 'not_enough_data'; entryCount: number }
  | { status: 'exists' };

export interface InsightDeps {
  db: Db;
  ai: Pick<ReturnType<typeof createAiClient>, 'writeInsight'>;
  aiAllowed: boolean;
  now: Date;
}

const ON_DEMAND_DAYS = 30;

async function generate(
  deps: InsightDeps,
  kind: Insight['kind'],
  period: { start: Date; end: Date },
  weekKey: string | null,
): Promise<GenerateOutcome> {
  const { db, ai, aiAllowed, now } = deps;
  const entries = await listEntries(db, {
    from: period.start.toISOString(),
    to: period.end.toISOString(),
  });
  const summary = computePatterns(entries, period, await rejectedPatternKeys(db));
  if (!summary.enoughData) return { status: 'not_enough_data', entryCount: summary.entryCount };

  let written: { text: string; patternTexts: Record<string, string>; questions: string[] } | null = null;
  if (aiAllowed) {
    try {
      const r = await ai.writeInsight({
        periodLabel: formatPeriodLabel(period.start, period.end),
        entryCount: summary.entryCount,
        moodDistribution: summary.moodDistribution,
        patterns: summary.patterns.map((p) => ({
          key: p.key,
          kind: p.kind,
          subjectLabel: p.subjectLabel,
          count: p.count,
          hitCount: p.hitCount,
          previouslyRejected: p.previouslyRejected,
        })),
      });
      if (r.ok) written = r.data;
    } catch {
      // Kegagalan apa pun pada AI jatuh ke teks lokal.
    }
  }
  const content = written ?? localInsightText(summary);

  try {
    const insight = await saveInsight(
      db,
      {
        kind,
        weekKey,
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
        summary,
        text: content.text,
        patternTexts: content.patternTexts,
        questions: content.questions,
        source: written ? 'ai' : 'local',
        reflection: null,
      },
      now,
    );
    return { status: 'created', insight };
  } catch (e) {
    if (e instanceof DuplicateWeeklyInsightError) return { status: 'exists' };
    throw e;
  }
}

export async function generateWeeklyIfDue(deps: InsightDeps): Promise<GenerateOutcome> {
  const week = previousWeek(deps.now);
  if (await hasWeeklyInsight(deps.db, week.weekKey)) return { status: 'exists' };
  return generate(deps, 'weekly', week, week.weekKey);
}

export async function generateOnDemand(deps: InsightDeps): Promise<GenerateOutcome> {
  return generate(deps, 'on_demand', lastNDays(deps.now, ON_DEMAND_DAYS), null);
}
