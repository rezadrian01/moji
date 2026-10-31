import { router } from 'expo-router';

import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

// Placeholder: diganti oleh Task 18 (Beranda & alur mencatat).
export default function HomeScreen() {
  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        Beranda
      </Text>
      <Button label="Butuh bantuan?" variant="quiet" onPress={() => router.push('/help')} />
    </Screen>
  );
}
