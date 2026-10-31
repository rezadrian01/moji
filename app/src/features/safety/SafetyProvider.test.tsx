import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen as routerScreen } from 'expo-router/testing-library';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import type { Db } from '@/db/db';
import { createEntry, getEntry } from '@/db/entriesRepo';
import { addPendingSafety, takePendingSafety } from '@/db/pendingSafetyRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';
import { Text } from '@/ui/Text';

import { useSafety } from './SafetyProvider';
import { usePendingSafetyOnForeground } from './usePendingSafety';

const TITLE = 'Kedengarannya ini berat banget.';
const CLOSE = 'Aku baik-baik saja sekarang';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

let safety: ReturnType<typeof useSafety>;
function Probe() {
  const api = useSafety();
  useEffect(() => {
    safety = api;
  });
  return <Text>isi aplikasi</Text>;
}

async function renderProbe() {
  await render(
    <AppProviders db={db}>
      <Probe />
    </AppProviders>,
  );
  await screen.findByText('isi aplikasi');
}

const urgentButton = () => screen.queryByRole('button', { name: 'Telepon SEJIWA (119 ext 8)' });
const concernLink = () => screen.queryByRole('link', { name: 'Telepon SEJIWA, 119 ext 8' });

describe('SafetyProvider', () => {
  it('shows nothing until asked', async () => {
    await renderProbe();
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  it("show('urgent') opens the sheet with national services as buttons", async () => {
    await renderProbe();
    await act(async () => safety.show('urgent', 'e1'));
    expect(await screen.findByText(TITLE)).toBeOnTheScreen();
    expect(urgentButton()).toBeOnTheScreen();
    // Aplikasi di belakangnya tetap ada (hanya disembunyikan dari screen reader selama sheet terbuka).
    expect(screen.getByText('isi aplikasi', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('"Aku baik-baik saja sekarang" closes the sheet', async () => {
    await renderProbe();
    await act(async () => safety.show('concern', 'e1'));
    await fireEvent.press(await screen.findByRole('button', { name: CLOSE }));
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  it('never downgrades an open urgent sheet to concern', async () => {
    await renderProbe();
    await act(async () => safety.show('urgent', 'e1'));
    await act(async () => safety.show('concern', 'e2'));
    expect(urgentButton()).toBeOnTheScreen();
    expect(concernLink()).toBeNull();
  });

  it('raises an open concern sheet to urgent', async () => {
    await renderProbe();
    await act(async () => safety.show('concern', 'e1'));
    expect(concernLink()).toBeOnTheScreen();
    await act(async () => safety.show('urgent', 'e1'));
    expect(urgentButton()).toBeOnTheScreen();
  });

  it('opens fresh at the new level after being closed', async () => {
    await renderProbe();
    await act(async () => safety.show('urgent', 'e1'));
    await fireEvent.press(screen.getByRole('button', { name: CLOSE }));
    await act(async () => safety.show('concern', 'e2'));
    expect(await screen.findByText(TITLE)).toBeOnTheScreen();
    expect(concernLink()).toBeOnTheScreen();
  });

  it('keeps a stable show function across renders', async () => {
    await renderProbe();
    const first = safety.show;
    await act(async () => safety.show('concern', null));
    expect(safety.show).toBe(first);
  });
});

describe('SafetyProvider add-contact link', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('closes the sheet and opens contact settings', async () => {
    await renderRouter(
      {
        _layout: () => (
          <AppProviders db={db}>
            <Slot />
          </AppProviders>
        ),
        index: Probe,
        'settings/contacts': () => <Text>layar-kontak</Text>,
      },
      { initialUrl: '/' },
    );
    await routerScreen.findByText('isi aplikasi');
    await act(async () => safety.show('concern', null));
    await fireEvent.press(await routerScreen.findByRole('button', { name: 'Tambahkan kontak konseling kampus' }));
    expect(await routerScreen.findByText('layar-kontak')).toBeOnTheScreen();
    expect(routerScreen).toHavePathname('/settings/contacts');
    expect(routerScreen.queryByText(TITLE)).toBeNull();
  });
});

describe('usePendingSafetyOnForeground', () => {
  function Foreground() {
    usePendingSafetyOnForeground();
    return <Text>beranda</Text>;
  }

  async function renderForeground() {
    await render(
      <AppProviders db={db}>
        <Foreground />
      </AppProviders>,
    );
    // Sheet bisa langsung terbuka dan menyembunyikan isi di belakangnya dari screen reader.
    await screen.findByText('beranda', { includeHiddenElements: true });
  }

  it('shows a pending concern when the app opens and clears it', async () => {
    const entry = await createEntry(db, { mood: 1, note: 'catatan' }, new Date('2026-10-30T20:00:00+07:00'));
    await addPendingSafety(db, entry.id, 'concern');
    await renderForeground();
    expect(await screen.findByText(TITLE)).toBeOnTheScreen();
    expect(concernLink()).toBeOnTheScreen();
    expect(await takePendingSafety(db)).toBeNull();
  });

  it('remembers the shown level on the entry without changing its edit time', async () => {
    const entry = await createEntry(db, { mood: 1, note: 'catatan' }, new Date('2026-10-30T20:00:00+07:00'));
    await addPendingSafety(db, entry.id, 'urgent');
    await renderForeground();
    await screen.findByText(TITLE);
    await act(async () => {});
    const stored = await getEntry(db, entry.id);
    expect(stored?.safetyShownLevel).toBe('urgent');
    expect(stored?.updatedAt).toBe(entry.updatedAt);
  });

  it('shows nothing when there is nothing pending', async () => {
    await renderForeground();
    await act(async () => {});
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  it('checks again when the app comes back to the foreground', async () => {
    const listeners: ((s: AppStateStatus) => void)[] = [];
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((type, cb) => {
      if (type === 'change') listeners.push(cb as (s: AppStateStatus) => void);
      return { remove: () => {} };
    });
    try {
      await renderForeground();
      await act(async () => {});
      expect(screen.queryByText(TITLE)).toBeNull();

      const entry = await createEntry(db, { mood: 1, note: 'catatan' }, new Date('2026-10-30T20:00:00+07:00'));
      await addPendingSafety(db, entry.id, 'concern');
      await act(async () => listeners.forEach((cb) => cb('background')));
      expect(screen.queryByText(TITLE)).toBeNull();
      await act(async () => listeners.forEach((cb) => cb('active')));
      expect(await screen.findByText(TITLE)).toBeOnTheScreen();
      expect(await takePendingSafety(db)).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
