import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { Mood } from '@/domain/types';
import { MOOD_LABELS } from '@/domain/taxonomy';
import type { PersonalStats } from '@/domain/stats';
import { useTheme } from '@/theme/ThemeProvider';
import { MoodFace } from '@/ui/MoodFace';
import { Text } from '@/ui/Text';

const ROW = 32;
const MOODS: Mood[] = [5, 4, 3, 2, 1];
const PAD = 12;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const nearestMood = (avg: number): Mood => Math.min(5, Math.max(1, Math.round(avg))) as Mood;

function shortDate(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

export function MoodTrendChart({ points }: { points: PersonalStats['dailyAverages'] }) {
  const theme = useTheme();
  const [width, setWidth] = useState(240);
  const height = ROW * 5;
  if (points.length === 0) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const span = first && last ? dayNumber(last.date) - dayNumber(first.date) : 0;
  const x = (date: string) =>
    span === 0 ? width / 2 : PAD + ((dayNumber(date) - dayNumber(first.date)) / span) * (width - PAD * 2);
  const y = (avg: number) => ROW * (5 - Math.min(5, Math.max(1, avg))) + ROW / 2;

  const coords = points.map((p) => ({ cx: x(p.date), cy: y(p.average), mood: nearestMood(p.average) }));
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.cx} ${c.cy}`).join(' ');

  const lows = points.length ? Math.min(...points.map((p) => nearestMood(p.average))) : 3;
  const highs = points.length ? Math.max(...points.map((p) => nearestMood(p.average))) : 3;
  const label =
    `Grafik tren mood harian dari ${shortDate(first.date)} sampai ${shortDate(last.date)}. ` +
    `Rata-rata harianmu bergerak antara ${MOOD_LABELS[lows as Mood]} dan ${MOOD_LABELS[highs as Mood]}.`;

  return (
    <View testID="mood-trend-chart" accessible accessibilityRole="image" accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
        <View style={{ height }}>
          {MOODS.map((m) => (
            <View key={m} style={{ height: ROW, justifyContent: 'center' }}>
              <MoodFace mood={m} size={24} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1, height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width || 240)}>
          <Svg width={width} height={height}>
            {MOODS.map((m) => (
              <Line
                key={m}
                x1={0}
                x2={width}
                y1={y(m)}
                y2={y(m)}
                stroke={theme.color.border}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            ))}
            {coords.length > 1 ? (
              <Path d={path} stroke={theme.color.textMuted} strokeWidth={1} fill="none" opacity={0.6} />
            ) : null}
            {coords.map((c, i) => (
              <Circle
                key={points[i].date}
                cx={c.cx}
                cy={c.cy}
                r={5}
                fill={theme.color.mood[c.mood]}
                stroke={theme.color.textMuted}
                strokeWidth={1}
              />
            ))}
          </Svg>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 24 + theme.space(2) }}>
        <Text variant="caption" muted>
          {shortDate(first.date)}
        </Text>
        {last.date !== first.date ? (
          <Text variant="caption" muted>
            {shortDate(last.date)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
