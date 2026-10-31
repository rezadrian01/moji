import { ANALYZE_SYSTEM_PROMPT, buildAnalyzeUserPrompt } from '../ai/prompts.js';
import { ANALYZE_RESPONSE_SCHEMA } from '../ai/schemas.js';
import { filterSuggestions } from '../ai/guardrails.js';
import { AnalyzeEntryRequestSchema, AnalyzeEntryResponseSchema, type AnalyzeEntryResponse } from '../contract.js';
import type { Deps, HandlerResult } from '../router.js';

const isResponse = (x: unknown): x is AnalyzeEntryResponse => AnalyzeEntryResponseSchema.safeParse(x).success;

export async function handleAnalyzeEntry(body: unknown, deps: Deps): Promise<HandlerResult> {
  const parsed = AnalyzeEntryRequestSchema.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: 'bad_request' }, reason: 'bad_request' };
  const req = parsed.data;

  const res = await deps.gemini.generateJson<AnalyzeEntryResponse>({
    system: ANALYZE_SYSTEM_PROMPT,
    user: buildAnalyzeUserPrompt(req),
    responseSchema: ANALYZE_RESPONSE_SCHEMA,
    validate: isResponse,
  });

  if (res.ok) {
    return {
      status: 200,
      body: { suggestions: filterSuggestions(res.data.suggestions, req), riskLevel: res.data.riskLevel },
    };
  }
  if (res.reason === 'blocked') {
    return {
      status: 200,
      body: { suggestions: { contexts: [], experiences: [], copings: [] }, riskLevel: 'concern' },
      reason: 'ai_blocked',
    };
  }
  return {
    status: 502,
    body: { error: 'ai_unavailable' },
    reason: res.reason === 'invalid' ? 'ai_invalid' : 'ai_error',
  };
}
