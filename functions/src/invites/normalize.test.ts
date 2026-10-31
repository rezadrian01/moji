import { describe, expect, it } from 'vitest';
import { normalizeInviteCode } from './normalize.js';

describe('normalizeInviteCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeInviteCode(' moji-r07-k3f9 ')).toBe('MOJI-R07-K3F9');
  });
  it('rejects malformed or missing', () => {
    expect(normalizeInviteCode('abc')).toBeNull();
    expect(normalizeInviteCode(undefined)).toBeNull();
    expect(normalizeInviteCode('MOJI-R-K3F9')).toBeNull();
    expect(normalizeInviteCode('MOJI-R07-K3F9X')).toBeNull();
  });
});
