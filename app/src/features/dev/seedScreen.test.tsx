import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text as MockText } from 'react-native';

import DevSeedScreen from '@/app/dev/seed';
import type { Db } from '@/db/db';
import { listEntries } from '@/db/entriesRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';

const mockDevTools = { enabled: true };
jest.mock('@/features/app/startup', () => ({
  get DEV_TOOLS_ENABLED() {
    return mockDevTools.enabled;
  },
  useStartupTasks: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  Redirect: ({ href }: { href: string }) => {
    return <MockText>{`redirect:${href}`}</MockText>;
  },
  SplashScreen: { preventAutoHideAsync: jest.fn(async () => undefined), hide: jest.fn() },
}));

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  mockDevTools.enabled = true;
});

async function renderScreen() {
  await render(
    <AppProviders db={db}>
      <DevSeedScreen />
    </AppProviders>,
  );
}

it('mengalihkan ke beranda kalau alat tim tidak aktif', async () => {
  mockDevTools.enabled = false;
  await renderScreen();
  expect(screen.getByText('redirect:/')).toBeTruthy();
  expect(screen.queryByLabelText('Isi data contoh')).toBeNull();
});

it('"Isi data contoh" membuat catatan', async () => {
  await renderScreen();
  await fireEvent.press(screen.getByLabelText('Isi data contoh'));
  await waitFor(async () => expect((await listEntries(db, {})).length).toBeGreaterThanOrEqual(21));
});

it('"Hapus semua data" mengosongkan catatan setelah konfirmasi', async () => {
  await renderScreen();
  await fireEvent.press(screen.getByLabelText('Isi data contoh'));
  await waitFor(async () => expect((await listEntries(db, {})).length).toBeGreaterThan(0));
  await fireEvent.press(screen.getByLabelText('Hapus semua data'));
  await fireEvent.press(await screen.findByLabelText('Ya, hapus'));
  await waitFor(async () => expect(await listEntries(db, {})).toHaveLength(0));
});

it('"Buat insight mingguan sekarang" menyimpan insight untuk minggu lalu', async () => {
  await renderScreen();
  await fireEvent.press(screen.getByLabelText('Isi data contoh'));
  await waitFor(async () => expect((await listEntries(db, {})).length).toBeGreaterThan(0));
  await fireEvent.press(screen.getByLabelText('Buat insight mingguan sekarang'));
  expect(await screen.findByText(/Insight mingguan dibuat/)).toBeTruthy();
});
