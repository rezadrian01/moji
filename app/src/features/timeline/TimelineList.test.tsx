/** @jest-environment ./src/domain/jakartaEnvironment.js */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { ContextCategory, Entry, Mood } from '@/domain/types';
import { FORBIDDEN_WORDS, PRESSURE_WORDS } from '@/domain/insightText';
import { AppProviders } from '@/features/app/AppProviders';
import { createTestDb } from '@/db/testing/sqljsDb';

import { TimelineList } from './TimelineList';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  SplashScreen: { preventAutoHideAsync: jest.fn(async () => {}), hide: jest.fn() },
}));

function entry(id: string, createdAt: string, o: Partial<Entry> & { mood?: Mood } = {}): Entry {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    mood: 3,
    note: null,
    contexts: [],
    experiences: [],
    copings: [],
    aiSuggested: [],
    pendingSuggestions: null,
    safetyShownLevel: 'none',
    ...o,
  } as Entry;
}

async function show(entries: Entry[], filter: ContextCategory | null = null) {
  const db = await createTestDb();
  await render(
    <AppProviders db={db}>
      <TimelineList entries={entries} filter={filter} />
    </AppProviders>,
  );
}

const EMPTY_COPY = 'Belum ada catatan. Kapan pun kamu siap, satu tap di Beranda sudah cukup.';

describe('TimelineList', () => {
  it('groups by local (WIB) date: 23:30 and 00:30 land in two groups', async () => {
    await show([
      entry('b', '2026-11-02T00:30:00+07:00'),
      entry('a', '2026-11-01T23:30:00+07:00'),
    ]);
    expect(await screen.findByText('Senin, 2 Nov')).toBeOnTheScreen();
    expect(screen.getByText('Minggu, 1 Nov')).toBeOnTheScreen();
    expect(screen.getByText('00.30')).toBeOnTheScreen();
    expect(screen.getByText('23.30')).toBeOnTheScreen();
  });

  it('shows mood label, context chip and a note excerpt of at most 80 characters with an ellipsis', async () => {
    const note = 'a'.repeat(120);
    await show([entry('a', '2026-11-02T09:00:00+07:00', { mood: 4, note, contexts: [{ category: 'akademik', subTag: null }] })]);
    expect(await screen.findByText('Baik')).toBeOnTheScreen();
    expect(screen.getByText('Akademik')).toBeOnTheScreen();
    expect(screen.getByText('a'.repeat(80) + '…')).toBeOnTheScreen();
  });

  it('does not truncate short notes', async () => {
    await show([entry('a', '2026-11-02T09:00:00+07:00', { note: 'pendek' })]);
    expect(await screen.findByText('pendek')).toBeOnTheScreen();
  });

  it('filters to the chosen context only', async () => {
    await show(
      [
        entry('a', '2026-11-02T09:00:00+07:00', { note: 'kuliah', contexts: [{ category: 'akademik', subTag: null }] }),
        entry('b', '2026-11-02T10:00:00+07:00', { note: 'kerja', contexts: [{ category: 'finansial', subTag: null }] }),
      ],
      'akademik',
    );
    expect(await screen.findByText('kuliah')).toBeOnTheScreen();
    expect(screen.queryByText('kerja')).toBeNull();
  });

  it('marks entries that have pending suggestions', async () => {
    await show([
      entry('a', '2026-11-02T09:00:00+07:00', {
        pendingSuggestions: { contexts: ['akademik'], experiences: [], copings: [] },
      }),
    ]);
    expect(await screen.findByText('Ada saran untukmu')).toBeOnTheScreen();
  });

  it('opens the entry on tap', async () => {
    await show([entry('abc', '2026-11-02T09:00:00+07:00', { note: 'halo' })]);
    await fireEvent.press(await screen.findByRole('button', { name: /halo/ }));
    expect(router.push).toHaveBeenCalledWith('/entry/abc');
  });

  it('shows the gentle empty state', async () => {
    await show([]);
    expect(await screen.findByText(EMPTY_COPY)).toBeOnTheScreen();
  });

  it('empty state copy has no forbidden or pressure words', () => {
    for (const re of [FORBIDDEN_WORDS, PRESSURE_WORDS]) {
      expect(EMPTY_COPY).not.toMatch(re);
    }
  });

  it('does not wrap the groups in an entering animation (stale frame overlapped the filter chips on Android)', async () => {
    await show([entry('a', '2026-11-02T09:00:00+07:00')]);
    await screen.findByText('Senin, 2 Nov');
    expect(JSON.stringify(screen.toJSON())).not.toContain('entering');
  });
});
