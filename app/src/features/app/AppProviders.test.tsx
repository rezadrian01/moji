import { act, render, screen } from '@testing-library/react-native';

import type { Db } from '@/db/db';
import { openAppDb } from '@/db/expoDb';
import { createTestDb } from '@/db/testing/sqljsDb';
import { useDb } from '@/db/useDbQuery';
import { useSafety } from '@/features/safety/SafetyProvider';
import { darkTheme } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

import { AppProviders } from './AppProviders';

jest.mock('@/db/expoDb', () => ({ openAppDb: jest.fn() }));
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'dark'),
}));

const mockedOpenAppDb = jest.mocked(openAppDb);

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  mockedOpenAppDb.mockReset();
});

describe('AppProviders', () => {
  it('renders its children once ready', async () => {
    await render(
      <AppProviders db={db}>
        <Screen>
          <Text>Isi aplikasi</Text>
        </Screen>
      </AppProviders>,
    );
    expect(await screen.findByText('Isi aplikasi')).toBeOnTheScreen();
  });

  it('provides the injected db through useDb()', async () => {
    let seen: Db | null = null;
    function Probe() {
      seen = useDb();
      return <Text>probe</Text>;
    }
    await render(
      <AppProviders db={db}>
        <Probe />
      </AppProviders>,
    );
    await screen.findByText('probe');
    expect(seen).toBe(db);
    expect(mockedOpenAppDb).not.toHaveBeenCalled();
  });

  it('provides the theme that follows the system color scheme', async () => {
    function Probe() {
      const theme = useTheme();
      return <Text>{`skema ${theme.scheme}`}</Text>;
    }
    await render(
      <AppProviders db={db}>
        <Probe />
      </AppProviders>,
    );
    expect(await screen.findByText(`skema ${darkTheme.scheme}`)).toBeOnTheScreen();
  });

  it('provides a callable useSafety().show', async () => {
    let safety: ReturnType<typeof useSafety> | null = null;
    function Probe() {
      safety = useSafety();
      return <Text>aman</Text>;
    }
    await render(
      <AppProviders db={db}>
        <Probe />
      </AppProviders>,
    );
    await screen.findByText('aman');
    expect(safety).not.toBeNull();
    await act(async () => {
      safety!.show('concern', null);
    });
  });

  it('opens the app database when no db is injected', async () => {
    mockedOpenAppDb.mockResolvedValue(db);
    let seen: Db | null = null;
    function Probe() {
      seen = useDb();
      return <Text>probe</Text>;
    }
    await render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    await screen.findByText('probe');
    expect(mockedOpenAppDb).toHaveBeenCalledTimes(1);
    expect(seen).toBe(db);
  });

  it('shows a calm message instead of a blank screen when the database cannot open', async () => {
    mockedOpenAppDb.mockRejectedValue(new Error('disk penuh'));
    await render(
      <AppProviders>
        <Text>Isi aplikasi</Text>
      </AppProviders>,
    );
    expect(await screen.findByText(/MOJI belum bisa membuka catatanmu/)).toBeOnTheScreen();
    expect(screen.queryByText('Isi aplikasi')).toBeNull();
  });
});
