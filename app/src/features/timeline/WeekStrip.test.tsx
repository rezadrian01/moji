/** @jest-environment ./src/domain/jakartaEnvironment.js */
import { render, screen } from '@testing-library/react-native';

import { createTestDb } from '@/db/testing/sqljsDb';
import type { Entry, Mood } from '@/domain/types';
import { AppProviders } from '@/features/app/AppProviders';
import { lightTheme } from '@/theme/tokens';

import { WeekStrip } from './WeekStrip';

const e = (id: string, createdAt: string, mood: Mood): Entry =>
  ({ id, createdAt, updatedAt: createdAt, mood, note: null, contexts: [], experiences: [], copings: [],
    aiSuggested: [], pendingSuggestions: null, safetyShownLevel: 'none' }) as Entry;

async function show(entries: Entry[]) {
  const db = await createTestDb();
  await render(
    <AppProviders db={db}>
      <WeekStrip entries={entries} weekStart={new Date(2026, 10, 2)} />
    </AppProviders>,
  );
}

describe('WeekStrip', () => {
  it('shows seven days, Monday first', async () => {
    await show([]);
    expect(await screen.findAllByTestId(/^week-day-/)).toHaveLength(7);
    expect(screen.getByTestId('week-day-2026-11-02')).toBeOnTheScreen();
    expect(screen.getByTestId('week-day-2026-11-08')).toBeOnTheScreen();
  });

  it('colors a day with the rounded average mood; 00:30 WIB counts on that Monday', async () => {
    await show([e('1', '2026-11-02T00:30:00+07:00', 2), e('2', '2026-11-02T20:00:00+07:00', 5)]);
    const dot = await screen.findByTestId('week-dot-2026-11-02'); // avg 3.5 -> 4
    expect(dot).toHaveStyle({ backgroundColor: lightTheme.color.mood[4] });
  });

  it('empty days are a neutral border-colored dot with no special text or accessibility wording', async () => {
    await show([e('1', '2026-11-02T09:00:00+07:00', 3)]);
    const dot = await screen.findByTestId('week-dot-2026-11-03');
    expect(dot).toHaveStyle({ backgroundColor: lightTheme.color.border });
    const day = screen.getByTestId('week-day-2026-11-03');
    expect(day.props.accessibilityLabel ?? '').not.toMatch(/kosong|bolong|terlewat|tidak ada/i);
    expect(screen.queryByText(/kosong|bolong|terlewat/i)).toBeNull();
  });
});
