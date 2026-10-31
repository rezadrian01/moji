// Prompt evaluation runner. `npm run eval` calls real Vertex AI with local ADC;
// it must never run in tests or CI. Tests use evaluate() with a fake GeminiClient.
// It goes through the same handlers as production, so e.g. 'blocked' -> riskLevel 'concern'.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { insightPassesGuardrails } from '../src/ai/guardrails.js';
import { createVertexGeminiClient, type GeminiClient } from '../src/ai/gemini.js';
import { loadConfig } from '../src/config.js';
import type { AnalyzeEntryRequest, AnalyzeEntryResponse, WriteInsightRequest } from '../src/contract.js';
import { handleAnalyzeEntry } from '../src/handlers/analyzeEntry.js';
import { handleWriteInsight } from '../src/handlers/writeInsight.js';
import type { Deps } from '../src/router.js';

export type ExpectRisk = 'none' | 'concern' | 'urgent';

export interface AnalyzeCase {
  id: string;
  kind: 'analyze';
  text: string;
  mood: 1 | 2 | 3 | 4 | 5;
  expectRisk: ExpectRisk;
}
export interface InsightCase {
  id: string;
  kind: 'insight';
  request: WriteInsightRequest;
}
export type EvalCase = AnalyzeCase | InsightCase;

export interface CaseResult {
  id: string;
  kind: EvalCase['kind'];
  pass: boolean;
  detail: string;
}
export interface EvalReport {
  results: CaseResult[];
  passed: number;
  failed: number;
  /** True when a case that expects 'urgent' was not detected as urgent. */
  urgentMissed: boolean;
}

const OPTIONS: AnalyzeEntryRequest['options'] = {
  contexts: [
    { id: 'akademik', label: 'Akademik' },
    { id: 'interpersonal', label: 'Interpersonal' },
    { id: 'internal', label: 'Internal' },
    { id: 'finansial', label: 'Finansial' },
    { id: 'media', label: 'Media' },
    { id: 'tak_terduga', label: 'Tak terduga' },
  ],
  experiences: [
    { id: 'lelah', label: 'Lelah' },
    { id: 'cemas', label: 'Cemas' },
    { id: 'kesepian', label: 'Kesepian' },
    { id: 'lega', label: 'Lega' },
  ],
  copings: [
    { id: 'istirahat', label: 'Istirahat' },
    { id: 'cerita', label: 'Bercerita ke teman' },
    { id: 'jalan', label: 'Jalan kaki' },
  ],
};

const RANK: Record<ExpectRisk, number> = { none: 0, concern: 1, urgent: 2 };

function riskPasses(expect: ExpectRisk, got: ExpectRisk): boolean {
  if (expect === 'urgent') return got === 'urgent';
  if (expect === 'concern') return RANK[got] >= RANK.concern;
  return got === 'none' || got === 'concern'; // safe failure is allowed
}

async function runAnalyze(c: AnalyzeCase, deps: Deps): Promise<CaseResult> {
  const out = await handleAnalyzeEntry({ text: c.text, mood: c.mood, options: OPTIONS }, deps);
  if (out.status !== 200) {
    return { id: c.id, kind: c.kind, pass: false, detail: `status ${out.status} (${out.reason ?? 'unknown'})` };
  }
  const got = (out.body as AnalyzeEntryResponse).riskLevel;
  const pass = riskPasses(c.expectRisk, got);
  return { id: c.id, kind: c.kind, pass, detail: `expected ${c.expectRisk}, got ${got}` };
}

async function runInsight(c: InsightCase, deps: Deps): Promise<CaseResult> {
  const out = await handleWriteInsight(c.request, deps);
  if (out.status !== 200) {
    return { id: c.id, kind: c.kind, pass: false, detail: `status ${out.status} (${out.reason ?? 'unknown'})` };
  }
  const keys = c.request.patterns.map((p) => p.key);
  // The handler already enforces this; re-checked so the eval fails loudly if that ever changes.
  const pass = insightPassesGuardrails(out.body as Parameters<typeof insightPassesGuardrails>[0], keys);
  return { id: c.id, kind: c.kind, pass, detail: pass ? 'guardrails ok' : 'guardrails failed' };
}

export async function evaluate(cases: EvalCase[], gemini: GeminiClient): Promise<EvalReport> {
  const deps = { gemini } as Deps; // handlers only use deps.gemini
  const results: CaseResult[] = [];
  let urgentMissed = false;
  for (const c of cases) {
    const r = c.kind === 'analyze' ? await runAnalyze(c, deps) : await runInsight(c, deps);
    if (c.kind === 'analyze' && c.expectRisk === 'urgent' && !r.pass) urgentMissed = true;
    results.push(r);
  }
  const passed = results.filter((r) => r.pass).length;
  return { results, passed, failed: results.length - passed, urgentMissed };
}

export function exitCodeFor(report: EvalReport): number {
  return report.urgentMissed || report.failed > 0 ? 1 : 0;
}

async function main(): Promise<number> {
  const cases = JSON.parse(readFileSync(new URL('../../eval/cases.json', import.meta.url), 'utf8')) as EvalCase[];
  const gemini = createVertexGeminiClient(loadConfig(process.env));
  const report = await evaluate(cases, gemini);
  for (const r of report.results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  ${r.detail}`);
  console.log(`\n${report.passed} lolos, ${report.failed} gagal dari ${report.results.length} kasus`);
  if (report.urgentMissed) console.log('GAGAL: ada kasus urgent yang tidak terdeteksi.');
  return exitCodeFor(report);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e instanceof Error ? e.message : 'failed');
      process.exit(1);
    },
  );
}
