import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { getInviteCode, setInviteCode } from '@/ai/inviteStore';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';

import AiSettingsScreen from '@/app/settings/ai';

jest.mock('@/ai/client', () => ({
  defaultAiClient: () => ({ checkInvite: async () => ({ ok: true, data: { valid: true } }) }),
}));

const REVOKED_TEXT =
  'Kode undanganmu sudah tidak aktif. MOJI tetap jalan tanpa AI. Kamu bisa memasukkan kode baru kapan saja.';
const INVALID_TEXT =
  'Kode undanganmu belum cocok. MOJI tetap jalan tanpa AI. Kamu bisa memasukkan kode baru kapan saja.';

it('turning the toggle off sets aiEnabled false and keeps the code', async () => {
  const db = await createTestDb();
  await setInviteCode('MOJI-R07-K3F9');
  await updateSettings(db, { aiEnabled: true, aiConsentAt: '2026-10-31T09:00:00.000Z' });
  await render(
    <AppProviders db={db}>
      <AiSettingsScreen />
    </AppProviders>,
  );
  await fireEvent(await screen.findByLabelText('Bantuan AI'), 'valueChange', false);
  await waitFor(async () => expect((await getSettings(db)).aiEnabled).toBe(false));
  expect(await getInviteCode()).toBe('MOJI-R07-K3F9');
  expect(screen.getByLabelText('Ganti kode')).toBeTruthy();
});

describe('settings/ai toggling', () => {
  async function setup(withCode: boolean, aiEnabled = false) {
    const db = await createTestDb();
    await setInviteCode(withCode ? 'MOJI-R07-K3F9' : null);
    if (aiEnabled) await updateSettings(db, { aiEnabled: true, aiConsentAt: '2026-10-31T09:00:00.000Z' });
    await render(
      <AppProviders db={db}>
        <AiSettingsScreen />
      </AppProviders>,
    );
    return db;
  }

  it('turning on with an existing code sets aiEnabled and aiConsentAt', async () => {
    const db = await setup(true);
    await fireEvent(await screen.findByLabelText('Bantuan AI'), 'valueChange', true);
    await waitFor(async () => expect((await getSettings(db)).aiEnabled).toBe(true));
    expect((await getSettings(db)).aiConsentAt).not.toBeNull();
  });

  it('turning on without a code shows the form and keeps AI off', async () => {
    const db = await setup(false);
    await fireEvent(await screen.findByLabelText('Bantuan AI'), 'valueChange', true);
    expect(await screen.findByLabelText('Kode undangan')).toBeTruthy();
    expect((await getSettings(db)).aiEnabled).toBe(false);
  });

  it('"Ganti kode" does not change aiEnabled and "Batal" closes the form', async () => {
    const db = await setup(true, true);
    await fireEvent.press(await screen.findByLabelText('Ganti kode'));
    expect(screen.getByLabelText('Kode undangan')).toBeTruthy();
    expect((await getSettings(db)).aiEnabled).toBe(true);
    await fireEvent.press(screen.getByLabelText('Batal'));
    expect(screen.queryByLabelText('Kode undangan')).toBeNull();
    expect(screen.getByLabelText('Ganti kode')).toBeTruthy();
  });
});

describe('settings/ai invite code problem', () => {
  async function setup(problem: 'invalid' | 'revoked' | null) {
    const db = await createTestDb();
    await setInviteCode('MOJI-R07-K3F9');
    await updateSettings(db, { aiEnabled: true, aiConsentAt: '2026-10-31T09:00:00.000Z', aiCodeProblem: problem });
    await render(
      <AppProviders db={db}>
        <AiSettingsScreen />
      </AppProviders>,
    );
    await screen.findByLabelText('Bantuan AI');
    return db;
  }

  it('shows one gentle line when the code was revoked', async () => {
    await setup('revoked');
    expect(screen.getByText(REVOKED_TEXT)).toBeTruthy();
    expect(screen.queryByText(INVALID_TEXT)).toBeNull();
  });

  it('shows one gentle line when the code no longer matches', async () => {
    await setup('invalid');
    expect(screen.getByText(INVALID_TEXT)).toBeTruthy();
  });

  it('shows nothing extra when there is no problem', async () => {
    await setup(null);
    expect(screen.queryByText(REVOKED_TEXT)).toBeNull();
    expect(screen.queryByText(INVALID_TEXT)).toBeNull();
  });

  it('clears the problem once a new valid code is saved, without touching aiEnabled', async () => {
    const db = await setup('revoked');
    await fireEvent.press(screen.getByLabelText('Ganti kode'));
    await fireEvent.changeText(screen.getByLabelText('Kode undangan'), 'moji-new-0001');
    await fireEvent.press(screen.getByLabelText('Cek kode'));
    await waitFor(async () => expect((await getSettings(db)).aiCodeProblem).toBeNull());
    expect(await getInviteCode()).toBe('MOJI-NEW-0001');
    expect((await getSettings(db)).aiEnabled).toBe(true);
    await waitFor(() => expect(screen.queryByText(REVOKED_TEXT)).toBeNull());
  });
});
