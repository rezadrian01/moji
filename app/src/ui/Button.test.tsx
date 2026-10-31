import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { Button } from './Button';

describe('Button', () => {
  it('is a button with label, min height 48, and fires onPress', async () => {
    const onPress = jest.fn();
    await render(
      <ThemeProvider>
        <Button label="Simpan" onPress={onPress} accessibilityHint="Menyimpan catatan" />
      </ThemeProvider>,
    );
    const btn = screen.getByRole('button', { name: 'Simpan' });
    expect(StyleSheet.flatten(btn.props.style).minHeight).toBeGreaterThanOrEqual(48);
    await fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled and reports disabled state', async () => {
    const onPress = jest.fn();
    await render(
      <ThemeProvider>
        <Button label="Simpan" onPress={onPress} disabled />
      </ThemeProvider>,
    );
    const btn = screen.getByRole('button', { name: 'Simpan' });
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
    expect(btn).toBeDisabled();
  });
});
