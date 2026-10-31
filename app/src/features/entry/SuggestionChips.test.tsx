import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Entry, Suggestions } from '@/domain/types';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { applySuggestions, SuggestionChips } from './SuggestionChips';

const base: Entry = {
  id: 'e1',
  createdAt: '2026-10-30T20:00:00.000+07:00',
  updatedAt: '2026-10-30T20:00:00.000+07:00',
  mood: 2,
  note: 'deadline numpuk, capek banget',
  contexts: [],
  experiences: [],
  copings: [],
  aiSuggested: [],
  pendingSuggestions: null,
  safetyShownLevel: 'none',
};

const suggestions: Suggestions = {
  contexts: ['akademik'],
  experiences: ['fisik.lelah'],
  copings: ['coping.istirahat-tidur'],
};

function renderChips(entry: Entry, onAccept = jest.fn(), onDismiss = jest.fn()) {
  return render(
    <ThemeProvider>
      <SuggestionChips entry={entry} onAccept={onAccept} onDismiss={onDismiss} />
    </ThemeProvider>,
  );
}

describe('SuggestionChips', () => {
  it('renders nothing when there are no pending suggestions', async () => {
    await renderChips(base);
    expect(screen.queryByRole('button', { name: 'Pakai' })).toBeNull();
    expect(screen.toJSON()).toBeNull();
  });

  it('shows every suggestion as a "disarankan" chip', async () => {
    await renderChips({ ...base, pendingSuggestions: suggestions });
    expect(screen.getByLabelText('Akademik, disarankan')).toBeOnTheScreen();
    expect(screen.getByLabelText('lelah, disarankan')).toBeOnTheScreen();
    expect(screen.getByLabelText('istirahat/tidur, disarankan')).toBeOnTheScreen();
    expect(screen.getAllByText('disarankan')).toHaveLength(3);
  });

  it('"Pakai" with nothing picked accepts all suggestions', async () => {
    const onAccept = jest.fn();
    await renderChips({ ...base, pendingSuggestions: suggestions }, onAccept);
    await fireEvent.press(screen.getByRole('button', { name: 'Pakai' }));
    expect(onAccept).toHaveBeenCalledWith(suggestions);
  });

  it('"Pakai" accepts only the chips the user picked', async () => {
    const onAccept = jest.fn();
    await renderChips({ ...base, pendingSuggestions: suggestions }, onAccept);
    await fireEvent.press(screen.getByLabelText('lelah, disarankan'));
    await fireEvent.press(screen.getByRole('button', { name: 'Pakai' }));
    expect(onAccept).toHaveBeenCalledWith({ contexts: [], experiences: ['fisik.lelah'], copings: [] });
  });

  it('"Abaikan" dismisses the suggestions', async () => {
    const onAccept = jest.fn();
    const onDismiss = jest.fn();
    await renderChips({ ...base, pendingSuggestions: suggestions }, onAccept, onDismiss);
    await fireEvent.press(screen.getByRole('button', { name: 'Abaikan' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });
});

describe('applySuggestions', () => {
  it('moves accepted ids into the entry, records them in aiSuggested and clears pendingSuggestions', () => {
    const patch = applySuggestions({ ...base, pendingSuggestions: suggestions }, suggestions);
    expect(patch).toEqual({
      contexts: [{ category: 'akademik', subTag: null }],
      experiences: [{ dimension: 'fisik', tag: 'fisik.lelah' }],
      copings: [{ tag: 'coping.istirahat-tidur', helped: 'belum_tahu' }],
      aiSuggested: ['akademik', 'fisik.lelah', 'coping.istirahat-tidur'],
      pendingSuggestions: null,
    });
  });

  it('keeps what the user already wrote and never duplicates a tag', () => {
    const entry: Entry = {
      ...base,
      contexts: [{ category: 'akademik', subTag: 'akademik.deadline' }],
      experiences: [{ dimension: 'fisik', tag: 'fisik.lelah' }],
      copings: [{ tag: 'coping.istirahat-tidur', helped: 'ya' }],
      aiSuggested: ['emosi.cemas'],
      pendingSuggestions: suggestions,
    };
    const patch = applySuggestions(entry, suggestions);
    expect(patch.contexts).toEqual([{ category: 'akademik', subTag: 'akademik.deadline' }]);
    expect(patch.experiences).toEqual([{ dimension: 'fisik', tag: 'fisik.lelah' }]);
    expect(patch.copings).toEqual([{ tag: 'coping.istirahat-tidur', helped: 'ya' }]);
    // Tag yang sudah ditulis pengguna sendiri tidak dihitung sebagai saran AI.
    expect(patch.aiSuggested).toEqual(['emosi.cemas']);
    expect(patch.pendingSuggestions).toBeNull();
  });

  it('ignores experience ids outside the taxonomy', () => {
    const patch = applySuggestions(base, { contexts: [], experiences: ['asing.x'], copings: [] });
    expect(patch.experiences).toEqual([]);
    expect(patch.aiSuggested).toEqual([]);
  });
});
