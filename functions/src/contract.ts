import { z } from 'zod';

// Mirrors app/src/ai/contract.ts and app/src/domain/types.ts (Task 2).

const MoodSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
const RiskLevelSchema = z.enum(['none', 'concern', 'urgent']);
const ContextCategorySchema = z.enum([
  'akademik',
  'interpersonal',
  'internal',
  'finansial',
  'media',
  'tak_terduga',
]);
const PatternKindSchema = z.enum(['low_mood_context', 'low_mood_experience', 'helpful_coping']);

const TagOptionSchema = z.object({ id: z.string().min(1), label: z.string().min(1) });
const OptionsSchema = z.array(TagOptionSchema).max(80);

const SuggestionsSchema = z.object({
  contexts: z.array(ContextCategorySchema),
  experiences: z.array(z.string()),
  copings: z.array(z.string()),
});

export const AnalyzeEntryRequestSchema = z.object({
  text: z.string().min(1).max(20000),
  mood: MoodSchema,
  options: z.object({
    contexts: OptionsSchema,
    experiences: OptionsSchema,
    copings: OptionsSchema,
  }),
});
export type AnalyzeEntryRequest = z.infer<typeof AnalyzeEntryRequestSchema>;

export const AnalyzeEntryResponseSchema = z.object({
  suggestions: SuggestionsSchema,
  riskLevel: RiskLevelSchema,
});
export type AnalyzeEntryResponse = z.infer<typeof AnalyzeEntryResponseSchema>;

const nonNegInt = z.number().int().min(0);

export const WriteInsightRequestSchema = z.object({
  periodLabel: z.string().min(1),
  entryCount: nonNegInt,
  moodDistribution: z.object({
    1: nonNegInt,
    2: nonNegInt,
    3: nonNegInt,
    4: nonNegInt,
    5: nonNegInt,
  }),
  patterns: z
    .array(
      z.object({
        key: z.string().min(1),
        kind: PatternKindSchema,
        subjectLabel: z.string().min(1),
        count: nonNegInt,
        hitCount: nonNegInt,
        previouslyRejected: z.boolean(),
      }),
    )
    .max(6),
});
export type WriteInsightRequest = z.infer<typeof WriteInsightRequestSchema>;

export const WriteInsightResponseSchema = z.object({
  text: z.string().max(1200),
  patternTexts: z.record(z.string(), z.string()),
  questions: z.array(z.string().min(1)).min(1).max(3),
});
export type WriteInsightResponse = z.infer<typeof WriteInsightResponseSchema>;
