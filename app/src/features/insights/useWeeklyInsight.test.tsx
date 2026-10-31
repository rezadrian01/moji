/** @jest-environment ./src/domain/jakartaEnvironment.js */
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { createEntry } from '@/db/entriesRepo';
import type { Db } from '@/db/db';
import { listInsights } from '@/db/insightsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';

import { useWeeklyInsightOnForeground } from './useWeeklyInsight';

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));
jest.mock('@/ai/client', () => ({
  defaultAiClient: () => ({ writeInsight: async () => ({ ok: false, error: 'network' }) }),
}));

function Host() {
  useWeeklyInsightOnForeground();
  return null;
}

describe('useWeeklyInsightOnForeground', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates one weekly insight on mount and not again on a later active event', async () => {
    const db: Db = await createTestDb();
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
    monday.setHours(10, 0, 0, 0);
    for (let i = 0; i < 5; i++) await createEntry(db, { mood: 3, createdAt: monday.toISOString() }, now);

    let handler: ((s: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: (s: string) => void) => {
      handler = cb;
      return { remove: jest.fn() };
    }) as never);

    await render(
      <AppProviders db={db}>
        <Host />
      </AppProviders>,
    );
    await waitFor(async () => expect(await listInsights(db)).toHaveLength(1));

    await act(async () => {
      handler?.('active');
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(await listInsights(db)).toHaveLength(1);
  });
});
