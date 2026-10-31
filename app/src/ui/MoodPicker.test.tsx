import { fireEvent, render, screen } from '@testing-library/react-native';

import { MOOD_LABELS } from '@/domain/taxonomy';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { MoodPicker } from './MoodPicker';

describe('MoodPicker', () => {
  it('renders 5 labelled radios, fires onChange, marks the selected one', async () => {
    const onChange = jest.fn();
    await render(
      <ThemeProvider>
        <MoodPicker value={4} onChange={onChange} />
      </ThemeProvider>,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    for (const label of Object.values(MOOD_LABELS)) {
      expect(screen.getByRole('radio', { name: label })).toBeOnTheScreen();
    }
    expect(screen.getByRole('radio', { name: 'Baik' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Kurang baik' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Kurang baik' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('has nothing selected when value is null', async () => {
    await render(
      <ThemeProvider>
        <MoodPicker value={null} onChange={() => {}} />
      </ThemeProvider>,
    );
    expect(screen.getByRole('radio', { name: 'Biasa' })).not.toBeSelected();
  });
});
