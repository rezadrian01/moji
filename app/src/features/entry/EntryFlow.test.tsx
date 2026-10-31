/** @jest-environment ./src/domain/jakartaEnvironment.js */
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';
import TabsLayout from '@/app/(tabs)/_layout';
import HomeScreen from '@/app/(tabs)/index';
import EntryDetailScreen from '@/app/entry/[id]';
import NewEntryScreen from '@/app/entry/new';
import type { Db } from '@/db/db';
import { createEntry, getEntry, listEntries, updateEntry } from '@/db/entriesRepo';
import { openAppDb } from '@/db/expoDb';
import { saveInsight } from '@/db/insightsRepo';
import { getDraft, updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import type { Entry } from '@/domain/types';

import { runPostSave } from './postSave';

jest.mock('@/db/expoDb', () => ({ openAppDb: jest.fn() }));
jest.mock('@/features/insights/useWeeklyInsight', () => ({ useWeeklyInsightOnForeground: jest.fn() }));
jest.mock('@/features/safety/usePendingSafety', () => ({ usePendingSafetyOnForeground: jest.fn() }));
jest.mock('./postSave', () => {
  const actual = jest.requireActual<typeof import('./postSave')>('./postSave');
  return { ...actual, runPostSave: jest.fn(actual.runPostSave) };
});
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: (props: { mode?: string }) => <View testID={`picker-${props.mode ?? 'date'}`} {...props} />,
  };
});

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': HomeScreen,
  '(tabs)/timeline': () => <Text>layar-timeline</Text>,
  '(tabs)/polaku': () => <Text>layar-polaku</Text>,
  '(tabs)/settings': () => <Text>layar-pengaturan</Text>,
  'entry/new': NewEntryScreen,
  'entry/[id]': EntryDetailScreen,
  'insight/[id]': () => <Text>layar-insight</Text>,
  help: () => <Text>layar-bantuan</Text>,
};

const NOW = new Date('2026-10-31T10:00:00+07:00');
const mockedRunPostSave = jest.mocked(runPostSave);

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  jest.mocked(openAppDb).mockResolvedValue(db);
  await updateSettings(db, { onboardingDone: true });
  mockedRunPostSave.mockClear();
  jest.useFakeTimers({ now: NOW });
});
afterEach(() => {
  jest.useRealTimers();
});

const press = async (name: string | RegExp) => fireEvent.press(await screen.findByRole('button', { name }));
const pressRadio = async (name: string) => fireEvent.press(await screen.findByRole('radio', { name }));
/** Lewati jeda draft 500ms dan biarkan tulisan sql.js selesai. */
const flushDraft = async () => {
  await act(async () => {
    jest.advanceTimersByTime(600);
  });
};

/**
 * Tunggu sampai pemeriksaan DB lulus. Sengaja tidak memakai `waitFor(async ...)`: kalau test selesai
 * selagi `waitFor` masih di dalam `act`, update React di test berikutnya tidak pernah di-flush.
 */
async function eventually(check: () => Promise<void>): Promise<void> {
  for (let i = 0; i < 20; i++) {
    try {
      await check();
      return;
    } catch {
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
    }
  }
  await check();
}

async function onlyEntry(): Promise<Entry> {
  const all = await listEntries(db, {});
  expect(all).toHaveLength(1);
  return all[0];
}

async function saveMoodAndOpenDetails(mood = 'Kurang baik') {
  await renderRouter(routes, { initialUrl: '/entry/new' });
  await pressRadio(mood);
  await press('Simpan');
  await press('Ceritain lebih');
}

