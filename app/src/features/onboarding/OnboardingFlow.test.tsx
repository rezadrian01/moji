import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { AiFailure } from '@/ai/client';
import { getInviteCode, setInviteCode } from '@/ai/inviteStore';
import type { Db } from '@/db/db';
import { getSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';

import { OnboardingFlow } from './OnboardingFlow';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  SplashScreen: { preventAutoHideAsync: jest.fn(async () => undefined), hide: jest.fn() },
}));

function fakeClient(reason?: AiFailure) {
  return {
    checkInvite: jest.fn(async () =>
      reason ? { ok: false as const, reason } : { ok: true as const, data: { valid: true as const } },
    ),
  };
}

let db: Db;
async function setup(client = fakeClient()) {
  db = await createTestDb();
  await render(
    <AppProviders db={db}>
      <OnboardingFlow client={client} />
    </AppProviders>,
  );
}
const press = (label: string) => fireEvent.press(screen.getByLabelText(label));

beforeEach(async () => {
  mockReplace.mockClear();
  await setInviteCode(null);
});

describe('OnboardingFlow', () => {
  it('step 1 says MOJI is not a diagnosis tool', async () => {
    await setup();
    expect(screen.getByText('Hai, ini MOJI.')).toBeTruthy();
    expect(screen.getByText(/bukan alat diagnosis/)).toBeTruthy();
  });

  it('skipping steps 1-2 and choosing "Nanti saja" finishes with AI off', async () => {
    await setup();
    await press('Lewati');
    expect(screen.getByText('Catatanmu milikmu.')).toBeTruthy();
    await press('Lewati');
    expect(screen.getByText('Mau pakai bantuan AI?')).toBeTruthy();
    expect(screen.getByText(/tidak menyimpan/)).toBeTruthy();
    expect(screen.getByText(/mematikannya kapan saja/)).toBeTruthy();
    expect(screen.queryByLabelText('Lewati')).toBeNull();
    await press('Nanti saja');
    await press('Mulai');
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    const s = await getSettings(db);
    expect(s.onboardingDone).toBe(true);
    expect(s.aiEnabled).toBe(false);
    expect(s.aiConsentAt).toBeNull();
  });

  it('enables AI with consent after a valid invite code', async () => {
    await setup();
    await press('Lewati');
    await press('Lewati');
    await press('Aktifkan');
    await fireEvent.changeText(screen.getByLabelText('Kode undangan'), 'moji-r07-k3f9');
    await press('Cek kode');
    expect(await screen.findByText('Pengingat & kontak (opsional)')).toBeTruthy();
    await press('Mulai');
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    const s = await getSettings(db);
    expect(s.aiEnabled).toBe(true);
    expect(s.aiConsentAt).not.toBeNull();
    expect(await getInviteCode()).toBe('MOJI-R07-K3F9');
  });

  it('keeps AI off and shows the message for an invalid code', async () => {
    await setup(fakeClient('invalid_invite'));
    await press('Lewati');
    await press('Lewati');
    await press('Aktifkan');
    await fireEvent.changeText(screen.getByLabelText('Kode undangan'), 'salah');
    await press('Cek kode');
    expect(await screen.findByText('Kodenya belum cocok. Coba cek lagi, ya.')).toBeTruthy();
    await press('Nanti saja');
    await press('Mulai');
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    const s = await getSettings(db);
    expect(s.aiEnabled).toBe(false);
    expect(s.aiConsentAt).toBeNull();
  });

  it('saves the daily reminder time (default 20:00) when the toggle is on', async () => {
    await setup();
    await press('Lewati');
    await press('Lewati');
    await press('Nanti saja');
    await fireEvent(screen.getByLabelText('Pengingat harian'), 'valueChange', true);
    await press('Mulai');
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect((await getSettings(db)).reminderTime).toBe('20:00');
  });
});
