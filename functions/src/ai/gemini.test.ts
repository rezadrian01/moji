import { describe, expect, it, vi } from 'vitest';
import { createVertexGeminiClient, type GenAiLike } from './gemini.js';
import type { Config } from '../config.js';

const cfg: Config = {
  model: 'gemini-test',
  vertexLocation: 'global',
  projectId: 'proj-1',
  perCodeDailyLimit: 50,
  globalDailyLimit: 1000,
  timeZone: 'Asia/Jakarta',
};
const isObj = (x: unknown): x is { a: number } =>
  typeof x === 'object' && x !== null && typeof (x as { a?: unknown }).a === 'number';
const req = { system: 'SYS', user: 'USR', responseSchema: { type: 'object' }, validate: isObj };

function sdkWith(impl: (p: any) => Promise<any>) {
  const spy = vi.fn(impl);
  const sdk: GenAiLike = { models: { generateContent: spy } };
  return { sdk, spy };
}

describe('createVertexGeminiClient', () => {
  it('throws a clear error when projectId is empty', () => {
    expect(() => createVertexGeminiClient({ ...cfg, projectId: '' }, sdkWith(async () => ({})).sdk)).toThrow(
      /project/i,
    );
  });

  it('returns validated data and sends system, user, schema and safety settings', async () => {
    const { sdk, spy } = sdkWith(async () => ({ text: '{"a":1}', candidates: [{ finishReason: 'STOP' }] }));
    const res = await createVertexGeminiClient(cfg, sdk).generateJson(req);
    expect(res).toEqual({ ok: true, data: { a: 1 } });
    const p = spy.mock.calls[0]![0];
    expect(p.model).toBe('gemini-test');
    expect(p.contents).toContain('USR');
    expect(p.config.systemInstruction).toBe('SYS');
    expect(p.config.responseMimeType).toBe('application/json');
    expect(p.config.responseJsonSchema).toEqual({ type: 'object' });
    const st = Object.fromEntries(p.config.safetySettings.map((s: any) => [s.category, s.threshold]));
    expect(st).toEqual({
      HARM_CATEGORY_HARASSMENT: 'BLOCK_ONLY_HIGH',
      HARM_CATEGORY_HATE_SPEECH: 'BLOCK_ONLY_HIGH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'BLOCK_ONLY_HIGH',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'BLOCK_NONE',
    });
  });

  it('maps promptFeedback.blockReason to blocked', async () => {
    const { sdk } = sdkWith(async () => ({ promptFeedback: { blockReason: 'SAFETY' } }));
    expect(await createVertexGeminiClient(cfg, sdk).generateJson(req)).toEqual({ ok: false, reason: 'blocked' });
  });

  it.each(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'])('maps finishReason %s to blocked', async (fr) => {
    const { sdk } = sdkWith(async () => ({ text: '{"a":1}', candidates: [{ finishReason: fr }] }));
    expect(await createVertexGeminiClient(cfg, sdk).generateJson(req)).toEqual({ ok: false, reason: 'blocked' });
  });

  it('maps malformed JSON to invalid', async () => {
    const { sdk } = sdkWith(async () => ({ text: '{nope', candidates: [{ finishReason: 'STOP' }] }));
    expect(await createVertexGeminiClient(cfg, sdk).generateJson(req)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('maps empty text and schema-failing JSON to invalid', async () => {
    const empty = sdkWith(async () => ({ candidates: [{ finishReason: 'STOP' }] }));
    expect(await createVertexGeminiClient(cfg, empty.sdk).generateJson(req)).toEqual({ ok: false, reason: 'invalid' });
    const wrong = sdkWith(async () => ({ text: '{"a":"x"}' }));
    expect(await createVertexGeminiClient(cfg, wrong.sdk).generateJson(req)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('maps exceptions to error', async () => {
    const { sdk } = sdkWith(async () => {
      throw new Error('boom');
    });
    expect(await createVertexGeminiClient(cfg, sdk).generateJson(req)).toEqual({ ok: false, reason: 'error' });
  });
});