describe('Beranda', () => {
  it('greets by time of day and asks how you feel', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Selamat pagi')).toBeOnTheScreen();
    expect(screen.getByText('Gimana perasaanmu sekarang?')).toBeOnTheScreen();
  });

  it.each([
    ['10:59', 'Selamat pagi'],
    ['11:00', 'Selamat siang'],
    ['14:59', 'Selamat siang'],
    ['15:00', 'Selamat sore'],
    ['17:59', 'Selamat sore'],
    ['18:00', 'Selamat malam'],
    ['23:59', 'Selamat malam'],
    ['05:00', 'Selamat pagi'],
  ])('at %s WIB says "%s"', async (time, greeting) => {
    jest.setSystemTime(new Date(`2026-10-31T${time}:00+07:00`));
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText(greeting)).toBeOnTheScreen();
  });

  it('has "Butuh bantuan?" that opens help in one tap', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await press('Butuh bantuan?');
    expect(await screen.findByText('layar-bantuan')).toBeOnTheScreen();
    expect(screen).toHavePathname('/help');
  });

  it('opens a new entry with the chosen mood already selected', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await pressRadio('Baik');
    await waitFor(() => expect(screen).toHavePathnameWithParams('/entry/new?mood=4'));
    expect(await screen.findByRole('radio', { name: 'Baik' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeEnabled();
  });

  it('shows the latest insight card when there is one', async () => {
    await saveInsight(
      db,
      {
        kind: 'weekly',
        weekKey: '2026-10-26',
        periodStart: '2026-10-26T00:00:00.000+07:00',
        periodEnd: '2026-11-02T00:00:00.000+07:00',
        summary: {
          periodStart: '2026-10-26T00:00:00.000+07:00',
          periodEnd: '2026-11-02T00:00:00.000+07:00',
          entryCount: 5,
          moodDistribution: { 1: 0, 2: 2, 3: 1, 4: 2, 5: 0 },
          patterns: [],
          enoughData: true,
        },
        text: 'Minggu ini kamu sering mencatat soal tugas.',
        patternTexts: {},
        questions: [],
        source: 'local',
        reflection: null,
      },
      NOW,
    );
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Minggu ini kamu sering mencatat soal tugas.')).toBeOnTheScreen();
    await press(/Insight terbaru/);
    expect(await screen.findByText('layar-insight')).toBeOnTheScreen();
  });

  it('shows no insight card when there is none', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await screen.findByText('Gimana perasaanmu sekarang?');
    expect(screen.queryByText(/Insight terbaru/)).toBeNull();
  });
});

