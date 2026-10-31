import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { latestInsight } from '@/db/insightsRepo';
import { useDbQuery } from '@/db/useDbQuery';
import type { Insight } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { MoodPicker } from '@/ui/MoodPicker';
import { useCalmMotion } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function greeting(hour: number): string {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function InsightCard({ insight }: { insight: Insight }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Insight terbaru: ${insight.text}`}
      accessibilityHint="Membuka insight lengkap"
      onPress={() => router.push({ pathname: '/insight/[id]', params: { id: insight.id } })}
      style={({ pressed }) => ({
        gap: theme.space(2),
        padding: theme.space(4),
        borderRadius: theme.radius.md,
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text variant="caption" muted>
        Insight terbaru
      </Text>
      <Text numberOfLines={3}>{insight.text}</Text>
      <Text variant="caption" style={{ color: theme.color.primary, fontFamily: theme.font.semibold }}>
        Lihat selengkapnya
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { enter } = useCalmMotion();
  const { data: insight } = useDbQuery(latestInsight, ['insights'], []);

  return (
    <Screen scroll>
      <Animated.View entering={enter} style={{ gap: theme.space(4) }}>
        <View style={{ gap: theme.space(1), marginTop: theme.space(4) }}>
          <Text muted>{greeting(new Date().getHours())}</Text>
          <Text variant="title" accessibilityRole="header">
            Gimana perasaanmu sekarang?
          </Text>
        </View>
        <MoodPicker
          value={null}
          onChange={(m) => router.push({ pathname: '/entry/new', params: { mood: String(m) } })}
        />
      </Animated.View>
      {insight ? <InsightCard insight={insight} /> : null}
      <View style={{ alignItems: 'flex-start' }}>
        <Button label="Butuh bantuan?" variant="quiet" onPress={() => router.push('/help')} />
      </View>
    </Screen>
  );
}
