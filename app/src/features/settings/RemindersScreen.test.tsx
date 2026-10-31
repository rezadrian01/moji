import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import RemindersScreen from '@/app/settings/reminders';
import type { Db } from '@/db/db';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  SplashScreen: { preventAutoHideAsync: jest.fn(async () => undefined), hide: jest.fn() },
}));

let db: Db;
async function renderReminders() {
  await render(
    <AppProviders db={db}>
      <RemindersScreen />
    </AppProviders>,
  );
}

beforeEach(async () => {
  db = await createTestDb();
  jest.clearAllMocks();
});

it('mengubah jam pengingat ke 21:00 menjadwalkan notifikasi jam 21', async () => {
  await updateSettings(db, { reminderTime: '20:00' });
  await renderReminders();
  await fireEvent.press(await screen.findByLabelText('21:00'));
  expect((await getSettings(db)).reminderTime).toBe('21:00');
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      trigger: expect.objectContaining({ type: 'daily', hour: 21, minute: 0 }),
    }),
  );
});

it('menyalakan pengingat harian menyimpan jam bawaan dan menjadwalkannya', async () => {
  await renderReminders();
  await fireEvent(await screen.findByLabelText('Pengingat harian'), 'valueChange', true);
  expect((await getSettings(db)).reminderTime).toBe('20:00');
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
});

it('mematikan pengingat harian menghapus jam dan membatalkan jadwal', async () => {
  await updateSettings(db, { reminderTime: '20:00', weeklyNudge: false });
  await renderReminders();
  await fireEvent(await screen.findByLabelText('Pengingat harian'), 'valueChange', false);
  expect((await getSettings(db)).reminderTime).toBeNull();
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
});

it('tidak menyalakan pengingat kalau izin notifikasi ditolak, dengan pesan lembut', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
  await renderReminders();
  await fireEvent(await screen.findByLabelText('Pengingat harian'), 'valueChange', true);
  expect((await getSettings(db)).reminderTime).toBeNull();
  expect(await screen.findByText(/izin notifikasi/i)).toBeTruthy();
});

it('mengganti hari ringkasan mingguan menjadwalkan ulang di hari itu', async () => {
  await renderReminders();
  await fireEvent.press(await screen.findByLabelText('Jumat'));
  expect((await getSettings(db)).weeklyNudgeDay).toBe(5);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
    expect.objectContaining({ trigger: expect.objectContaining({ type: 'weekly', weekday: 6 }) }),
  );
});
