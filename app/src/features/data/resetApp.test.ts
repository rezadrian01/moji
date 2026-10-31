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

it('tetap menghapus data walaupun membatalkan pengingat atau menghapus kode gagal', async () => {
  await createEntry(db, { mood: 3, note: 'x' }, new Date());
  (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockRejectedValueOnce(new Error('gagal'));
  await resetApp(db);
  expect(await listEntries(db, {})).toEqual([]);
});

it('tidak menyentuh kode undangan dan pengingat sebelum wipe, dan wipe dijalankan terakhir', async () => {
  await createEntry(db, { mood: 3, note: 'x' }, new Date());
  await setInviteCode('MOJI-R07-K3F9');
  const order: string[] = [];
  (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockImplementationOnce(async () => {
    order.push(`cancel(entries=${(await listEntries(db, {})).length})`);
  });
  await resetApp(db);
  expect(order).toEqual(['cancel(entries=1)']);
});

it('melempar error kalau wipe gagal, dengan pengingat dan kode sudah dibersihkan', async () => {
  const broken = { ...db, withTransactionAsync: async () => { throw new Error('db gagal'); } } as Db;
  await expect(resetApp(broken)).rejects.toThrow('db gagal');
});
