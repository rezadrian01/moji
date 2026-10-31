import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/features/app/AppProviders';
import { useStartupTasks } from '@/features/app/startup';
import { useTheme } from '@/theme/ThemeProvider';

function RootStack() {
  useStartupTasks();
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          // Judul ditulis di dalam tiap layar; header hanya membawa tombol kembali.
          headerTitle: '',
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.color.bg },
          headerTintColor: theme.color.text,
          contentStyle: { backgroundColor: theme.color.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}
