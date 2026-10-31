import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { handleRequest, type Deps, type HttpRequestLike } from './router.js';
import { MemoryInviteStore } from './invites/memoryStore.js';
import { hashCode, type LogEvent } from './log.js';
import type { GeminiClient, GenResult } from './ai/gemini.js';
import {
  AnalyzeEntryRequestSchema,
  AnalyzeEntryResponseSchema,
  WriteInsightRequestSchema,
  WriteInsightResponseSchema,
} from './contract.js';

const fixture = (name: string): any =>
  JSON.parse(readFileSync(new URL(`../../contract/fixtures/${name}.json`, import.meta.url), 'utf8'));

const CODE = 'MOJI-R07-K3F9';
const cfg = {
  model: 'm',
  vertexLocation: 'global',
  projectId: 'p',
  perCodeDailyLimit: 50,
  globalDailyLimit: 1000,
  timeZone: 'Asia/Jakarta',
};

async function setup(gen: () => GenResult<unknown>) {
  const store = new MemoryInviteStore();
  await store.create({ code: CODE, active: true, label: null, createdAt: '2026-10-31' });
  const events: LogEvent[] = [];
  const logger = { info: (e: LogEvent) => void events.push(e), error: (e: LogEvent) => void events.push(e) };
  const gemini: GeminiClient = {
    async generateJson<T>(req: { validate: (x: unknown) => x is T }): Promise<GenResult<T>> {
      const r = gen();
      if (r.ok && !req.validate(r.data)) return { ok: false, reason: 'invalid' };
      return r as GenResult<T>;
    },
  };
  const deps: Deps = { store, gemini, cfg, logger, now: () => new Date('2026-10-31T05:00:00Z') };
  return { deps, store, events };
}

const post = (path: string, body: unknown, code: string | null = CODE): HttpRequestLike => ({
  method: 'POST',
  path,
  headers: code === null ? {} : { 'x-moji-invite': code },
  body,
});

describe('contract fixtures', () => {
  it('are accepted by the zod schemas', () => {
    expect(AnalyzeEntryRequestSchema.safeParse(fixture('analyzeEntry.request')).success).toBe(true);
    expect(AnalyzeEntryResponseSchema.safeParse(fixture('analyzeEntry.response')).success).toBe(true);
    expect(WriteInsightRequestSchema.safeParse(fixture('writeInsight.request')).success).toBe(true);
    expect(WriteInsightResponseSchema.safeParse(fixture('writeInsight.response')).success).toBe(true);
  });
});

describe('routing', () => {
  it('GET /health -> 200 and does not consume quota', async () => {
    const { deps, store } = await setup(() => ({ ok: false, reason: 'error' }));
    const res = await handleRequest({ method: 'GET', path: '/health', headers: { 'x-moji-invite': CODE }, body: undefined }, deps);
    expect(res).toEqual({ status: 200, body: { valid: true } });
    expect((await store.get(CODE))!.dailyCount).toBe(0);
  });

  it('missing/unknown code -> 401, revoked -> 403', async () => {
    const { deps, store } = await setup(() => ({ ok: false, reason: 'error' }));
    expect((await handleRequest(post('/analyzeEntry', {}, null), deps)).status).toBe(401);
    expect((await handleRequest(post('/analyzeEntry', {}, 'MOJI-XXX-ABCD'), deps)).status).toBe(401);
    await store.setActive(CODE, false);
    expect((await handleRequest(post('/analyzeEntry', {}), deps)).status).toBe(403);
  });

  it('unknown path -> 404, wrong method -> 405', async () => {
    const { deps } = await setup(() => ({ ok: false, reason: 'error' }));
    expect((await handleRequest(post('/nope', {}), deps)).status).toBe(404);
    expect((await handleRequest({ method: 'GET', path: '/analyzeEntry', headers: {}, body: undefined }, deps)).status).toBe(405);
    expect((await handleRequest({ method: 'POST', path: '/health', headers: {}, body: {} }, deps)).status).toBe(405);
  });

  it('normalizes a lowercase, padded code', async () => {
    const { deps } = await setup(() => ({ ok: false, reason: 'error' }));
    const res = await handleRequest({ method: 'GET', path: '/health', headers: { 'X-Moji-Invite': ' moji-r07-k3f9 ' }, body: undefined }, deps);
    expect(res.status).toBe(200);
  });

  it('429 when the per-code limit is hit', async () => {
    const { deps } = await setup(() => ({ ok: true, data: fixture('analyzeEntry.response') }));
    deps.cfg = { ...cfg, perCodeDailyLimit: 1 };
    expect((await handleRequest(post('/analyzeEntry', fixture('analyzeEntry.request')), deps)).status).toBe(200);
    expect((await handleRequest(post('/analyzeEntry', fixture('analyzeEntry.request')), deps)).status).toBe(429);
  });
});

