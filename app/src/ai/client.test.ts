import analyzeReq from '../../../contract/fixtures/analyzeEntry.request.json';
import analyzeRes from '../../../contract/fixtures/analyzeEntry.response.json';
import insightReq from '../../../contract/fixtures/writeInsight.request.json';
import insightRes from '../../../contract/fixtures/writeInsight.response.json';
import type { AnalyzeEntryRequest, WriteInsightRequest } from './contract';
import { createAiClient } from './client';

const aReq = analyzeReq as unknown as AnalyzeEntryRequest;
const iReq = insightReq as unknown as WriteInsightRequest;

function res(status: number, body: unknown = {}): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

function make(fetchFn: jest.Mock, over: Partial<Parameters<typeof createAiClient>[0]> = {}) {
  return createAiClient({
    baseUrl: 'https://api.test',
    fetchFn: fetchFn as unknown as typeof fetch,
    getCode: async () => 'MOJI-1',
    timeoutMs: 15000,
    ...over,
  });
}

describe('ai client', () => {
  it('returns disabled when baseUrl is empty', async () => {
    const f = jest.fn();
    expect(await make(f, { baseUrl: undefined }).analyzeEntry(aReq)).toEqual({ ok: false, reason: 'disabled' });
    expect(await make(f, { baseUrl: '' }).analyzeEntry(aReq)).toEqual({ ok: false, reason: 'disabled' });
    expect(f).not.toHaveBeenCalled();
  });

  it('returns no_code when there is no code', async () => {
    const f = jest.fn();
    expect(await make(f, { getCode: async () => null }).analyzeEntry(aReq)).toEqual({ ok: false, reason: 'no_code' });
    expect(f).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'invalid_invite'],
    [403, 'revoked_invite'],
    [429, 'rate_limited'],
    [500, 'network'],
    [503, 'network'],
  ])('maps status %i to %s', async (status, reason) => {
    const f = jest.fn().mockResolvedValue(res(status));
    expect(await make(f).analyzeEntry(aReq)).toEqual({ ok: false, reason });
  });

  it('maps fetch errors to network', async () => {
    const f = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    expect(await make(f).analyzeEntry(aReq)).toEqual({ ok: false, reason: 'network' });
  });

  it('maps unparsable 200 body to bad_response', async () => {
    const f = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => {
        throw new Error('x');
      },
    });
    expect(await make(f).analyzeEntry(aReq)).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('maps a 200 body failing the guard to bad_response', async () => {
    const f = jest.fn().mockResolvedValue(res(200, { nope: true }));
    expect(await make(f).analyzeEntry(aReq)).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('maps abort on timeout to timeout', async () => {
    jest.useFakeTimers();
    try {
      const f = jest.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_, reject) => {
            init.signal!.addEventListener('abort', () =>
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
            );
          }),
      );
      const p = make(f as unknown as jest.Mock, { timeoutMs: 50 }).analyzeEntry(aReq);
      await jest.advanceTimersByTimeAsync(60);
      expect(await p).toEqual({ ok: false, reason: 'timeout' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('analyzeEntry returns fixture response and sends normalized headers', async () => {
    const f = jest.fn().mockResolvedValue(res(200, analyzeRes));
    const r = await make(f, { getCode: async () => ' moji-r07-k3f9 ' }).analyzeEntry(aReq);
    expect(r).toEqual({ ok: true, data: analyzeRes });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.test/analyzeEntry');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Moji-Invite']).toBe('MOJI-R07-K3F9');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(analyzeReq);
  });

  it('writeInsight returns fixture response', async () => {
    const f = jest.fn().mockResolvedValue(res(200, insightRes));
    const r = await make(f).writeInsight(iReq);
    expect(r).toEqual({ ok: true, data: insightRes });
    expect(f.mock.calls[0][0]).toBe('https://api.test/writeInsight');
  });

  it('writeInsight with foreign patternTexts keys is bad_response', async () => {
    const f = jest.fn().mockResolvedValue(res(200, { ...insightRes, patternTexts: { asing: 'x' } }));
    expect(await make(f).writeInsight(iReq)).toEqual({ ok: false, reason: 'bad_response' });
  });

  it('checkInvite does GET /health with the given normalized code', async () => {
    const f = jest.fn().mockResolvedValue(res(200, {}));
    const r = await make(f, { getCode: async () => null }).checkInvite(' moji-r07-k3f9 ');
    expect(r).toEqual({ ok: true, data: { valid: true } });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.test/health');
    expect(init.method).toBe('GET');
    expect(init.headers['X-Moji-Invite']).toBe('MOJI-R07-K3F9');
  });

  it('checkInvite maps 401 to invalid_invite', async () => {
    const f = jest.fn().mockResolvedValue(res(401));
    expect(await make(f).checkInvite('X')).toEqual({ ok: false, reason: 'invalid_invite' });
  });
});
