/** @jest-environment ./src/domain/jakartaEnvironment.js */
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';

import { FORBIDDEN_WORDS, PRESSURE_WORDS } from '@/domain/insightText';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { EntryDetailsForm, EntryTimeField, formatEntryTime, type EntryDetails } from './EntryDetailsForm';

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: (props: { mode?: string }) => <View testID={`picker-${props.mode ?? 'date'}`} {...props} />,
  };
});

const empty: EntryDetails = {
  note: null,
  contexts: [],
  experiences: [],
  copings: [],
  createdAt: '2026-10-31T09:00:00.000+07:00',
};

let latest: EntryDetails;
function Harness({ initial = empty }: { initial?: EntryDetails }) {
  const [value, setValue] = useState(initial);
  return (
    <EntryDetailsForm
      value={value}
      onChange={(v) => {
        latest = v;
        setValue(v);
      }}
    />
  );
}

async function renderForm(initial?: EntryDetails) {
  latest = initial ?? empty;
  await render(
    <ThemeProvider>
      <Harness initial={initial} />
    </ThemeProvider>,
  );
}

const open = (section: string) => fireEvent.press(screen.getByRole('button', { name: section }));

describe('EntryDetailsForm', () => {
  it('shows the four sections folded so the screen stays calm', async () => {
    await renderForm();
    for (const section of ['Konteks', 'Perasaan & badan', 'Coping', 'Tulisan bebas']) {
      expect(screen.getByRole('button', { name: section })).toBeCollapsed();
    }
    expect(screen.queryByRole('button', { name: 'Akademik' })).toBeNull();
  });

  it('opens a section that already has content', async () => {
    await renderForm({ ...empty, note: 'tadi ketemu teman' });
    expect(screen.getByRole('button', { name: 'Tulisan bebas' })).toBeExpanded();
    expect(screen.getByDisplayValue('tadi ketemu teman')).toBeOnTheScreen();
  });

  it('picks a context category and one of its sub-tags', async () => {
    await renderForm();
    await open('Konteks');
    await fireEvent.press(screen.getByRole('button', { name: 'Akademik' }));
    expect(latest.contexts).toEqual([{ category: 'akademik', subTag: null }]);

    await fireEvent.press(screen.getByRole('button', { name: 'deadline' }));
    expect(latest.contexts).toEqual([{ category: 'akademik', subTag: 'akademik.deadline' }]);

    await fireEvent.press(screen.getByRole('button', { name: 'deadline' }));
    expect(latest.contexts).toEqual([{ category: 'akademik', subTag: null }]);

    await fireEvent.press(screen.getByRole('button', { name: 'Akademik' }));
    expect(latest.contexts).toEqual([]);
  });

  it('adds a custom context sub-tag as custom:<label>', async () => {
    await renderForm();
    await open('Konteks');
    await fireEvent.press(screen.getByRole('button', { name: 'Akademik' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah sendiri di Akademik' }));
    await fireEvent.changeText(screen.getByLabelText('Tag baru di Akademik'), '  Magang ');
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah' }));
    expect(latest.contexts).toEqual([{ category: 'akademik', subTag: 'custom:Magang' }]);
    expect(screen.getByRole('button', { name: 'Magang' })).toBeSelected();
  });

  it('ignores an empty custom tag without any scolding', async () => {
    await renderForm();
    await open('Coping');
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah sendiri di Coping' }));
    await fireEvent.changeText(screen.getByLabelText('Tag baru di Coping'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah' }));
    expect(latest.copings).toEqual([]);
  });

  it('picks feelings and body sensations', async () => {
    await renderForm();
    await open('Perasaan & badan');
    await fireEvent.press(screen.getByRole('button', { name: 'cemas' }));
    await fireEvent.press(screen.getByRole('button', { name: 'lelah' }));
    expect(latest.experiences).toEqual([
      { dimension: 'emosi', tag: 'emosi.cemas' },
      { dimension: 'fisik', tag: 'fisik.lelah' },
    ]);
  });

  it('asks "Apakah ini membantu?" per coping, defaulting to "Belum tahu"', async () => {
    await renderForm();
    await open('Coping');
    await fireEvent.press(screen.getByRole('button', { name: 'dengar musik' }));
    expect(latest.copings).toEqual([{ tag: 'coping.dengar-musik', helped: 'belum_tahu' }]);

    const group = within(screen.getByLabelText('Apakah dengar musik membantu?'));
    expect(screen.getByText(/Apakah ini membantu\?/)).toBeOnTheScreen();
    expect(group.getAllByRole('radio').map((r) => r.props.accessibilityLabel)).toEqual([
      'Ya',
      'Sedikit',
      'Tidak',
      'Belum tahu',
    ]);
    expect(group.getByRole('radio', { name: 'Belum tahu' })).toBeChecked();

    await fireEvent.press(group.getByRole('radio', { name: 'Sedikit' }));
    expect(latest.copings).toEqual([{ tag: 'coping.dengar-musik', helped: 'sedikit' }]);
  });

  it('adds a custom coping as custom:<label>', async () => {
    await renderForm();
    await open('Coping');
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah sendiri di Coping' }));
    await fireEvent.changeText(screen.getByLabelText('Tag baru di Coping'), 'Magang');
    await fireEvent.press(screen.getByRole('button', { name: 'Tambah' }));
    expect(latest.copings).toEqual([{ tag: 'custom:Magang', helped: 'belum_tahu' }]);
  });

  it('writes free text into note, and an empty note becomes null', async () => {
    await renderForm();
    await open('Tulisan bebas');
    const input = screen.getByLabelText('Tulisan bebas, isi catatan');
    await fireEvent.changeText(input, 'hari ini capek');
    expect(latest.note).toBe('hari ini capek');
    await fireEvent.changeText(input, '');
    expect(latest.note).toBeNull();
  });

  it('keeps createdAt untouched', async () => {
    await renderForm();
    await open('Tulisan bebas');
    await fireEvent.changeText(screen.getByLabelText('Tulisan bebas, isi catatan'), 'x');
    expect(latest.createdAt).toBe(empty.createdAt);
  });

  it('uses gentle copy only', async () => {
    await renderForm();
    for (const s of ['Konteks', 'Perasaan & badan', 'Coping', 'Tulisan bebas']) await open(s);
    const texts = screen
      .getAllByText(/./)
      .map((t) => String(t.props.children))
      .join(' ');
    expect(texts).not.toMatch(FORBIDDEN_WORDS);
    expect(texts).not.toMatch(PRESSURE_WORDS);
  });
});

describe('EntryTimeField', () => {
  afterEach(() => jest.useRealTimers());

  async function renderField(value: string | null, onChange = jest.fn()) {
    await render(
      <ThemeProvider>
        <EntryTimeField value={value} onChange={onChange} />
      </ThemeProvider>,
    );
    return onChange;
  }

  it('reads "Waktu: sekarang" with an "Ubah" action by default', async () => {
    await renderField(null);
    expect(screen.getByText('Waktu: sekarang')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ubah waktu catatan' })).toBeOnTheScreen();
  });

  it('picks a past date then a time, for a catch-up entry', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-31T10:00:00+07:00') });
    const onChange = await renderField(null);
    await fireEvent.press(screen.getByRole('button', { name: 'Ubah waktu catatan' }));
    const datePicker = screen.getByTestId('picker-date');
    expect(datePicker.props.maximumDate).toEqual(new Date('2026-10-31T10:00:00+07:00'));
    await fireEvent(datePicker, 'valueChange', {}, new Date('2026-10-29T10:00:00+07:00'));
    await fireEvent(screen.getByTestId('picker-time'), 'valueChange', {}, new Date('2026-10-29T20:15:00+07:00'));
    expect(onChange).toHaveBeenCalledWith('2026-10-29T20:15:00.000+07:00');
    expect(screen.queryByTestId('picker-time')).toBeNull();
  });

  it('never moves an entry into the future', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-31T10:00:00+07:00') });
    const onChange = await renderField(null);
    await fireEvent.press(screen.getByRole('button', { name: 'Ubah waktu catatan' }));
    await fireEvent(screen.getByTestId('picker-date'), 'valueChange', {}, new Date('2026-10-31T10:00:00+07:00'));
    await fireEvent(screen.getByTestId('picker-time'), 'valueChange', {}, new Date('2026-10-31T23:00:00+07:00'));
    expect(onChange).toHaveBeenCalledWith('2026-10-31T10:00:00.000+07:00');
  });

  it('closes without changing anything when dismissed', async () => {
    const onChange = await renderField(null);
    await fireEvent.press(screen.getByRole('button', { name: 'Ubah waktu catatan' }));
    await fireEvent(screen.getByTestId('picker-date'), 'dismiss');
    expect(screen.queryByTestId('picker-date')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a chosen time in Indonesian', async () => {
    await renderField('2026-10-29T20:15:00.000+07:00');
    expect(screen.getByText('Waktu: Kamis, 29 Okt 2026 · 20.15')).toBeOnTheScreen();
  });
});

describe('formatEntryTime', () => {
  it('formats in local (WIB) time', () => {
    expect(formatEntryTime('2026-11-02T00:30:00.000+07:00')).toBe('Senin, 2 Nov 2026 · 00.30');
    expect(formatEntryTime('2026-10-31T17:05:00.000Z')).toBe('Minggu, 1 Nov 2026 · 00.05');
  });
});
