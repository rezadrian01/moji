import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { listEntries } from '@/db/entriesRepo';
import { useDbQuery } from '@/db/useDbQuery';
import { computeStats, describeStats, type StatsRange } from '@/domain/stats';
import { MOOD_LABELS } from '@/domain/taxonomy';
import type { Mood } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Chip } from '@/ui/Chip';
import { useCalmMotion } from '@/ui/motion';
import { Text } from '@/ui/Text';

import { BarList, type BarItem } from './BarList';
import { MoodTrendChart } from './MoodTrendChart';

const RANGES: { id: StatsRange; label: string }[] = [
  { id: '7d', label: '7 hari' },
  { id: '30d', label: '30 hari' },
  { id: 'all', label: 'Semua' },
];
const MOODS: Mood[] = [1, 2, 3, 4, 5];
const LOW_DATA_NOTE = 'Grafik ini akan makin jelas seiring catatanmu bertambah.';
const EMPTY_CARD = 'Belum ada data untuk bagian ini.';

const nearestMood = (avg: number): Mood => Math.min(5, Math.max(1, Math.round(avg))) as Mood;

function Card({ title, summary, children }: { title: string; summary: string[]; children: React.ReactNode }) {
  const theme = useTheme();
  const { enter } = useCalmMotion();
  return (
    <Animated.View
      entering={enter}
      testID={`stats-card-${title}`}
      accessible
      accessibilityLabel={[title, ...summary].join(' ')}
      style={{
        gap: theme.space(3),
        padding: theme.space(4),
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.color.border,
        backgroundColor: theme.color.surface,
      }}
    >
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      {children}
      {summary.map((line) => (
        <Text key={line} muted>
          {line}
        </Text>
      ))}
    </Animated.View>
  );
}

export function StatsSection({ now }: { now?: Date } = {}) {
  const theme = useTheme();
  const [range, setRange] = useState<StatsRange>('30d');
  const { data: entries } = useDbQuery((db) => listEntries(db, {}), ['entries'], []);

  const stats = useMemo(
    () => (entries ? computeStats(entries, range, now ?? new Date()) : null),
    [entries, range, now],
  );

  const picker = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }} accessibilityRole="radiogroup">
      {RANGES.map((r) => (
        <Chip key={r.id} label={r.label} selected={range === r.id} onToggle={() => setRange(r.id)} />
      ))}
    </View>
  );

  if (!stats) return <View style={{ gap: theme.space(4) }}>{picker}</View>;

  if (stats.entryCount === 0) {
    return (
      <View style={{ gap: theme.space(4) }}>
        {picker}
        <Text muted>{LOW_DATA_NOTE}</Text>
      </View>
    );
  }

  const lines = describeStats(stats);
  const moodLines = lines.filter((l) => l.startsWith('Ada '));
  const contextLines = lines.filter((l) => l.startsWith('Konteks'));
  const copingLines = lines.filter((l) => l.startsWith('Kamu menandai'));

  const moodItems: BarItem[] = MOODS.filter((m) => stats.moodDistribution[m] > 0).map((m) => ({
    label: MOOD_LABELS[m],
    value: stats.moodDistribution[m],
    color: theme.color.mood[m],
  }));
  const contextItems: BarItem[] = stats.contextFrequency.map((c) => ({ label: c.label, value: c.count }));
  const moodByContextItems: BarItem[] = stats.moodByContext.map((c) => ({
    label: c.label,
    value: c.count,
    caption: `rata-rata: ${MOOD_LABELS[nearestMood(c.average)]}`,
    color: theme.color.mood[nearestMood(c.average)],
  }));
  const copingItems: BarItem[] = stats.helpfulCopings
    .filter((c) => c.helped > 0)
    .slice(0, 5)
    .map((c) => ({ label: c.label, value: c.helped, caption: `membantu ${c.helped} dari ${c.rated} kali` }));
  const feelings = Object.values(stats.frequentExperiences)
    .flat()
    .sort((a, b) => b.count - a.count);
  const feelingItems: BarItem[] = feelings.slice(0, 6).map((f) => ({ label: f.label, value: f.count }));

  const maxOf = (items: BarItem[]) => Math.max(0, ...items.map((i) => i.value));
  const topFeeling = feelings[0];

  const body = (items: BarItem[], max: number) =>
    items.length ? <BarList items={items} max={max} /> : <Text muted>{EMPTY_CARD}</Text>;

  return (
    <View style={{ gap: theme.space(4) }}>
      {picker}
      {stats.entryCount < 3 ? <Text muted>{LOW_DATA_NOTE}</Text> : null}

      <Card title="Tren mood" summary={['Tiap titik adalah rata-rata mood dari satu hari yang kamu catat.']}>
        <MoodTrendChart points={stats.dailyAverages} />
      </Card>
      <Card title="Sebaran mood" summary={moodLines}>
        {body(moodItems, maxOf(moodItems))}
      </Card>
      <Card title="Konteks yang sering muncul" summary={contextLines}>
        {body(contextItems, maxOf(contextItems))}
      </Card>
      <Card
        title="Mood menurut konteks"
        summary={['Rata-rata mood di tiap konteks, ditampilkan dengan kata terdekat.']}
      >
        {body(moodByContextItems, maxOf(moodByContextItems))}
      </Card>
      <Card
        title="Coping yang terasa membantu"
        summary={copingLines.length ? copingLines : ['Belum ada coping yang kamu tandai membantu di rentang ini.']}
      >
        {body(copingItems, Math.max(0, ...stats.helpfulCopings.map((c) => c.rated)))}
      </Card>
      <Card
        title="Yang sering kamu rasakan"
        summary={
          topFeeling
            ? [`Yang paling sering kamu catat: ${topFeeling.label} (${topFeeling.count} kali).`]
            : ['Belum ada perasaan atau kondisi yang kamu catat di rentang ini.']
        }
      >
        {body(feelingItems, maxOf(feelingItems))}
      </Card>
    </View>
  );
}
