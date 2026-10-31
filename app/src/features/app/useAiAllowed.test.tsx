import { renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { setInviteCode } from '@/ai/inviteStore';
import type { Db } from '@/db/db';
import { updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';

import { AppProviders } from './AppProviders';
import { useAiAllowed } from './useAiAllowed';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  await setInviteCode(null);
});

async function renderAiAllowed() {
  const { result } = await renderHook(() => useAiAllowed(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <AppProviders db={db}>{children}</AppProviders>
    ),
  });
  await waitFor(() => expect(result.current).toEqual(expect.any(Function)));
  return result;
}

describe('useAiAllowed', () => {
  it('is false on a fresh database', async () => {
    const result = await renderAiAllowed();
    expect(await result.current()).toBe(false);
  });

  it('is true once AI is enabled, consented to, and an invite code is stored', async () => {
    const result = await renderAiAllowed();
    await updateSettings(db, { aiEnabled: true, aiConsentAt: '2026-10-31T09:00:00.000+07:00' });
    await setInviteCode('MOJI-R07-K3F9');
    expect(await result.current()).toBe(true);
  });

  it('re-reads settings on every call, so turning AI off takes effect immediately', async () => {
    const result = await renderAiAllowed();
    const isAllowed = result.current;
    await updateSettings(db, { aiEnabled: true, aiConsentAt: '2026-10-31T09:00:00.000+07:00' });
    await setInviteCode('MOJI-R07-K3F9');
    expect(await isAllowed()).toBe(true);

    await updateSettings(db, { aiEnabled: false });
    expect(await isAllowed()).toBe(false);
  });

  it('is false without consent even when enabled and a code exists', async () => {
    const result = await renderAiAllowed();
    await updateSettings(db, { aiEnabled: true, aiConsentAt: null });
    await setInviteCode('MOJI-R07-K3F9');
    expect(await result.current()).toBe(false);
  });

  it('is false without an invite code even when enabled and consented', async () => {
    const result = await renderAiAllowed();
    await updateSettings(db, { aiEnabled: true, aiConsentAt: '2026-10-31T09:00:00.000+07:00' });
    expect(await result.current()).toBe(false);
  });

  it('is false (does not reject) when SecureStore throws', async () => {
    const result = await renderAiAllowed();
    await updateSettings(db, { aiEnabled: true, aiConsentAt: '2026-10-31T09:00:00.000+07:00' });
    const getItem = jest.mocked(SecureStore.getItemAsync);
    const original = getItem.getMockImplementation()!;
    getItem.mockImplementation(async () => {
      throw new Error('keystore unavailable');
    });
    try {
      await expect(result.current()).resolves.toBe(false);
    } finally {
      getItem.mockImplementation(original);
    }
  });
});
