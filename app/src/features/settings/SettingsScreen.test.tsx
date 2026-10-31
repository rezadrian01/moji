import { fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn() },
  SplashScreen: { preventAutoHideAsync: jest.fn(async () => undefined), hide: jest.fn() },
}));

let mockDev = false;
jest.mock('@/features/app/startup', () => ({
  get DEV_TOOLS_ENABLED() {
    return mockDev;
  },
}));

async function renderSettings() {
  const db = await createTestDb();
  await render(
    <AppProviders db={db}>
      <SettingsScreen />
    </AppProviders>,
  );
}

beforeEach(() => {
  mockDev = false;
  mockPush.mockClear();
});

it('menampilkan daftar pengaturan termasuk "Butuh bantuan?"', async () => {
  await renderSettings();
  for (const label of ['Bantuan AI', 'Kontak bantuan', 'Pengingat', 'Privasi & data', 'Butuh bantuan?', 'Tentang MOJI']) {
    expect(await screen.findByLabelText(label)).toBeTruthy();
  }
  expect(screen.getByText('MOJI bukan alat diagnosis dan bukan layanan darurat.')).toBeTruthy();
});

it('membuka halaman tujuan saat item ditekan', async () => {
  await renderSettings();
  await fireEvent.press(await screen.findByLabelText('Privasi & data'));
  expect(mockPush).toHaveBeenCalledWith('/settings/privacy');
  await fireEvent.press(screen.getByLabelText('Butuh bantuan?'));
  expect(mockPush).toHaveBeenCalledWith('/help');
});

it('menyembunyikan "Alat tim (data contoh)" di luar mode dev', async () => {
  await renderSettings();
  await screen.findByLabelText('Pengingat');
  expect(screen.queryByLabelText('Alat tim (data contoh)')).toBeNull();
});

it('menampilkan "Alat tim (data contoh)" saat DEV_TOOLS_ENABLED', async () => {
  mockDev = true;
  await renderSettings();
  expect(await screen.findByLabelText('Alat tim (data contoh)')).toBeTruthy();
});
