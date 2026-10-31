import * as SecureStore from 'expo-secure-store';
import { getInviteCode, normalizeInviteCode, setInviteCode } from './inviteStore';

describe('inviteStore', () => {
  it('normalizes whitespace and case', () => {
    expect(normalizeInviteCode(' moji-r07-k3f9 ')).toBe('MOJI-R07-K3F9');
  });

  it('stores the normalized code under moji.invite', async () => {
    await setInviteCode(' moji-r07-k3f9 ');
    expect(await SecureStore.getItemAsync('moji.invite')).toBe('MOJI-R07-K3F9');
    expect(await getInviteCode()).toBe('MOJI-R07-K3F9');
  });

  it('setInviteCode(null) removes the code', async () => {
    await setInviteCode('ABC');
    await setInviteCode(null);
    expect(await getInviteCode()).toBeNull();
    expect(await SecureStore.getItemAsync('moji.invite')).toBeNull();
  });
});
