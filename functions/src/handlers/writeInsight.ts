import { INSIGHT_SYSTEM_PROMPT, buildInsightUserPrompt } from '../ai/prompts.js';
import { INSIGHT_RESPONSE_SCHEMA } from '../ai/schemas.js';
import { insightPassesGuardrails } from '../ai/guardrails.js';
import { WriteInsightRequestSchema, WriteInsightResponseSchema, type WriteInsightResponse } from '../contract.js';
import type { Deps, HandlerResult } from '../router.js';

const isResponse = (x: unknown): x is WriteInsightResponse => WriteInsightResponseSchema.safeParse(x).success;

export async function handleWriteInsight(body: unknown, deps: Pick<Deps, 'gemini'>): Promise<HandlerResult> {
  const parsed = WriteInsightRequestSchema.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: 'bad_request' }, reason: 'bad_request' };
  const req = parsed.data;

  const res = await deps.gemini.generateJson<WriteInsightResponse>({
    system: INSIGHT_SYSTEM_PROMPT,
    user: buildInsightUserPrompt(req),
    responseSchema: INSIGHT_RESPONSE_SCHEMA,
    validate: isResponse,
  });

  const unavailable = (reason: string): HandlerResult => ({ status: 502, body: { error: 'ai_unavailable' }, reason });
  if (!res.ok) {
    return unavailable(res.reason === 'blocked' ? 'ai_blocked' : res.reason === 'invalid' ? 'ai_invalid' : 'ai_error');
  }
  if (!insightPassesGuardrails(res.data, req.patterns.map((p) => p.key))) return unavailable('guardrail_rejected');
  return { status: 200, body: res.data };
}
