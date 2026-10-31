import { randomInt } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { FirestoreInviteStore } from '../invites/firestoreStore.js';
import { normalizeInviteCode } from '../invites/normalize.js';
import type { InviteStore } from '../invites/store.js';

// No 0, O, 1, I: avoids look-alike characters when codes are typed by hand.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** e.g. "MOJI-R07-K3F9": prefix + zero-padded running index, then a 4-char random suffix. */
export function generateInviteCodes(n: number, startIndex: number, rand: () => number, prefix = 'R'): string[] {
  const out = new Set<string>();
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const batch = `${prefix}${String(startIndex + i).padStart(2, '0')}`;
    let code: string;
    do {
      let suffix = '';
      for (let j = 0; j < 4; j++) suffix += ALPHABET[Math.floor(rand() * ALPHABET.length)];
      code = `MOJI-${batch}-${suffix}`;
    } while (out.has(code));
    out.add(code);
    codes.push(code);
  }
  return codes;
}

const secureRand = () => randomInt(0, 2 ** 30) / 2 ** 30;

export async function runCli(argv: string[], store: InviteStore, print: (s: string) => void): Promise<number> {
  const [cmd, ...rest] = argv;
  if (cmd === 'create') {
    const n = Number(rest[0]);
    if (!Number.isInteger(n) || n <= 0) {
      print('Usage: invites create <n> [--prefix R]');
      return 1;
    }
    const pi = rest.indexOf('--prefix');
    const prefix = pi >= 0 ? (rest[pi + 1] ?? '').toUpperCase() : 'R';
    if (!/^[A-Z]$/.test(prefix)) {
      print('--prefix must be a single letter');
      return 1;
    }
    const existing = new Set((await store.list()).map((r) => r.code));
    const start = (await store.list()).length + 1;
    const codes = generateInviteCodes(n, start, secureRand, prefix).filter((c) => !existing.has(c));
    print('label,code');
    const now = new Date().toISOString();
    for (const [i, code] of codes.entries()) {
      const label = `${prefix}${String(start + i).padStart(2, '0')}`;
      await store.create({ code, active: true, label, createdAt: now });
      print(`${label},${code}`);
    }
    return 0;
  }
  if (cmd === 'revoke') {
    const code = normalizeInviteCode(rest[0]);
    if (!code || !(await store.get(code))) {
      print('Code not found');
      return 1;
    }
    await store.setActive(code, false);
    print(`revoked ${code}`);
    return 0;
  }
  if (cmd === 'list') {
    print('label,code,active,dailyCount,countDate');
    for (const r of await store.list()) print(`${r.label ?? ''},${r.code},${r.active},${r.dailyCount},${r.countDate}`);
    return 0;
  }
  print('Usage: invites create <n> [--prefix R] | revoke <code> | list');
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2), new FirestoreInviteStore(), (s) => console.log(s)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e instanceof Error ? e.message : 'failed');
      process.exit(1);
    },
  );
}
