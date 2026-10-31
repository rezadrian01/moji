import type { ContextCategory, Mood, Pattern, RiskLevel, Suggestions } from '../domain/types';

export interface TagOption {
  id: string;
  label: string;
}
export interface AnalyzeEntryRequest {
  text: string;
  mood: Mood;
  options: { contexts: TagOption[]; experiences: TagOption[]; copings: TagOption[] };
}
export interface AnalyzeEntryResponse {
  suggestions: Suggestions;
  riskLevel: RiskLevel;
}
export interface WriteInsightRequest {
  periodLabel: string;
  entryCount: number;
  moodDistribution: Record<Mood, number>;
  patterns: Pick<Pattern, 'key' | 'kind' | 'subjectLabel' | 'count' | 'hitCount' | 'previouslyRejected'>[];
}
export interface WriteInsightResponse {
  text: string;
  patternTexts: Record<string, string>;
  questions: string[]; // 1–3 pertanyaan
}

const CONTEXT_CATEGORIES: readonly string[] = [
  'akademik',
  'interpersonal',
  'internal',
  'finansial',
  'media',
  'tak_terduga',
];
const RISK_LEVELS: readonly string[] = ['none', 'concern', 'urgent'];

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((s) => typeof s === 'string');
}

export function isAnalyzeEntryResponse(x: unknown): x is AnalyzeEntryResponse {
  if (!isRecord(x)) return false;
  if (typeof x.riskLevel !== 'string' || !RISK_LEVELS.includes(x.riskLevel)) return false;
  const s = x.suggestions;
  if (!isRecord(s)) return false;
  return (
    isStringArray(s.contexts) &&
    s.contexts.every((c) => CONTEXT_CATEGORIES.includes(c as ContextCategory)) &&
    isStringArray(s.experiences) &&
    isStringArray(s.copings)
  );
}

export function isWriteInsightResponse(x: unknown, expectedKeys: string[]): x is WriteInsightResponse {
  if (!isRecord(x)) return false;
  if (typeof x.text !== 'string') return false;
  if (!isStringArray(x.questions) || x.questions.length < 1 || x.questions.length > 3) return false;
  const pt = x.patternTexts;
  if (!isRecord(pt)) return false;
  const keys = Object.keys(pt);
  if (keys.length !== expectedKeys.length) return false;
  if (!expectedKeys.every((k) => typeof pt[k] === 'string')) return false;
  return new Set(keys).size === new Set(expectedKeys).size;
}
