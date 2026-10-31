import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { DEV_TOOLS_ENABLED } from '@/features/app/startup';
import { useTheme } from '@/theme/ThemeProvider';
import { useCalmMotion } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: 56,
        paddingHorizontal: theme.space(4),
        justifyContent: 'center',
        backgroundColor: theme.color.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.color.border,
      }}
    >
      <Text variant="body">{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { enter } = useCalmMotion();
  const version = Constants.expoConfig?.version;
  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Pengaturan
      </Text>
      <Animated.View entering={enter} style={{ gap: theme.space(3) }}>
        <Row label="Bantuan AI" onPress={() => router.push('/settings/ai')} />
        <Row label="Kontak bantuan" onPress={() => router.push('/settings/contacts')} />
        <Row label="Pengingat" onPress={() => router.push('/settings/reminders')} />
        <Row label="Privasi & data" onPress={() => router.push('/settings/privacy')} />
        <Row label="Butuh bantuan?" onPress={() => router.push('/help')} />
        {DEV_TOOLS_ENABLED ? (
          <Row label="Alat tim (data contoh)" onPress={() => router.push('/dev/seed')} />
        ) : null}
        <View
          accessible
          accessibilityLabel="Tentang MOJI"
          style={{ gap: theme.space(1), paddingTop: theme.space(3) }}
        >
          <Text variant="heading">Tentang MOJI</Text>
          {version ? (
            <Text variant="caption" muted>
              Versi {version}
            </Text>
          ) : null}
          <Text muted>MOJI bukan alat diagnosis dan bukan layanan darurat.</Text>
        </View>
      </Animated.View>
    </Screen>
  );
}
