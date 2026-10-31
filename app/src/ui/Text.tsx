import { Text as RNText, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'title' | 'heading' | 'body' | 'caption';

const SIZES: Record<Variant, { fontSize: number; lineHeight: number; weight: 'bold' | 'semibold' | 'regular' }> = {
  title: { fontSize: 28, lineHeight: 36, weight: 'bold' },
  heading: { fontSize: 20, lineHeight: 28, weight: 'semibold' },
  body: { fontSize: 16, lineHeight: 24, weight: 'regular' },
  caption: { fontSize: 13, lineHeight: 18, weight: 'regular' },
};

export function Text({
  variant = 'body',
  muted,
  style,
  ...rest
}: TextProps & { variant?: Variant; muted?: boolean }) {
  const theme = useTheme();
  const s = SIZES[variant];
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: theme.font[s.weight],
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          color: muted ? theme.color.textMuted : theme.color.text,
        },
        style,
      ]}
    />
  );
}
