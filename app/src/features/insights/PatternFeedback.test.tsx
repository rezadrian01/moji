import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Db } from '@/db/db';
import { getFeedbackForInsight } from '@/db/feedbackRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';

import { PatternFeedback } from './PatternFeedback';

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const renderIt = () =>
  render(
    <AppProviders db={db}>
      <PatternFeedback insightId="i1" patternKey="k1" />
    </AppProviders>,
  );

describe('PatternFeedback', () => {
  it('shows three radio options, none selected at first', async () => {
    await renderIt();
    for (const label of ['Sesuai', 'Sebagian', 'Tidak sesuai']) {
      const b = await screen.findByRole('radio', { name: label });
      expect(b.props.accessibilityState?.selected ?? false).toBe(false);
    }
  });

  it('saves the choice and marks it selected', async () => {
    await renderIt();
    await fireEvent.press(await screen.findByRole('radio', { name: 'Tidak sesuai' }));
    await waitFor(async () => expect(await getFeedbackForInsight(db, 'i1')).toEqual({ k1: 'tidak_sesuai' }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Tidak sesuai' }).props.accessibilityState.selected).toBe(true),
    );
  });
});
