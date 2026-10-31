/** @jest-environment ./src/domain/jakartaEnvironment.js */
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Db } from '@/db/db';
import { createEntry } from '@/db/entriesRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { FORBIDDEN_WORDS, PRESSURE_WORDS } from '@/domain/insightText';
import { AppProviders } from '@/features/app/AppProviders';

import { StatsSection } from './StatsSection';

const NOW = new Date('2026-10-31T10:00:00+07:00');
const NOTE = 'Grafik ini akan makin jelas seiring catatanmu bertambah.';
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
});

const add = (daysAgo: number, mood: 1 | 2 | 3 | 4 | 5, extra = {}) =>
  createEntry(
    db,
    { mood, createdAt: new Date(NOW.getTime() - daysAgo * 86400000).toISOString(), ...extra },
    NOW,
  );

const show = () =>
  render(
    <AppProviders db={db}>
      <StatsSection now={NOW} />
    </AppProviders>,
  );

describe('StatsSection', () => {
  it('shows only the gentle note and no chart when there is no data', async () => {
    await show();
    expect(await screen.findByText(NOTE)).toBeOnTheScreen();
    expect(screen.queryByTestId('mood-trend-chart')).toBeNull();
  });

  it('shows the chart plus the gentle note with only 2 entries', async () => {
    await add(1, 3);
    await add(2, 4);
    await show();
    expect(await screen.findByTestId('mood-trend-chart')).toBeOnTheScreen();
    expect(screen.getByText(NOTE)).toBeOnTheScreen();
  });

  it('hides the note with 3 entries and shows all cards', async () => {
    await add(1, 3);
    await add(2, 4);
    await add(3, 5);
    await show();
    expect(await screen.findByText('Tren mood')).toBeOnTheScreen();
    expect(screen.queryByText(NOTE)).toBeNull();
    for (const t of [
      'Sebaran mood',
      'Konteks yang sering muncul',
      'Mood menurut konteks',
      'Coping yang terasa membantu',
      'Yang sering kamu rasakan',
    ]) {
      expect(screen.getByText(t)).toBeOnTheScreen();
    }
  });

  it('changes the summary when switching to 7 days (10-day-old entry dropped)', async () => {
    await add(1, 3);
    await add(10, 1);
    await show();
    expect(await screen.findByText('Ada 1 catatan dengan mood Sangat berat.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('7 hari'));
    expect(await screen.findByText('Ada 1 catatan dengan mood Biasa.')).toBeOnTheScreen();
    expect(screen.queryByText('Ada 1 catatan dengan mood Sangat berat.')).toBeNull();
  });

  it('defaults to 30 days and offers Semua', async () => {
    await add(40, 2);
    await add(1, 3);
    await show();
    await screen.findByText('Tren mood');
    expect(screen.getByLabelText('30 hari').props.accessibilityState.selected).toBe(true);
    expect(screen.queryByText('Ada 1 catatan dengan mood Kurang baik.')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Semua'));
    expect(await screen.findByText('Ada 1 catatan dengan mood Kurang baik.')).toBeOnTheScreen();
  });

  it('shows the nearest mood word for mood by context, never a decimal', async () => {
    const ctx = [{ category: 'akademik' as const, subTag: null }];
    await add(1, 3, { contexts: ctx });
    await add(2, 3, { contexts: ctx });
    await add(3, 4, { contexts: ctx });
    await show();
    expect(await screen.findByText('rata-rata: Biasa')).toBeOnTheScreen();
    expect(screen.queryByText(/\d\.\d/)).toBeNull();
  });

  it('gives each card an accessibility label containing its summary, with calm copy', async () => {
    await add(1, 3);
    await add(2, 4);
    await add(3, 5);
    await show();
    const card = await screen.findByTestId('stats-card-Sebaran mood');
    expect(card.props.accessibilityLabel).toBe('Sebaran mood Ada 1 catatan dengan mood Biasa. Ada 1 catatan dengan mood Baik. Ada 1 catatan dengan mood Sangat baik.');
    expect(screen.queryAllByText(/skor|memburuk|membaik|%/i)).toHaveLength(0);
    expect(screen.queryAllByText(FORBIDDEN_WORDS)).toHaveLength(0);
    expect(screen.queryAllByText(PRESSURE_WORDS)).toHaveLength(0);
  });
});
