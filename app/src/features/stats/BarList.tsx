import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui/Text';

export interface BarItem {
  label: string;
  value: number;
  caption?: string;
  /** Warna isi batang; default warna utama tema. */
  color?: string;
}

export function BarList({ items, max }: { items: BarItem[]; max: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space(3) }}>
      {items.map((item) => {
        const pct = max > 0 ? Math.min(100, Math.round((item.value / max) * 100)) : 0;
        return (
          <View
            key={item.label}
            accessible
            accessibilityLabel={`${item.label}: ${item.value}${item.caption ? `, ${item.caption}` : ''}`}
            style={{ gap: theme.space(1) }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.space(2) }}>
              <Text style={{ flexShrink: 1 }}>{item.label}</Text>
              <Text muted>{item.value}</Text>
            </View>
            <View
              style={{
                height: 10,
                borderRadius: theme.radius.sm,
                backgroundColor: theme.color.surfaceAlt,
                overflow: 'hidden',
              }}
            >
              <View
                testID={`bar-fill-${item.label}`}
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: theme.radius.sm,
                  backgroundColor: item.color ?? theme.color.primary,
                }}
              />
            </View>
            {item.caption ? (
              <Text variant="caption" muted>
                {item.caption}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
