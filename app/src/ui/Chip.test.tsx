import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { Chip } from './Chip';

describe('Chip', () => {
  it('toggles and exposes selected state', async () => {
    const onToggle = jest.fn();
    await render(
      <ThemeProvider>
        <Chip label="Kuliah" selected onToggle={onToggle} />
      </ThemeProvider>,
    );
    const chip = screen.getByRole('button', { name: 'Kuliah' });
    expect(chip).toBeSelected();
    await fireEvent.press(chip);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('not selected by default state', async () => {
    await render(
      <ThemeProvider>
        <Chip label="Kuliah" selected={false} onToggle={() => {}} />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Kuliah' })).not.toBeSelected();
  });

  it('suggested chip announces "disarankan"', async () => {
    await render(
      <ThemeProvider>
        <Chip label="Kuliah" selected={false} onToggle={() => {}} suggested />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Kuliah, disarankan')).toBeOnTheScreen();
  });

  it('shows visible "disarankan" text only for suggested, unselected chips', async () => {
    await render(
      <ThemeProvider>
        <Chip label="Kuliah" selected={false} onToggle={() => {}} suggested />
        <Chip label="Kerja" selected={false} onToggle={() => {}} />
      </ThemeProvider>,
    );
    expect(screen.getAllByText('disarankan')).toHaveLength(1);
  });
});
