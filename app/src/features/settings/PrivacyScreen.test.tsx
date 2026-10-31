import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { getInviteCode, setInviteCode } from '@/ai/inviteStore';
import PrivacyScreen from '@/app/settings/privacy';
import type { Db } from '@/db/db';
import { createEntry, listEntries } from '@/db/entriesRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';
import { shareExport } from '@/features/data/exportData';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismissAll: jest.fn(), canDismiss: jest.fn(() => true) },
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

it('memakai teks izin AI yang sama dengan onboarding', async () => {
  expect(await screen.findByText('Server MOJI tidak menyimpan tulisanmu.')).toBeTruthy();
  expect(screen.getByText('Kamu bisa mematikannya kapan saja di Pengaturan.')).toBeTruthy();
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

async function deleteEverything() {
  await fireEvent.press(await screen.findByLabelText('Hapus semua data'));
  await fireEvent.press(screen.getByLabelText('Lanjutkan'));
  await fireEvent.changeText(screen.getByLabelText('Ketik HAPUS untuk mengonfirmasi'), 'HAPUS');
  await fireEvent.press(screen.getByLabelText('Hapus sekarang'));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/onboarding'));
}

it('setelah menghapus, menutup tumpukan layar dulu lalu mengganti ke onboarding', async () => {
  await deleteEverything();
  expect(router.dismissAll).toHaveBeenCalledTimes(1);
  expect(jest.mocked(router.dismissAll).mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(router.replace).mock.invocationCallOrder[0],
  );
});

it('tidak memanggil dismissAll kalau tidak ada layar yang bisa ditutup', async () => {
  jest.mocked(router.canDismiss).mockReturnValueOnce(false);
  await deleteEverything();
  expect(router.dismissAll).not.toHaveBeenCalled();
});

it('menampilkan pesan lembut kalau ekspor gagal', async () => {
  (shareExport as jest.Mock).mockRejectedValueOnce(new Error('gagal tulis'));
  await fireEvent.press(await screen.findByLabelText('Ekspor data'));
  expect(await screen.findByText(/File belum bisa dibagikan/)).toBeTruthy();
});

it('menampilkan pesan dan tidak pindah halaman kalau penghapusan gagal', async () => {
  db.withTransactionAsync = async () => {
    throw new Error('db gagal');
  };
  await fireEvent.press(await screen.findByLabelText('Hapus semua data'));
  await fireEvent.press(screen.getByLabelText('Lanjutkan'));
  await fireEvent.changeText(screen.getByLabelText('Ketik HAPUS untuk mengonfirmasi'), 'HAPUS');
  await fireEvent.press(screen.getByLabelText('Hapus sekarang'));
  expect(await screen.findByText('Belum berhasil menghapus. Kamu bisa coba lagi.')).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
});
