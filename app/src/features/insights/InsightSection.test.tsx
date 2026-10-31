/** @jest-environment ./src/domain/jakartaEnvironment.js */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { createEntry } from '@/db/entriesRepo';
import type { Db } from '@/db/db';
import { getFeedbackForInsight } from '@/db/feedbackRepo';
import { getInsight, listInsights, saveInsight } from '@/db/insightsRepo';
import { updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { NOT_ENOUGH_DATA_TEXT } from '@/domain/insightText';
import { AppProviders } from '@/features/app/AppProviders';

import { InsightSection } from './InsightSection';

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  SplashScreen: { preventAutoHideAsync: async () => {}, hide: () => {} },
}));
jest.mock('@/ai/client', () => ({
  defaultAiClient: () => ({ writeInsight: async () => ({ ok: false, error: 'network' }) }),
}));

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const emptyDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

async function seedInsight(text = 'Teks pembuka insight', day = 30) {
  return saveInsight(
    db,
    {
      kind: 'on_demand',
      weekKey: null,
      periodStart: '2026-10-01T00:00:00.000+07:00',
      periodEnd: '2026-10-30T00:00:00.000+07:00',
      summary: {
        periodStart: 'a',
        periodEnd: 'b',
        entryCount: 5,
        moodDistribution: emptyDist,
        patterns: [],
        enoughData: true,
      },
      text,
      patternTexts: { 'low_mood_context:akademik': 'Pola akademik terlihat' },
      questions: ['Apa yang kamu butuhkan?'],
      source: 'local',
      reflection: null,
    },
    new Date(2026, 9, day, 10),
  );
}

const renderIt = () =>
  render(
    <AppProviders db={db}>
      <InsightSection />
    </AppProviders>,
  );

describe('InsightSection', () => {
  it('shows the latest insight with pattern text, feedback and optional questions', async () => {
    await seedInsight();
    await renderIt();
    expect(await screen.findByText('Teks pembuka insight')).toBeTruthy();
    expect(screen.getByText('Pola akademik terlihat')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Tidak sesuai' })).toBeTruthy();
    expect(screen.getByText('Apa yang kamu butuhkan?')).toBeTruthy();
    expect(screen.getByText(/tidak perlu dijawab/i)).toBeTruthy();
  });

  it('records feedback "Tidak sesuai" and marks it selected', async () => {
    const ins = await seedInsight();
    await renderIt();
    await fireEvent.press(await screen.findByRole('radio', { name: 'Tidak sesuai' }));
    await waitFor(async () =>
      expect(await getFeedbackForInsight(db, ins.id)).toEqual({ 'low_mood_context:akademik': 'tidak_sesuai' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Tidak sesuai' }).props.accessibilityState.selected).toBe(true),
    );
  });

  it('saves the reflection', async () => {
    const ins = await seedInsight();
    await renderIt();
    await fireEvent.changeText(await screen.findByLabelText('Tulis refleksimu (opsional)'), 'Aku capek minggu ini');
    await fireEvent.press(screen.getByRole('button', { name: 'Simpan refleksi' }));
    await waitFor(async () => expect((await getInsight(db, ins.id))?.reflection).toBe('Aku capek minggu ini'));
  });

  it('says there is not enough data when on-demand has only 2 entries', async () => {
    const now = new Date();
    for (let i = 0; i < 2; i++) await createEntry(db, { mood: 3, createdAt: now.toISOString() }, now);
    await renderIt();
    await fireEvent.press(await screen.findByRole('button', { name: 'Lihat polaku' }));
    expect(await screen.findByText(NOT_ENOUGH_DATA_TEXT)).toBeTruthy();
    expect(await listInsights(db)).toHaveLength(0);
  });

  it('falls back to a local insight when AI fails, shown on top', async () => {
    const now = new Date();
    for (let i = 0; i < 6; i++) await createEntry(db, { mood: 3, createdAt: now.toISOString() }, now);
    await seedInsight('Insight lama', 1);
    await renderIt();
    await fireEvent.press(await screen.findByRole('button', { name: 'Lihat polaku' }));
    await waitFor(async () => expect(await listInsights(db)).toHaveLength(2));
    expect((await listInsights(db))[0].source).toBe('local');
    expect(await screen.findByText(/belum ada pola yang menonjol|MOJI perhatikan/)).toBeTruthy();
  });

  it('still makes a local insight when AI is on but SecureStore throws', async () => {
    const now = new Date();
    for (let i = 0; i < 6; i++) await createEntry(db, { mood: 3, createdAt: now.toISOString() }, now);
    await updateSettings(db, { aiEnabled: true, aiConsentAt: '2026-10-31T09:00:00.000+07:00' });
    const getItem = jest.mocked(SecureStore.getItemAsync);
    const original = getItem.getMockImplementation()!;
    getItem.mockImplementation(async () => {
      throw new Error('keystore unavailable');
    });
    try {
      await renderIt();
      await fireEvent.press(await screen.findByRole('button', { name: 'Lihat polaku' }));
      await waitFor(async () => expect(await listInsights(db)).toHaveLength(1));
      expect((await listInsights(db))[0].source).toBe('local');
      expect(screen.queryByText(/Belum berhasil sekarang/)).toBeNull();
    } finally {
      getItem.mockImplementation(original);
    }
  });

  it('lists earlier insights below the latest one', async () => {
    await seedInsight('Insight lama', 20);
    await seedInsight('Insight baru', 30);
    await renderIt();
    expect(await screen.findByText('Insight sebelumnya')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Buka insight/ })).toHaveLength(1);
  });
});
