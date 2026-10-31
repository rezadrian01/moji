import { Pressable } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

export function Chip({
  label,
  selected,
  onToggle,
  suggested = false,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  suggested?: boolean;
}) {
  const theme = useTheme();
  const c = theme.color;
  const dashed = suggested && !selected;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={suggested ? `${label}, disarankan` : label}
      accessibilityState={{ selected }}
      onPress={onToggle}
      style={{
        minHeight: 48,
        minWidth: 48,
        paddingHorizontal: theme.space(4),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.radius.lg,
        borderWidth: selected ? 2 : 1,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: selected ? c.primary : c.border,
        backgroundColor: selected ? c.surfaceAlt : c.surface,
      }}
    >
      <Text variant="body" style={selected ? { fontFamily: theme.font.semibold } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}
