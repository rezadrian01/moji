import { describe, expect, it } from 'vitest';
import { createLogger, hashCode, type LogEvent } from './log.js';

describe('logger', () => {
  it('writes one JSON line per event', () => {
    const lines: string[] = [];
    const log = createLogger((l) => lines.push(l));
    log.info({ endpoint: '/insight', status: 200, latencyMs: 12, codeHash: hashCode('MOJI-R07-K3F9') });
    log.error({ endpoint: '/insight', status: 500, latencyMs: 3, codeHash: null, reason: 'model_error' });
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toMatchObject({ level: 'info', endpoint: '/insight', status: 200 });
    expect(JSON.parse(lines[1]!)).toMatchObject({ level: 'error', reason: 'model_error' });
    expect(lines[0]).not.toContain('\n');
  });
  it('drops unexpected fields such as journal text at runtime', () => {
    const lines: string[] = [];
    const log = createLogger((l) => lines.push(l));
    const evil = { endpoint: '/x', status: 200, latencyMs: 1, codeHash: null, text: 'catatan rahasia' } as unknown as LogEvent;
    log.info(evil);
    expect(lines[0]).not.toContain('rahasia');
  });
  it('LogEvent type rejects free text', () => {
    // @ts-expect-error free-text fields are not part of LogEvent
    const e: LogEvent = { endpoint: '/x', status: 200, latencyMs: 1, codeHash: null, text: 'x' };
    void e;
  });
  it('hashCode is deterministic, 12 hex chars, not the code', () => {
    const c = 'MOJI-R07-K3F9';
    expect(hashCode(c)).toBe(hashCode(c));
    expect(hashCode(c)).toMatch(/^[0-9a-f]{12}$/);
    expect(hashCode(c)).not.toBe(c);
    expect(hashCode('MOJI-R07-K3F8')).not.toBe(hashCode(c));
  });
});
