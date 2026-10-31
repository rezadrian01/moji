import { useState } from 'react';
import { View } from 'react-native';

import { listEntries } from '@/db/entriesRepo';
import { useDbQuery } from '@/db/useDbQuery';
import { CONTEXTS } from '@/domain/taxonomy';
import type { ContextCategory } from '@/domain/types';
import { TimelineList } from '@/features/timeline/TimelineList';
import { WeekStrip } from '@/features/timeline/WeekStrip';
import { useTheme } from '@/theme/ThemeProvider';
import { Chip } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function currentWeekStart(now: Date): Date {
  const sinceMonday = (now.getDay() + 6) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday);
}

export default function TimelineScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<ContextCategory | null>(null);
  const { data } = useDbQuery((db) => listEntries(db, {}), ['entries'], []);
  const entries = data ?? [];
  const weekStart = currentWeekStart(new Date());
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  const thisWeek = entries.filter((e) => {
    const t = new Date(e.createdAt).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  });

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Timeline
      </Text>
      <WeekStrip entries={thisWeek} weekStart={weekStart} />
      {entries.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
          <Chip label="Semua" selected={filter === null} onToggle={() => setFilter(null)} />
          {CONTEXTS.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              selected={filter === c.id}
              onToggle={() => setFilter(filter === c.id ? null : c.id)}
            />
          ))}
        </View>
      ) : null}
      <TimelineList entries={entries} filter={filter} />
    </Screen>
  );
}
