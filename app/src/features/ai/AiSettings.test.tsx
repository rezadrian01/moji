import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { getInviteCode, setInviteCode } from '@/ai/inviteStore';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';

import AiSettingsScreen from '@/app/settings/ai';

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
