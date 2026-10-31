import { beforeEach, describe, expect, it } from 'vitest';
import type { Config } from '../config.js';
import { authorize, todayInZone } from './guard.js';
import { MemoryInviteStore } from './memoryStore.js';

const cfg: Config = {
  model: 'm', vertexLocation: 'global', projectId: 'p',
  perCodeDailyLimit: 50, globalDailyLimit: 1000, timeZone: 'Asia/Jakarta',
};
const A = 'MOJI-R07-K3F9';
const B = 'MOJI-R08-ZZZZ';
const noon = new Date('2026-11-01T05:00:00Z');
let store: MemoryInviteStore;

beforeEach(async () => {
  store = new MemoryInviteStore();
  await store.create({ code: A, active: true, label: null, createdAt: '2026-10-31' });
  await store.create({ code: B, active: true, label: 'b', createdAt: '2026-10-31' });
});

describe('todayInZone', () => {
  it('uses Asia/Jakarta', () => {
    expect(todayInZone(new Date('2026-11-01T17:30:00Z'), 'Asia/Jakarta')).toBe('2026-11-02');
    expect(todayInZone(new Date('2026-11-01T16:30:00Z'), 'Asia/Jakarta')).toBe('2026-11-01');
  });
});

describe('authorize', () => {
  it('401 without header', async () => {
    expect(await authorize(undefined, store, cfg, noon, { consume: true })).toEqual({ ok: false, status: 401, error: 'invalid_invite' });
  });
  it('401 for unknown code', async () => {
    const r = await authorize('MOJI-XXX-0000', store, cfg, noon, { consume: true });
    expect(r).toEqual({ ok: false, status: 401, error: 'invalid_invite' });
  });
  it('accepts lowercase/spaces and returns normalized code', async () => {
    expect(await authorize(' moji-r07-k3f9 ', store, cfg, noon, { consume: true })).toEqual({ ok: true, code: A });
  });
  it('403 for inactive code', async () => {
    await store.setActive(A, false);
    expect(await authorize(A, store, cfg, noon, { consume: true })).toEqual({ ok: false, status: 403, error: 'revoked_invite' });
  });
  it('429 code_limit on the 51st call', async () => {
    for (let i = 0; i < 50; i++) expect((await authorize(A, store, cfg, noon, { consume: true })).ok).toBe(true);
    expect(await authorize(A, store, cfg, noon, { consume: true })).toEqual({ ok: false, status: 429, error: 'code_limit' });
  });
  it('resets when the Jakarta date changes', async () => {
    for (let i = 0; i < 50; i++) await authorize(A, store, cfg, noon, { consume: true });
    const next = new Date('2026-11-01T17:30:00Z');
    expect((await authorize(A, store, cfg, next, { consume: true })).ok).toBe(true);
  });
  it('429 global_limit across codes', async () => {
    const c = { ...cfg, globalDailyLimit: 3 };
    expect((await authorize(A, store, c, noon, { consume: true })).ok).toBe(true);
    expect((await authorize(B, store, c, noon, { consume: true })).ok).toBe(true);
    expect((await authorize(A, store, c, noon, { consume: true })).ok).toBe(true);
    expect(await authorize(B, store, c, noon, { consume: true })).toEqual({ ok: false, status: 429, error: 'global_limit' });
  });
  it('consume:false does not count', async () => {
    const c = { ...cfg, perCodeDailyLimit: 1 };
    for (let i = 0; i < 5; i++) expect((await authorize(A, store, c, noon, { consume: false })).ok).toBe(true);
    expect((await store.get(A))?.dailyCount).toBe(0);
    expect((await authorize(A, store, c, noon, { consume: true })).ok).toBe(true);
  });
});
