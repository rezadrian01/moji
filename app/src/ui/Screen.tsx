import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

export function Screen({ children, scroll = false }: { children: React.ReactNode; scroll?: boolean }) {
  const theme = useTheme();
  const padding = theme.space(5);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding, gap: theme.space(4) }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding, gap: theme.space(4) }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
