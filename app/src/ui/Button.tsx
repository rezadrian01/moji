import { Pressable } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  const c = theme.color;
  const bg = variant === 'primary' ? c.primary : variant === 'secondary' ? c.surface : 'transparent';
  const fg = variant === 'primary' ? c.onPrimary : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        minWidth: 48,
        paddingHorizontal: theme.space(5),
        paddingVertical: theme.space(3),
        borderRadius: theme.radius.md,
        backgroundColor: bg,
        borderWidth: variant === 'secondary' ? 1 : 0,
        borderColor: c.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <Text variant="body" style={{ color: fg, fontFamily: theme.font.semibold }}>
        {label}
      </Text>
    </Pressable>
  );
}