describe('entry/new', () => {
  it('keeps "Simpan" disabled until a mood is picked', async () => {
    await renderRouter(routes, { initialUrl: '/entry/new' });
    expect(await screen.findByRole('button', { name: 'Simpan' })).toBeDisabled();
    await pressRadio('Biasa');
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeEnabled();
  });

  it('saves one entry with just the mood, nothing else required', async () => {
    await renderRouter(routes, { initialUrl: '/entry/new' });
    await pressRadio('Sangat berat');
    await press('Simpan');
    expect(await screen.findByText('Tersimpan. Mau cerita lebih?')).toBeOnTheScreen();

    const entry = await onlyEntry();
    expect(entry).toMatchObject({ mood: 1, note: null, contexts: [], experiences: [], copings: [] });
    expect(entry.createdAt).toBe('2026-10-31T10:00:00.000+07:00');
    expect(mockedRunPostSave).toHaveBeenCalledWith(expect.objectContaining({ id: entry.id, mood: 1 }), expect.anything());
  });

  it('moves to the saved state even if the post-save safety step fails', async () => {
    mockedRunPostSave.mockRejectedValueOnce(new Error('db sibuk'));
    await renderRouter(routes, { initialUrl: '/entry/new' });
    await pressRadio('Biasa');
    await press('Simpan');
    expect(await screen.findByText('Tersimpan. Mau cerita lebih?')).toBeOnTheScreen();
    await onlyEntry();
  });

  it('never waits for the AI task', async () => {
    mockedRunPostSave.mockResolvedValueOnce({ localLevel: 'none', aiTask: new Promise<void>(() => {}) });
    await renderRouter(routes, { initialUrl: '/entry/new' });
    await pressRadio('Biasa');
    await press('Simpan');
    expect(await screen.findByText('Tersimpan. Mau cerita lebih?')).toBeOnTheScreen();
  });

  it('"Nanti saja" goes back to Beranda', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await pressRadio('Biasa');
    await press('Simpan');
    await press('Nanti saja');
    expect(await screen.findByText('Gimana perasaanmu sekarang?')).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
  });

  it('"Nanti saja" also lands on Beranda when the screen was opened directly', async () => {
    await renderRouter(routes, { initialUrl: '/entry/new' });
    await pressRadio('Biasa');
    await press('Simpan');
    await press('Nanti saja');
    expect(await screen.findByText('Gimana perasaanmu sekarang?')).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
  });

  it('saves picked contexts with "Simpan detail" and reruns post-save', async () => {
    await saveMoodAndOpenDetails();
    await press('Konteks');
    await press('Akademik');
    await press('deadline');
    await press('Simpan detail');

    await eventually(async () =>
      expect((await onlyEntry()).contexts).toEqual([{ category: 'akademik', subTag: 'akademik.deadline' }]),
    );
    const entry = await onlyEntry();
    expect(mockedRunPostSave).toHaveBeenCalledTimes(2);
    expect(mockedRunPostSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: entry.id, contexts: entry.contexts }),
      expect.anything(),
    );
    await waitFor(() => expect(screen).toHavePathname(`/entry/${entry.id}`));
  });

  it('saves a coping as "belum tahu" unless the user answers', async () => {
    await saveMoodAndOpenDetails();
    await press('Coping');
    await press('dengar musik');
    await press('Simpan detail');
    await eventually(async () =>
      expect((await onlyEntry()).copings).toEqual([{ tag: 'coping.dengar-musik', helped: 'belum_tahu' }]),
    );
  });

  it('saves a custom tag as custom:Magang', async () => {
    await saveMoodAndOpenDetails();
    await press('Konteks');
    await press('Akademik');
    await press('Tambah sendiri di Akademik');
    await fireEvent.changeText(screen.getByLabelText('Tag baru di Akademik'), 'Magang');
    await press('Tambah');
    await press('Simpan detail');
    await eventually(async () =>
      expect((await onlyEntry()).contexts).toEqual([{ category: 'akademik', subTag: 'custom:Magang' }]),
    );
  });

  it('clears the draft once the mood is saved', async () => {
    await renderRouter(routes, { initialUrl: '/entry/new' });
    await pressRadio('Biasa');
    await flushDraft();
    expect(await getDraft(db)).toEqual({ mood: 3 });
    await press('Simpan');
    await screen.findByText('Tersimpan. Mau cerita lebih?');
    await flushDraft();
    expect(await getDraft(db)).toBeNull();
  });

  it('restores typed text after the screen closes mid-way, and clears it after "Simpan detail"', async () => {
    await saveMoodAndOpenDetails();
    await press('Tulisan bebas');
    await fireEvent.changeText(screen.getByLabelText('Tulisan bebas, isi catatan'), 'capek banget hari ini');
    const first = await screen.findByLabelText('Tulisan bebas, isi catatan');
    expect(first).toHaveDisplayValue('capek banget hari ini');

    // Aplikasi tertutup sebelum jeda draft habis.
    screen.unmount();
    await eventually(async () => expect((await getDraft(db))?.note).toBe('capek banget hari ini'));

    await renderRouter(routes, { initialUrl: '/entry/new' });
    expect(await screen.findByDisplayValue('capek banget hari ini')).toBeOnTheScreen();
    await press('Simpan detail');

    await eventually(async () => expect((await onlyEntry()).note).toBe('capek banget hari ini'));
    await flushDraft();
    expect(await getDraft(db)).toBeNull();
  });

  it('backdates a catch-up entry with "Waktu: sekarang · Ubah"', async () => {
    await renderRouter(routes, { initialUrl: '/entry/new' });
    expect(await screen.findByText('Waktu: sekarang')).toBeOnTheScreen();
    await press('Ubah waktu catatan');
    await fireEvent(screen.getByTestId('picker-date'), 'valueChange', {}, new Date('2026-10-29T10:00:00+07:00'));
    await fireEvent(screen.getByTestId('picker-time'), 'valueChange', {}, new Date('2026-10-29T21:30:00+07:00'));
    expect(screen.getByText('Waktu: Kamis, 29 Okt 2026 · 21.30')).toBeOnTheScreen();
    await pressRadio('Biasa');
    await press('Simpan');
    await screen.findByText('Tersimpan. Mau cerita lebih?');
    expect((await onlyEntry()).createdAt).toBe('2026-10-29T21:30:00.000+07:00');
  });
});

