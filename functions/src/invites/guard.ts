import type { Config } from '../config.js';
import { normalizeInviteCode } from './normalize.js';
import type { InviteStore } from './store.js';

export type GuardResult =
  | { ok: true; code: string }
  | { ok: false; status: 401 | 403 | 429; error: 'invalid_invite' | 'revoked_invite' | 'code_limit' | 'global_limit' };

/** "YYYY-MM-DD" of `now` in the given IANA time zone. */
export function todayInZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export async function authorize(
  headerValue: string | undefined,
  store: InviteStore,
  cfg: Config,
  now: Date,
  opts: { consume: boolean },
): Promise<GuardResult> {
  const code = normalizeInviteCode(headerValue);
  if (!code) return { ok: false, status: 401, error: 'invalid_invite' };
  const rec = await store.get(code);
  if (!rec) return { ok: false, status: 401, error: 'invalid_invite' };
  if (!rec.active) return { ok: false, status: 403, error: 'revoked_invite' };
  if (opts.consume) {
    const r = await store.consume(code, todayInZone(now, cfg.timeZone), cfg.perCodeDailyLimit, cfg.globalDailyLimit);
    if (r !== 'ok') return { ok: false, status: 429, error: r };
  }
  return { ok: true, code };
}
