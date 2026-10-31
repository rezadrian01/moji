/** @jest-environment node */
import * as Notifications from 'expo-notifications';

import { getInviteCode, setInviteCode } from '@/ai/inviteStore';
import type { Db } from '@/db/db';
import { createEntry, listEntries } from '@/db/entriesRepo';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { DEFAULT_SETTINGS } from '@/domain/types';

import { resetApp } from './resetApp';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  jest.clearAllMocks();
});

it('mengosongkan tabel, menghapus kode undangan, dan membatalkan pengingat', async () => {
  await createEntry(db, { mood: 3, note: 'x' }, new Date());
  await updateSettings(db, { onboardingDone: true, aiEnabled: true });
  await setInviteCode('MOJI-R07-K3F9');

  await resetApp(db);

  expect(await listEntries(db, {})).toEqual([]);
  expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
  expect(await getInviteCode()).toBeNull();
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
});
