import { Pressable, View } from 'react-native';

import { getFeedbackForInsight, setFeedback } from '@/db/feedbackRepo';
import { useDb, useDbQuery } from '@/db/useDbQuery';
import type { FeedbackValue } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui/Text';

const OPTIONS: { value: FeedbackValue; label: string }[] = [
  { value: 'sesuai', label: 'Sesuai' },
  { value: 'sebagian', label: 'Sebagian' },
  { value: 'tidak_sesuai', label: 'Tidak sesuai' },
];

export function PatternFeedback({ insightId, patternKey }: { insightId: string; patternKey: string }) {
  const theme = useTheme();
  const db = useDb();
  const { data } = useDbQuery((d) => getFeedbackForInsight(d, insightId), ['feedback'], [insightId]);
  const current = data?.[patternKey] ?? null;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Apakah pola ini terasa sesuai?"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}
    >
      {OPTIONS.map((o) => {
        const selected = current === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => {
              void setFeedback(db, insightId, patternKey, o.value, new Date());
            }}
            style={{
              minHeight: 48,
              minWidth: 48,
              paddingHorizontal: theme.space(4),
              justifyContent: 'center',
              borderRadius: theme.radius.lg,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? theme.color.primary : theme.color.border,
              backgroundColor: selected ? theme.color.surfaceAlt : theme.color.surface,
            }}
          >
            <Text style={selected ? { fontFamily: theme.font.semibold } : undefined}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
