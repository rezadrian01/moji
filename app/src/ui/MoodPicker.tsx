import { Pressable, View } from 'react-native';

import { MOOD_LABELS } from '@/domain/taxonomy';
import type { Mood } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';

import { MoodFace } from './MoodFace';
import { Text } from './Text';

const MOODS: Mood[] = [1, 2, 3, 4, 5];

export function MoodPicker({ value, onChange }: { value: Mood | null; onChange: (m: Mood) => void }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.space(1) }}>
      {MOODS.map((m) => {
        const selected = value === m;
        return (
          <Pressable
            key={m}
            accessibilityRole="radio"
            accessibilityLabel={MOOD_LABELS[m]}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(m)}
            style={{
              flex: 1,
              minHeight: 48,
              minWidth: 48,
              alignItems: 'center',
              paddingVertical: theme.space(2),
              borderRadius: theme.radius.md,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? theme.color.primary : 'transparent',
              backgroundColor: selected ? theme.color.surface : 'transparent',
            }}
          >
            <MoodFace mood={m} size={44} />
            <Text variant="caption" muted={!selected} style={{ marginTop: theme.space(1), textAlign: 'center' }}>
              {MOOD_LABELS[m]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
