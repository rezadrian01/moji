import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { Sheet } from './Sheet';
import { Text } from './Text';

const child = <Text>Isi sheet</Text>;

function animationType(): unknown {
  const json = screen.toJSON();
  const root = Array.isArray(json) ? json[0] : json;
  return (root?.props as { animationType?: string } | undefined)?.animationType;
}

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
    await fireEvent.press(screen.getAllByLabelText('Tutup')[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exposes its label to screen readers', async () => {
    await render(
      <ThemeProvider>
        <Sheet visible onClose={() => {}} accessibilityLabel="Bantuan">
          {child}
        </Sheet>
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Bantuan')).toBeOnTheScreen();
  });

  it('shows a visible close button that calls onClose', async () => {
    const onClose = jest.fn();
    await render(
      <ThemeProvider>
        <Sheet visible onClose={onClose} accessibilityLabel="Bantuan">
          {child}
        </Sheet>
      </ThemeProvider>,
    );
    await fireEvent.press(screen.getByText('Tutup'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports a custom close label and hiding the close button', async () => {
    const { rerender } = await render(
      <ThemeProvider>
        <Sheet visible onClose={() => {}} accessibilityLabel="Bantuan" closeLabel="Selesai">
          {child}
        </Sheet>
      </ThemeProvider>,
    );
    expect(screen.getByText('Selesai')).toBeOnTheScreen();
    await rerender(
      <ThemeProvider>
        <Sheet visible onClose={() => {}} accessibilityLabel="Bantuan" hideCloseButton>
          {child}
        </Sheet>
      </ThemeProvider>,
    );
    expect(screen.queryByText('Selesai')).toBeNull();
    expect(screen.queryByText('Tutup')).toBeNull();
  });

  it('uses a gentle animation, and none with reduce motion', async () => {
    const spy = jest.spyOn(Reanimated, 'useReducedMotion');
    spy.mockReturnValue(false);
    const { rerender } = await render(
      <ThemeProvider>
        <Sheet visible onClose={() => {}} accessibilityLabel="Bantuan">
          {child}
        </Sheet>
      </ThemeProvider>,
    );
    expect(animationType()).toBe('fade');
    spy.mockReturnValue(true);
    await rerender(
      <ThemeProvider>
        <Sheet visible onClose={() => {}} accessibilityLabel="Bantuan">
          {child}
        </Sheet>
      </ThemeProvider>,
    );
    expect(animationType()).toBe('none');
    spy.mockRestore();
  });
});
