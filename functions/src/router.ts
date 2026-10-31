import type { Config } from './config.js';
import type { GeminiClient } from './ai/gemini.js';
import { authorize } from './invites/guard.js';
import type { InviteStore } from './invites/store.js';
import { hashCode, type Logger } from './log.js';
import { handleAnalyzeEntry } from './handlers/analyzeEntry.js';
import { handleWriteInsight } from './handlers/writeInsight.js';
import { handleHealth } from './handlers/health.js';

export interface HttpRequestLike {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  body: unknown;
}
export interface HttpResponseLike {
  status: number;
  body: unknown;
}
export interface Deps {
  store: InviteStore;
  gemini: GeminiClient;
  cfg: Config;
  logger: Logger;
  now: () => Date;
}

/** Handler result: `reason` must be a fixed code, never free text. */
export interface HandlerResult extends HttpResponseLike {
  reason?: string;
}

const INVITE_HEADER = 'x-moji-invite';

const ROUTES: Record<string, { method: string; consume: boolean }> = {
  '/health': { method: 'GET', consume: false },
  '/analyzeEntry': { method: 'POST', consume: true },
  '/writeInsight': { method: 'POST', consume: true },
};

function headerValue(headers: Record<string, string | undefined>): string | undefined {
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === INVITE_HEADER) return v;
  }
  return undefined;
}

async function dispatch(req: HttpRequestLike, deps: Deps): Promise<HandlerResult & { codeHash: string | null }> {
  const route = ROUTES[req.path];
  if (!route) return { status: 404, body: { error: 'not_found' }, reason: 'not_found', codeHash: null };
  if (req.method !== route.method) {
    return { status: 405, body: { error: 'method_not_allowed' }, reason: 'method_not_allowed', codeHash: null };
  }

  const auth = await authorize(headerValue(req.headers), deps.store, deps.cfg, deps.now(), { consume: route.consume });
  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.error }, reason: auth.error, codeHash: null };
  }
  const codeHash = hashCode(auth.code);

  let result: HandlerResult;
  if (req.path === '/health') result = handleHealth();
  else if (req.path === '/analyzeEntry') result = await handleAnalyzeEntry(req.body, deps);
  else result = await handleWriteInsight(req.body, deps);
  return { ...result, codeHash };
}

export async function handleRequest(req: HttpRequestLike, deps: Deps): Promise<HttpResponseLike> {
  const started = Date.now();
  let out: HandlerResult & { codeHash: string | null };
  try {
    out = await dispatch(req, deps);
  } catch {
    out = { status: 500, body: { error: 'internal' }, reason: 'internal', codeHash: null };
  }
  const event = {
    endpoint: ROUTES[req.path] ? req.path : 'unknown',
    status: out.status,
    latencyMs: Date.now() - started,
    codeHash: out.codeHash,
    ...(out.reason !== undefined ? { reason: out.reason } : {}),
  };
  if (out.status >= 500) deps.logger.error(event);
  else deps.logger.info(event);
  return { status: out.status, body: out.body };
}
