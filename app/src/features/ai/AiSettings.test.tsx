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
