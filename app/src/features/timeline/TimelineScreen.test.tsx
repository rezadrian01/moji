/** @jest-environment ./src/domain/jakartaEnvironment.js */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { createEntry } from '@/db/entriesRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import TimelineScreen from '@/app/(tabs)/timeline';
import { AppProviders } from '@/features/app/AppProviders';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  SplashScreen: { preventAutoHideAsync: jest.fn(async () => {}), hide: jest.fn() },
}));

describe('TimelineScreen', () => {
  it('shows the empty state without any entries', async () => {
    const db = await createTestDb();
    await render(
      <AppProviders db={db}>
        <TimelineScreen />
      </AppProviders>,
    );
    expect(await screen.findByText(/Belum ada catatan/)).toBeOnTheScreen();
  });

  it('lists saved entries and narrows them with a context filter chip', async () => {
    const db = await createTestDb();
    const now = new Date();
    await createEntry(db, { mood: 3, note: 'soal kuliah', contexts: [{ category: 'akademik', subTag: null }] }, now);
    await createEntry(db, { mood: 4, note: 'soal uang', contexts: [{ category: 'finansial', subTag: null }] }, now);
    await render(
      <AppProviders db={db}>
        <TimelineScreen />
      </AppProviders>,
    );
    expect(await screen.findByText('soal kuliah')).toBeOnTheScreen();
    expect(screen.getByText('soal uang')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Akademik' }));
    expect(screen.getByText('soal kuliah')).toBeOnTheScreen();
    expect(screen.queryByText('soal uang')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Semua' }));
    expect(await screen.findByText('soal uang')).toBeOnTheScreen();
  });
});
