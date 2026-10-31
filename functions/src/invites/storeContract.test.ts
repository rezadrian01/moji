import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { FileInviteStore } from './fileStore.js';
import { MemoryInviteStore } from './memoryStore.js';
import type { InviteStore } from './store.js';

const dirs: string[] = [];
async function tmpFile(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), 'moji-store-'));
  dirs.push(d);
  return join(d, 'nested', 'invites.json');
}
afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
});

const rec = (code: string) => ({ code, active: true, label: null, createdAt: '2026-10-31' });
const A = 'MOJI-R01-AAAA';
const B = 'MOJI-R02-BBBB';

const factories: Array<[string, () => Promise<InviteStore>]> = [
  ['MemoryInviteStore', async () => new MemoryInviteStore()],
  ['FileInviteStore', async () => new FileInviteStore(await tmpFile())],
];

describe.each(factories)('InviteStore contract: %s', (_name, make) => {
  it('get returns null for unknown code and list is empty', async () => {
    const s = await make();
    expect(await s.get(A)).toBeNull();
    expect(await s.list()).toEqual([]);
  });

  it('create then get returns zeroed counters', async () => {
    const s = await make();
    await s.create({ ...rec(A), label: 'x' });
    expect(await s.get(A)).toEqual({ code: A, active: true, label: 'x', createdAt: '2026-10-31', dailyCount: 0, countDate: '' });
  });

  it('setActive toggles and ignores unknown codes', async () => {
    const s = await make();
    await s.create(rec(A));
    await s.setActive(A, false);
    expect((await s.get(A))?.active).toBe(false);
    await s.setActive(B, false);
    expect(await s.get(B)).toBeNull();
  });

  it('consume increments code and global counters together', async () => {
    const s = await make();
    await s.create(rec(A));
    await s.create(rec(B));
    expect(await s.consume(A, '2026-11-01', 5, 3)).toBe('ok');
    expect(await s.consume(B, '2026-11-01', 5, 3)).toBe('ok');
    expect(await s.consume(A, '2026-11-01', 5, 3)).toBe('ok');
    expect(await s.consume(B, '2026-11-01', 5, 3)).toBe('global_limit');
    expect((await s.get(A))?.dailyCount).toBe(2);
    expect((await s.get(B))?.dailyCount).toBe(1);
  });

  it('consume returns code_limit at the per-code limit', async () => {
    const s = await make();
    await s.create(rec(A));
    expect(await s.consume(A, '2026-11-01', 2, 100)).toBe('ok');
    expect(await s.consume(A, '2026-11-01', 2, 100)).toBe('ok');
    expect(await s.consume(A, '2026-11-01', 2, 100)).toBe('code_limit');
  });

  it('consume on an unknown code is code_limit and counts nothing', async () => {
    const s = await make();
    await s.create(rec(A));
    expect(await s.consume(B, '2026-11-01', 5, 1)).toBe('code_limit');
    expect(await s.consume(A, '2026-11-01', 5, 1)).toBe('ok');
  });

  it('resets counts when the date changes', async () => {
    const s = await make();
    await s.create(rec(A));
    expect(await s.consume(A, '2026-11-01', 1, 1)).toBe('ok');
    expect(await s.consume(A, '2026-11-01', 1, 1)).toBe('code_limit');
    expect(await s.consume(A, '2026-11-02', 1, 1)).toBe('ok');
    expect(await s.get(A)).toMatchObject({ dailyCount: 1, countDate: '2026-11-02' });
  });
});

describe('FileInviteStore persistence', () => {
  it('keeps data across instances with the same path', async () => {
    const path = await tmpFile();
    const s1 = new FileInviteStore(path);
    await s1.create(rec(A));
    await s1.consume(A, '2026-11-01', 5, 5);
    const s2 = new FileInviteStore(path);
    expect(await s2.get(A)).toMatchObject({ dailyCount: 1, countDate: '2026-11-01' });
    expect(await s2.consume(A, '2026-11-01', 5, 1)).toBe('global_limit');
  });

  it('50 parallel consumes count exactly and leave valid JSON', async () => {
    const path = await tmpFile();
    const s = new FileInviteStore(path);
    await s.create(rec(A));
    const results = await Promise.all(Array.from({ length: 50 }, () => s.consume(A, '2026-11-01', 1000, 1000)));
    expect(results.every((r) => r === 'ok')).toBe(true);
    expect((await s.get(A))?.dailyCount).toBe(50);
    const parsed = JSON.parse(await readFile(path, 'utf8'));
    expect(parsed.invites[A].dailyCount).toBe(50);
    expect(parsed.usage['2026-11-01']).toBe(50);
  });

  it('parallel consumes respect the limit', async () => {
    const s = new FileInviteStore(await tmpFile());
    await s.create(rec(A));
    const results = await Promise.all(Array.from({ length: 10 }, () => s.consume(A, '2026-11-01', 4, 1000)));
    expect(results.filter((r) => r === 'ok')).toHaveLength(4);
  });

  it('a missing file is an empty store', async () => {
    const s = new FileInviteStore(await tmpFile());
    expect(await s.list()).toEqual([]);
  });
});
