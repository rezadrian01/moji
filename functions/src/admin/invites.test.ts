import { describe, expect, it } from 'vitest';
import { generateInviteCodes } from './invites.js';
import { normalizeInviteCode } from '../invites/normalize.js';

const seeded = () => {
  let s = 12345;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
};

describe('generateInviteCodes', () => {
  it('produces codes valid for normalizeInviteCode, in MOJI-R07-XXXX style', () => {
    const codes = generateInviteCodes(3, 7, seeded(), 'R');
    expect(codes).toHaveLength(3);
    for (const c of codes) expect(normalizeInviteCode(c)).toBe(c);
    expect(codes[0]).toMatch(/^MOJI-R07-[A-Z2-9]{4}$/);
    expect(codes[1]).toMatch(/^MOJI-R08-/);
  });

  it('is unique for n=50', () => {
    expect(new Set(generateInviteCodes(50, 1, Math.random)).size).toBe(50);
  });

  it('suffix alphabet never has 0, O, 1 or I', () => {
    for (const c of generateInviteCodes(200, 1, Math.random)) expect(c.slice(-4)).not.toMatch(/[01OI]/);
  });
});

describe('runCli', () => {
  it('create prints label,code CSV; revoke and list work', async () => {
    const { MemoryInviteStore } = await import('../invites/memoryStore.js');
    const { runCli } = await import('./invites.js');
    const store = new MemoryInviteStore();
    const out: string[] = [];
    expect(await runCli(['create', '2', '--prefix', 'R'], store, (s) => out.push(s))).toBe(0);
    expect(out[0]).toBe('label,code');
    expect(out).toHaveLength(3);
    const code = out[1]!.split(',')[1]!;
    expect((await store.get(code))!.active).toBe(true);
    expect(await runCli(['revoke', code.toLowerCase()], store, () => {})).toBe(0);
    expect((await store.get(code))!.active).toBe(false);
    const listed: string[] = [];
    await runCli(['list'], store, (s) => listed.push(s));
    expect(listed).toHaveLength(3);
    expect(await runCli(['bogus'], store, () => {})).toBe(1);
  });

  it('retries on collisions so exactly n new codes are created', async () => {
    const { MemoryInviteStore } = await import('../invites/memoryStore.js');
    const { runCli } = await import('./invites.js');
    const store = new MemoryInviteStore();
    await store.create({ code: 'MOJI-R02-AAAA', active: true, label: null, createdAt: 'x' });
    // First 4 draws give suffix AAAA (collides with the existing R02 code), then 0.5.
    const draws = [0, 0, 0, 0];
    const rand = () => draws.shift() ?? 0.5;
    const out: string[] = [];
    expect(await runCli(['create', '1'], store, (s) => out.push(s), rand)).toBe(0);
    expect(out).toHaveLength(2);
    expect(out[1]).not.toContain('AAAA');
    expect(await store.list()).toHaveLength(2);
  });
});
