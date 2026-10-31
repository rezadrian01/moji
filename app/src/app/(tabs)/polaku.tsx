import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { InsightSection } from '@/features/insights/InsightSection';
import { StatsSection } from '@/features/stats/StatsSection';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

type Section = 'insight' | 'stats';

const SEGMENTS: { key: Section; label: string }[] = [
  { key: 'insight', label: 'Insight' },
  { key: 'stats', label: 'Statistik' },
];

export default function PolakuScreen() {
  const theme = useTheme();
  const [section, setSection] = useState<Section>('insight');
  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Polaku
      </Text>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          padding: theme.space(1),
          gap: theme.space(1),
          borderRadius: theme.radius.md,
          backgroundColor: theme.color.surfaceAlt,
        }}
      >
        {SEGMENTS.map((s) => {
          const selected = s.key === section;
          return (
            <Pressable
              key={s.key}
              accessibilityRole="tab"
              accessibilityLabel={s.label}
              accessibilityState={{ selected }}
              onPress={() => setSection(s.key)}
              style={{
                flex: 1,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radius.sm,
                backgroundColor: selected ? theme.color.surface : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: selected ? theme.font.semibold : theme.font.regular,
                  color: selected ? theme.color.text : theme.color.textMuted,
                }}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {section === 'insight' ? <InsightSection /> : <StatsSection />}
    </Screen>
  );
}
