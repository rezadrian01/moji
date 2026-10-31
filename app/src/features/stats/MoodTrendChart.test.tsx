import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { MoodTrendChart } from './MoodTrendChart';

const points = [
  { date: '2026-10-20', average: 2, count: 1 },
  { date: '2026-10-25', average: 3.5, count: 2 },
  { date: '2026-10-30', average: 4, count: 1 },
];

describe('MoodTrendChart', () => {
  it('has a non-empty accessibility label describing the chart', async () => {
    await render(
      <ThemeProvider>
        <MoodTrendChart points={points} />
      </ThemeProvider>,
    );
    const chart = screen.getByTestId('mood-trend-chart');
    expect(chart.props.accessibilityLabel).toMatch(/\S/);
    expect(chart.props.accessibilityLabel).not.toMatch(/skor|memburuk|membaik|%/);
  });

  it('renders a single point without crashing', async () => {
    await render(
      <ThemeProvider>
        <MoodTrendChart points={[points[0]]} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mood-trend-chart')).toBeOnTheScreen();
  });
});
