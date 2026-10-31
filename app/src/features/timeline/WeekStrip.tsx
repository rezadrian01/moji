import { View } from 'react-native';

import { localDateKey } from '@/domain/period';
import { MOOD_LABELS } from '@/domain/taxonomy';
import type { Entry, Mood } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui/Text';

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatDayLabel(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Tujuh hari mulai `weekStart` (Senin). Hari tanpa catatan: titik netral, tanpa teks khusus. */
export function WeekStrip({ entries, weekStart }: { entries: Entry[]; weekStart: Date }) {
  const theme = useTheme();
  const byDay = new Map<string, number[]>();
  for (const e of entries) {
    const key = localDateKey(new Date(e.createdAt));
    byDay.set(key, [...(byDay.get(key) ?? []), e.mood]);
  }
  const days = Array.from({ length: 7 }, (_, i) => {
    return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
  });

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map((d) => {
        const key = localDateKey(d);
        const moods = byDay.get(key);
        const avg = moods
          ? (Math.min(5, Math.max(1, Math.round(moods.reduce((a, b) => a + b, 0) / moods.length))) as Mood)
          : null;
        const label = avg ? `${formatDayLabel(d)}, suasana rata-rata ${MOOD_LABELS[avg]}` : formatDayLabel(d);
        return (
          <View
            key={key}
            testID={`week-day-${key}`}
            accessible
            accessibilityLabel={label}
            style={{ alignItems: 'center', gap: theme.space(2), flex: 1, minHeight: 48 }}
          >
            <Text variant="caption" muted>
              {DAY_NAMES[d.getDay()].slice(0, 3)}
            </Text>
            <View
              testID={`week-dot-${key}`}
              style={{
                width: avg ? 24 : 10,
                height: avg ? 24 : 10,
                marginVertical: avg ? 0 : 7,
                borderRadius: 12,
                backgroundColor: avg ? theme.color.mood[avg] : theme.color.border,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}
