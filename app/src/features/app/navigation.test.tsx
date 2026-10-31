import { router } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';
import TabsLayout from '@/app/(tabs)/_layout';
import PolakuScreen from '@/app/(tabs)/polaku';
import type { Db } from '@/db/db';
import { openAppDb } from '@/db/expoDb';
import { updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { useDb } from '@/db/useDbQuery';
import { useWeeklyInsightOnForeground } from '@/features/insights/useWeeklyInsight';
import { usePendingSafetyOnForeground } from '@/features/safety/usePendingSafety';
import { Button } from '@/ui/Button';

jest.mock('@/db/expoDb', () => ({ openAppDb: jest.fn() }));
// Bagian Polaku dan tugas latar milik task lain; di sini cukup dipastikan dirangkai dengan benar.
jest.mock('@/features/insights/InsightSection', () => {
  const { Text: RNText } = jest.requireActual<typeof import('react-native')>('react-native');
  return { InsightSection: () => <RNText>bagian-insight</RNText> };
});
jest.mock('@/features/stats/StatsSection', () => {
  const { Text: RNText } = jest.requireActual<typeof import('react-native')>('react-native');
  return { StatsSection: () => <RNText>bagian-statistik</RNText> };
});
jest.mock('@/features/insights/useWeeklyInsight', () => ({ useWeeklyInsightOnForeground: jest.fn() }));
jest.mock('@/features/safety/usePendingSafety', () => ({ usePendingSafetyOnForeground: jest.fn() }));

function FakeOnboarding() {
  const db = useDb();
  return (
    <Button
      label="Mulai"
      onPress={async () => {
        await updateSettings(db, { onboardingDone: true });
        router.replace('/');
      }}
    />
  );
}

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': () => <Text>layar-beranda</Text>,
  '(tabs)/timeline': () => <Text>layar-timeline</Text>,
  '(tabs)/polaku': PolakuScreen,
  '(tabs)/settings': () => <Text>layar-pengaturan</Text>,
  onboarding: FakeOnboarding,
  help: () => <Text>layar-bantuan</Text>,
};

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  jest.mocked(openAppDb).mockResolvedValue(db);
});
// renderRouter memasang fake timers; kembalikan supaya tidak bocor ke test berikutnya.
afterEach(() => {
  jest.useRealTimers();
});

describe('app navigation', () => {
  it('sends a first-time user to onboarding', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await screen.findByRole('button', { name: 'Mulai' });
    expect(screen).toHavePathname('/onboarding');
  });

  it('lands on Beranda right after onboarding is finished', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(await screen.findByRole('button', { name: 'Mulai' }));
    expect(await screen.findByText('layar-beranda')).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
  });

  it('shows four labeled tabs once onboarding is done', async () => {
    await updateSettings(db, { onboardingDone: true });
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('layar-beranda')).toBeOnTheScreen();
    for (const label of ['Beranda', 'Timeline', 'Polaku', 'Pengaturan']) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }

    await fireEvent.press(screen.getByText('Timeline'));
    expect(await screen.findByText('layar-timeline')).toBeOnTheScreen();
    expect(screen).toHavePathname('/timeline');
  });

  it('switches between the Polaku sections with a segmented control', async () => {
    await updateSettings(db, { onboardingDone: true });
    await renderRouter(routes, { initialUrl: '/polaku' });

    const insight = await screen.findByRole('tab', { name: 'Insight' });
    const stats = screen.getByRole('tab', { name: 'Statistik' });
    expect(insight).toBeSelected();
    expect(stats).not.toBeSelected();
    expect(screen.getByText('bagian-insight')).toBeOnTheScreen();
    expect(screen.queryByText('bagian-statistik')).toBeNull();

    await fireEvent.press(stats);
    expect(await screen.findByText('bagian-statistik')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Statistik' })).toBeSelected();
    expect(screen.queryByText('bagian-insight')).toBeNull();
  });

  it('runs the foreground startup tasks from the root layout', async () => {
    await updateSettings(db, { onboardingDone: true });
    await renderRouter(routes, { initialUrl: '/' });
    await screen.findByText('layar-beranda');
    expect(useWeeklyInsightOnForeground).toHaveBeenCalled();
    expect(usePendingSafetyOnForeground).toHaveBeenCalled();
  });
});
