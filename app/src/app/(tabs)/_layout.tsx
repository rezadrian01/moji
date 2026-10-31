import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { getSettings } from '@/db/settingsRepo';
import { useDbQuery } from '@/db/useDbQuery';
import { useTheme } from '@/theme/ThemeProvider';

function tabIcon(name: SymbolViewProps['name']) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={name} tintColor={color} size={size} accessible={false} />;
  };
}

const TABS = [
  { name: 'index', label: 'Beranda', icon: tabIcon({ ios: 'house', android: 'home', web: 'home' }) },
  {
    name: 'timeline',
    label: 'Timeline',
    icon: tabIcon({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }),
  },
  { name: 'polaku', label: 'Polaku', icon: tabIcon({ ios: 'sparkles', android: 'insights', web: 'insights' }) },
  {
    name: 'settings',
    label: 'Pengaturan',
    icon: tabIcon({ ios: 'gearshape', android: 'settings', web: 'settings' }),
  },
] as const;

export default function TabsLayout() {
  const theme = useTheme();
  // Dibaca segar setiap kali grup tab dipasang, jadi selesai onboarding langsung berlaku.
  const { data: settings } = useDbQuery(getSettings, ['settings'], []);

  if (!settings) return null;
  if (!settings.onboardingDone) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.textMuted,
        tabBarStyle: { backgroundColor: theme.color.surface, borderTopColor: theme.color.border },
        tabBarLabelStyle: { fontFamily: theme.font.semibold, fontSize: 12 },
        tabBarItemStyle: { minHeight: 48 },
        sceneStyle: { backgroundColor: theme.color.bg },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.label, tabBarLabel: tab.label, tabBarIcon: tab.icon }}
        />
      ))}
    </Tabs>
  );
}
