import { router } from 'expo-router';
import Animated from 'react-native-reanimated';

import { SupportContent } from '@/features/safety/SupportSheet';
import { useCalmMotion } from '@/ui/motion';
import { Screen } from '@/ui/Screen';

/** Halaman "Butuh bantuan?": selalu bisa dibuka, selalu dalam bentuk lengkap. */
export default function HelpScreen() {
  const { enter } = useCalmMotion();
  return (
    <Screen scroll>
      <Animated.View entering={enter}>
        <SupportContent
          level="urgent"
          title="Butuh bantuan?"
          titleVariant="title"
          onAddContact={() => router.push('/settings/contacts')}
        />
      </Animated.View>
    </Screen>
  );
}
