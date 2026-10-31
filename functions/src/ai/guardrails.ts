import type { AnalyzeEntryRequest, AnalyzeEntryResponse, WriteInsightResponse } from '../contract.js';

// Keep in sync with FORBIDDEN_WORDS in the app (Task 8).
export const CLINICAL_TERMS =
  /\b(depresi|depresif|gangguan|bipolar|skizofrenia|psikosis|ptsd|ocd|adhd|anxiety|diagnosis|didiagnosis|mendiagnosis|klinis|patologis|psikiatri|psikiater|mengidap|kelainan jiwa|penyakit mental)\b/i;

const KAMU_HARUS = /\bkamu\s+harus\b/i;

function pick<T extends string>(raw: readonly T[], allowed: ReadonlySet<string>): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const id of raw) {
    if (allowed.has(id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function filterSuggestions(
  raw: AnalyzeEntryResponse['suggestions'],
  req: AnalyzeEntryRequest,
): AnalyzeEntryResponse['suggestions'] {
  const ids = (o: { id: string }[]) => new Set(o.map((x) => x.id));
  return {
    contexts: pick(raw.contexts, ids(req.options.contexts)),
    experiences: pick(raw.experiences, ids(req.options.experiences)),
    copings: pick(raw.copings, ids(req.options.copings)),
  };
}

export function insightPassesGuardrails(res: WriteInsightResponse, expectedKeys: string[]): boolean {
  if (res.questions.length < 1 || res.questions.length > 3) return false;
  const keys = Object.keys(res.patternTexts);
  if (keys.length !== expectedKeys.length || !expectedKeys.every((k) => keys.includes(k))) return false;
  const texts = [res.text, ...Object.values(res.patternTexts), ...res.questions];
  return texts.every((t) => t.trim() !== '' && !CLINICAL_TERMS.test(t) && !KAMU_HARUS.test(t));
}
