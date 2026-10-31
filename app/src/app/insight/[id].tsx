import { useLocalSearchParams } from 'expo-router';

import { getInsight } from '@/db/insightsRepo';
import { useDbQuery } from '@/db/useDbQuery';
import { InsightView } from '@/features/insights/InsightSection';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function InsightDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useDbQuery((db) => getInsight(db, String(id)), ['insights'], [id]);
  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Insight
      </Text>
      {data ? <InsightView insight={data} /> : loading ? null : <Text muted>Insight ini tidak ditemukan.</Text>}
    </Screen>
  );
}