describe('entry/[id]', () => {
  async function seed(patch: Partial<Entry> = {}): Promise<Entry> {
    const e = await createEntry(db, { mood: 2, note: 'deadline numpuk, capek banget' }, NOW);
    if (Object.keys(patch).length === 0) return e;
    return (await updateEntry(db, e.id, patch, NOW))!;
  }

  it('shows the entry', async () => {
    const e = await seed({ contexts: [{ category: 'akademik', subTag: 'akademik.deadline' }] });
    await renderRouter(routes, { initialUrl: `/entry/${e.id}` });
    expect(await screen.findByText('deadline numpuk, capek banget')).toBeOnTheScreen();
    expect(screen.getByText('Kurang baik')).toBeOnTheScreen();
    expect(screen.getByText(/Akademik/)).toBeOnTheScreen();
  });

  it('"Pakai" moves suggestions into the entry and clears pendingSuggestions', async () => {
    const e = await seed({
      pendingSuggestions: { contexts: ['akademik'], experiences: ['fisik.lelah'], copings: [] },
    });
    await renderRouter(routes, { initialUrl: `/entry/${e.id}` });
    expect(await screen.findByLabelText('Akademik, disarankan')).toBeOnTheScreen();
    await press('Pakai');
    await eventually(async () => expect((await getEntry(db, e.id))?.pendingSuggestions).toBeNull());
    const saved = (await getEntry(db, e.id))!;
    expect(saved.contexts).toEqual([{ category: 'akademik', subTag: null }]);
    expect(saved.experiences).toEqual([{ dimension: 'fisik', tag: 'fisik.lelah' }]);
    expect(saved.aiSuggested).toEqual(['akademik', 'fisik.lelah']);
    await waitFor(() => expect(screen.queryByLabelText('Akademik, disarankan')).toBeNull());
  });

  it('"Abaikan" clears pendingSuggestions without touching the entry', async () => {
    const e = await seed({ pendingSuggestions: { contexts: ['akademik'], experiences: [], copings: [] } });
    await renderRouter(routes, { initialUrl: `/entry/${e.id}` });
    await press('Abaikan');
    await eventually(async () => expect((await getEntry(db, e.id))?.pendingSuggestions).toBeNull());
    expect((await getEntry(db, e.id))?.contexts).toEqual([]);
  });

  it('asks before deleting, and "Batal" keeps the entry', async () => {
    const e = await seed();
    await renderRouter(routes, { initialUrl: `/entry/${e.id}` });
    await press('Hapus');
    const dialog = within(await screen.findByLabelText('Konfirmasi hapus catatan'));
    expect(
      dialog.getByText('Hapus catatan ini? Catatan yang dihapus tidak bisa dikembalikan.'),
    ).toBeOnTheScreen();
    await fireEvent.press(dialog.getByRole('button', { name: 'Batal' }));
    await waitFor(() => expect(screen.queryByLabelText('Konfirmasi hapus catatan')).toBeNull());
    expect(await getEntry(db, e.id)).not.toBeNull();
  });

  it('deletes after confirming and leaves the screen', async () => {
    const e = await seed();
    await renderRouter(routes, { initialUrl: `/entry/${e.id}` });
    await press('Hapus');
    const dialog = within(await screen.findByLabelText('Konfirmasi hapus catatan'));
    await fireEvent.press(dialog.getByRole('button', { name: 'Hapus' }));
    await eventually(async () => expect(await getEntry(db, e.id)).toBeNull());
    await waitFor(() => expect(screen).toHavePathname('/'));
  });

  it('"Ubah" opens the details form and saves changes, rerunning post-save', async () => {
    const e = await seed();
    await renderRouter(routes, { initialUrl: `/entry/${e.id}` });
    await press('Ubah');
    const input = await screen.findByLabelText('Tulisan bebas, isi catatan');
    await fireEvent.changeText(input, 'sudah lebih lega');
    await pressRadio('Biasa');
    await press('Simpan perubahan');
    await eventually(async () => expect((await getEntry(db, e.id))?.note).toBe('sudah lebih lega'));
    expect((await getEntry(db, e.id))?.mood).toBe(3);
    expect(mockedRunPostSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: e.id, note: 'sudah lebih lega' }),
      expect.anything(),
    );
    expect(await screen.findByText('sudah lebih lega')).toBeOnTheScreen();
  });

  it('shows a calm message when the entry no longer exists', async () => {
    await renderRouter(routes, { initialUrl: '/entry/tidak-ada' });
    expect(await screen.findByText('Catatan ini sudah tidak ada.')).toBeOnTheScreen();
  });
});
