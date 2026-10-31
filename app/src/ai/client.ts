import {
  isAnalyzeEntryResponse,
  isWriteInsightResponse,
  type AnalyzeEntryRequest,
  type AnalyzeEntryResponse,
  type WriteInsightRequest,
  type WriteInsightResponse,
} from './contract';
import { getInviteCode, normalizeInviteCode } from './inviteStore';

export type AiFailure =
  | 'disabled'
  | 'no_code'
  | 'invalid_invite'
  | 'revoked_invite'
  | 'rate_limited'
  | 'network'
  | 'timeout'
  | 'bad_response';
export type AiResult<T> = { ok: true; data: T } | { ok: false; reason: AiFailure };

export interface AiClientDeps {
  baseUrl: string | undefined;
  fetchFn: typeof fetch;
  getCode: () => Promise<string | null>;
  timeoutMs: number;
}

const DEFAULT_TIMEOUT_MS = 15000;

export function createAiClient(deps: AiClientDeps) {
  async function call<T>(
    path: string,
    method: 'GET' | 'POST',
    code: string | null,
    body: unknown,
    guard: (x: unknown) => boolean,
  ): Promise<AiResult<T>> {
    if (!deps.baseUrl) return { ok: false, reason: 'disabled' };
    if (!code || !normalizeInviteCode(code)) return { ok: false, reason: 'no_code' };

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, deps.timeoutMs);

    try {
      const response = await deps.fetchFn(`${deps.baseUrl}${path}`, {
        method,
        headers: { 'X-Moji-Invite': normalizeInviteCode(code), 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.status === 401) return { ok: false, reason: 'invalid_invite' };
      if (response.status === 403) return { ok: false, reason: 'revoked_invite' };
      if (response.status === 429) return { ok: false, reason: 'rate_limited' };
      if (!response.ok) return { ok: false, reason: 'network' };
      let json: unknown;
      try {
        json = await response.json();
      } catch {
        return { ok: false, reason: 'bad_response' };
      }
      if (!guard(json)) return { ok: false, reason: 'bad_response' };
      return { ok: true, data: json as T };
    } catch {
      return { ok: false, reason: timedOut ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async analyzeEntry(req: AnalyzeEntryRequest): Promise<AiResult<AnalyzeEntryResponse>> {
      return call('/analyzeEntry', 'POST', await deps.getCode(), req, isAnalyzeEntryResponse);
    },
    async writeInsight(req: WriteInsightRequest): Promise<AiResult<WriteInsightResponse>> {
      const keys = req.patterns.map((p) => p.key);
      return call('/writeInsight', 'POST', await deps.getCode(), req, (x) => isWriteInsightResponse(x, keys));
    },
    async checkInvite(code: string): Promise<AiResult<{ valid: true }>> {
      const r = await call<unknown>('/health', 'GET', code, undefined, () => true);
      return r.ok ? { ok: true, data: { valid: true } } : r;
    },
  };
}

export function defaultAiClient() {
  return createAiClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL,
    fetchFn: (...args) => fetch(...args),
    getCode: getInviteCode,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
}
