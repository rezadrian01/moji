import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { getInviteCode, setInviteCode } from '@/ai/inviteStore';
import PrivacyScreen from '@/app/settings/privacy';
import type { Db } from '@/db/db';
import { createEntry, listEntries } from '@/db/entriesRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';
import { shareExport } from '@/features/data/exportData';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  SplashScreen: { preventAutoHideAsync: jest.fn(async () => undefined), hide: jest.fn() },
}));
jest.mock('@/features/data/exportData', () => ({ shareExport: jest.fn(async () => undefined) }));

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  jest.clearAllMocks();
  await createEntry(db, { mood: 3, note: 'halo' }, new Date());
  await setInviteCode('MOJI-R07-K3F9');
  await render(
    <AppProviders db={db}>
      <PrivacyScreen />
    </AppProviders>,
  );
});

it('menjelaskan apa yang disimpan dan apa yang dikirim', async () => {
  expect(await screen.findByText('Apa yang disimpan')).toBeTruthy();
  expect(screen.getByText('Apa yang dikirim')).toBeTruthy();
  expect(screen.getByText(/Simpan file ini kalau kamu mau ganti HP atau menghapus aplikasi\./)).toBeTruthy();
});

it('mengekspor data lewat share sheet', async () => {
  await fireEvent.press(await screen.findByLabelText('Ekspor data'));
  expect(shareExport).toHaveBeenCalledWith(db, expect.any(Date));
});

it('"Batal" pada dialog hapus tidak menghapus apa pun', async () => {
  await fireEvent.press(await screen.findByLabelText('Hapus semua data'));
  expect(
    screen.getByText('Semua catatan, insight, dan pengaturan akan dihapus dari HP ini. Lanjutkan?'),
  ).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Batal'));
  expect(await listEntries(db, {})).toHaveLength(1);
  expect(router.replace).not.toHaveBeenCalled();
});

it('tombol final nonaktif sampai "HAPUS" diketik, lalu menghapus dan ke onboarding', async () => {
  await fireEvent.press(await screen.findByLabelText('Hapus semua data'));
  await fireEvent.press(screen.getByLabelText('Lanjutkan'));
  expect(screen.getByLabelText('Hapus sekarang').props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(screen.getByLabelText('Ketik HAPUS untuk mengonfirmasi'), 'hapus');
  expect(screen.getByLabelText('Hapus sekarang').props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(screen.getByLabelText('Ketik HAPUS untuk mengonfirmasi'), 'HAPUS');
  await fireEvent.press(screen.getByLabelText('Hapus sekarang'));
  expect(await listEntries(db, {})).toHaveLength(0);
  expect(await getInviteCode()).toBeNull();
  expect(router.replace).toHaveBeenCalledWith('/onboarding');
});