describe('POST /analyzeEntry', () => {
  it('success matches the fixture response', async () => {
    const { deps } = await setup(() => ({ ok: true, data: fixture('analyzeEntry.response') }));
    const res = await handleRequest(post('/analyzeEntry', fixture('analyzeEntry.request')), deps);
    expect(res).toEqual({ status: 200, body: fixture('analyzeEntry.response') });
  });

  it('drops tag ids Gemini was not offered', async () => {
    const { deps } = await setup(() => ({
      ok: true,
      data: { suggestions: { contexts: ['akademik'], experiences: ['emosi.cemas', 'ngarang.id'], copings: ['x'] }, riskLevel: 'none' },
    }));
    const res = await handleRequest(post('/analyzeEntry', fixture('analyzeEntry.request')), deps);
    expect((res.body as any).suggestions.experiences).toEqual(['emosi.cemas']);
    expect((res.body as any).suggestions.copings).toEqual([]);
  });

  it('accepts a long note (up to 20000 chars) and rejects longer ones with 400', async () => {
    const { deps } = await setup(() => ({ ok: true, data: fixture('analyzeEntry.response') }));
    const req = fixture('analyzeEntry.request');
    const ok = await handleRequest(post('/analyzeEntry', { ...req, text: 'a'.repeat(20000) }), deps);
    expect(ok.status).toBe(200);
    const tooLong = await handleRequest(post('/analyzeEntry', { ...req, text: 'a'.repeat(20001) }), deps);
    expect(tooLong).toEqual({ status: 400, body: { error: 'bad_request' } });
  });

  it('invalid body -> 400 bad_request', async () => {
    const { deps } = await setup(() => ({ ok: false, reason: 'error' }));
    const res = await handleRequest(post('/analyzeEntry', { text: '', mood: 9 }), deps);
    expect(res).toEqual({ status: 400, body: { error: 'bad_request' } });
  });

  it('blocked -> 200 with empty suggestions and riskLevel concern', async () => {
    const { deps } = await setup(() => ({ ok: false, reason: 'blocked' }));
    const res = await handleRequest(post('/analyzeEntry', fixture('analyzeEntry.request')), deps);
    expect(res).toEqual({
      status: 200,
      body: { suggestions: { contexts: [], experiences: [], copings: [] }, riskLevel: 'concern' },
    });
  });

  it.each(['invalid', 'error'] as const)('%s -> 502 ai_unavailable', async (reason) => {
    const { deps } = await setup(() => ({ ok: false, reason }));
    const res = await handleRequest(post('/analyzeEntry', fixture('analyzeEntry.request')), deps);
    expect(res).toEqual({ status: 502, body: { error: 'ai_unavailable' } });
  });
});

describe('POST /writeInsight', () => {
  it('success matches the fixture response', async () => {
    const { deps } = await setup(() => ({ ok: true, data: fixture('writeInsight.response') }));
    const res = await handleRequest(post('/writeInsight', fixture('writeInsight.request')), deps);
    expect(res).toEqual({ status: 200, body: fixture('writeInsight.response') });
  });

  it('clinical wording -> 502', async () => {
    const bad = { ...fixture('writeInsight.response'), text: 'Kamu tampak depresi.' };
    const { deps } = await setup(() => ({ ok: true, data: bad }));
    const res = await handleRequest(post('/writeInsight', fixture('writeInsight.request')), deps);
    expect(res).toEqual({ status: 502, body: { error: 'ai_unavailable' } });
  });

  it('blocked -> 502; invalid body -> 400', async () => {
    const { deps } = await setup(() => ({ ok: false, reason: 'blocked' }));
    expect((await handleRequest(post('/writeInsight', fixture('writeInsight.request')), deps)).status).toBe(502);
    expect((await handleRequest(post('/writeInsight', { nope: 1 }), deps)).status).toBe(400);
  });
});

describe('privacy', () => {
  it('logs never contain journal text or the raw code, only the hash', async () => {
    const secret = 'RAHASIA-123 aku sedih';
    const okReq = { ...fixture('analyzeEntry.request'), text: secret };
    const lines: string[] = [];
    for (const gen of [
      () => ({ ok: true, data: fixture('analyzeEntry.response') }) as GenResult<unknown>,
      () => ({ ok: false, reason: 'error' }) as GenResult<unknown>,
      () => ({ ok: false, reason: 'blocked' }) as GenResult<unknown>,
    ]) {
      const { deps, events } = await setup(gen);
      await handleRequest(post('/analyzeEntry', okReq), deps);
      await handleRequest(post('/analyzeEntry', { ...okReq, mood: 99 }), deps);
      await handleRequest(post('/analyzeEntry', okReq, 'MOJI-XXX-ABCD'), deps);
      lines.push(...events.map((e) => JSON.stringify(e)));
      expect(events.length).toBe(3);
      expect(events.some((e) => e.codeHash === hashCode(CODE))).toBe(true);
    }
    const all = lines.join('\n');
    expect(all).not.toContain('RAHASIA-123');
    expect(all).not.toContain(CODE);
    expect(all).not.toContain('MOJI-XXX-ABCD');
  });
});
