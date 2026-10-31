import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { Sheet } from './Sheet';
import { Text } from './Text';

const child = <Text>Isi sheet</Text>;

describe('Sheet', () => {
  it('does not render children when not visible', async () => {
    await render(
      <ThemeProvider>
        <Sheet visible={false} onClose={() => {}} accessibilityLabel="Bantuan">
          {child}
        </Sheet>
      </ThemeProvider>,
    );
    expect(screen.queryByText('Isi sheet')).toBeNull();
  });

  it('renders children when visible and closes via the backdrop', async () => {
    const onClose = jest.fn();
    await render(
      <ThemeProvider>
        <Sheet visible onClose={onClose} accessibilityLabel="Bantuan">
          {child}
        </Sheet>
      </ThemeProvider>,
    );
    expect(screen.getByText('Isi sheet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Tutup'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
