import { describe, expect, it } from 'vitest';
import {
  AnalyzeEntryRequestSchema,
  AnalyzeEntryResponseSchema,
  WriteInsightRequestSchema,
  WriteInsightResponseSchema,
} from './contract.js';

const analyzeReq = {
  text: 'Deadline tugas besok dan aku belum mulai sama sekali.',
  mood: 2,
  options: {
    contexts: [{ id: 'akademik', label: 'Akademik' }],
    experiences: [{ id: 'emosi.cemas', label: 'cemas' }],
    copings: [{ id: 'coping.menulis', label: 'menulis' }],
  },
};
const analyzeRes = {
  suggestions: { contexts: ['akademik'], experiences: ['emosi.cemas'], copings: [] },
  riskLevel: 'none',
};
const insightReq = {
  periodLabel: '26 Okt – 1 Nov',
  entryCount: 6,
  moodDistribution: { 1: 0, 2: 3, 3: 2, 4: 1, 5: 0 },
  patterns: [
    {
      key: 'low_mood_context:akademik',
      kind: 'low_mood_context',
      subjectLabel: 'Akademik',
      count: 4,
      hitCount: 3,
      previouslyRejected: false,
    },
  ],
};
const insightRes = {
  text: 'Minggu ini beberapa catatan berat muncul bersama urusan akademik.',
  patternTexts: { 'low_mood_context:akademik': 'Mungkin akademik ikut berperan.' },
  questions: ['Apa yang terasa paling menekan minggu ini?'],
};

describe('contract schemas accept valid samples', () => {
  it('analyzeEntry request/response', () => {
    expect(AnalyzeEntryRequestSchema.safeParse(analyzeReq).success).toBe(true);
    expect(AnalyzeEntryResponseSchema.safeParse(analyzeRes).success).toBe(true);
  });
  it('writeInsight request/response', () => {
    expect(WriteInsightRequestSchema.safeParse(insightReq).success).toBe(true);
    expect(WriteInsightResponseSchema.safeParse(insightRes).success).toBe(true);
  });
});

describe('contract schemas reject invalid input', () => {
  it('empty text', () => {
    expect(AnalyzeEntryRequestSchema.safeParse({ ...analyzeReq, text: '' }).success).toBe(false);
  });
  it('text over 20000 chars, accepts exactly 20000', () => {
    expect(AnalyzeEntryRequestSchema.safeParse({ ...analyzeReq, text: 'a'.repeat(20001) }).success).toBe(false);
    expect(AnalyzeEntryRequestSchema.safeParse({ ...analyzeReq, text: 'a'.repeat(20000) }).success).toBe(true);
  });
  it('mood out of range', () => {
    expect(AnalyzeEntryRequestSchema.safeParse({ ...analyzeReq, mood: 6 }).success).toBe(false);
  });
  it('more than 80 options per kind', () => {
    const many = Array.from({ length: 81 }, (_, i) => ({ id: `x${i}`, label: 'l' }));
    const bad = { ...analyzeReq, options: { ...analyzeReq.options, copings: many } };
    expect(AnalyzeEntryRequestSchema.safeParse(bad).success).toBe(false);
  });
  it('riskLevel high', () => {
    expect(AnalyzeEntryResponseSchema.safeParse({ ...analyzeRes, riskLevel: 'high' }).success).toBe(false);
  });
  it('unknown context category in suggestions', () => {
    const bad = { ...analyzeRes, suggestions: { ...analyzeRes.suggestions, contexts: ['nope'] } };
    expect(AnalyzeEntryResponseSchema.safeParse(bad).success).toBe(false);
  });
  it('more than 6 patterns', () => {
    const p = insightReq.patterns[0]!;
    const bad = { ...insightReq, patterns: Array.from({ length: 7 }, () => p) };
    expect(WriteInsightRequestSchema.safeParse(bad).success).toBe(false);
  });
  it('questions empty or more than 3', () => {
    expect(WriteInsightResponseSchema.safeParse({ ...insightRes, questions: [] }).success).toBe(false);
    expect(WriteInsightResponseSchema.safeParse({ ...insightRes, questions: ['a', 'b', 'c', 'd'] }).success).toBe(false);
  });
  it('insight text over 1200 chars', () => {
    expect(WriteInsightResponseSchema.safeParse({ ...insightRes, text: 'a'.repeat(1201) }).success).toBe(false);
  });
});
