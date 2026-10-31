import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { BarList } from './BarList';

describe('BarList', () => {
  it('shows labels, values and captions, with a bar width relative to max', async () => {
    await render(
      <ThemeProvider>
        <BarList
          max={4}
          items={[
            { label: 'Akademik', value: 4, caption: 'rata-rata: Biasa' },
            { label: 'Keuangan', value: 1 },
          ]}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText('Akademik')).toBeOnTheScreen();
    expect(screen.getByText('rata-rata: Biasa')).toBeOnTheScreen();
    expect(screen.getByLabelText('Akademik: 4, rata-rata: Biasa')).toBeOnTheScreen();
    expect(screen.getByTestId('bar-fill-Keuangan')).toHaveStyle({ width: '25%' });
    expect(screen.getByTestId('bar-fill-Akademik')).toHaveStyle({ width: '100%' });
  });

  it('does not divide by zero when max is 0', async () => {
    await render(
      <ThemeProvider>
        <BarList max={0} items={[{ label: 'Kosong', value: 0 }]} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('bar-fill-Kosong')).toHaveStyle({ width: '0%' });
  });
});
