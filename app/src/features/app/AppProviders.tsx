import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import { useEffect, useState } from 'react';

import type { Db } from '@/db/db';
import { openAppDb } from '@/db/expoDb';
import { DbContext } from '@/db/useDbQuery';
import { SafetyProvider } from '@/features/safety/SafetyProvider';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash sudah tertutup (mis. fast refresh); tidak ada yang perlu dilakukan.
});

type DbState = { status: 'loading' } | { status: 'ready'; db: Db } | { status: 'failed' };

/** Font Nunito, database, tema, dan jaring pengaman. Splash tetap tampil sampai semuanya siap. */
export function AppProviders({ children, db: injectedDb }: { children: React.ReactNode; db?: Db }) {
  const [fontsLoaded, fontError] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold });
  const [opened, setOpened] = useState<DbState>({ status: 'loading' });

  useEffect(() => {
    if (injectedDb) return;
    let cancelled = false;
    openAppDb().then(
      (db) => {
        if (!cancelled) setOpened({ status: 'ready', db });
      },
      () => {
        if (!cancelled) setOpened({ status: 'failed' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [injectedDb]);

  const dbState: DbState = injectedDb ? { status: 'ready', db: injectedDb } : opened;
  // Kalau font gagal dimuat, aplikasi tetap jalan dengan font sistem.
  const fontsSettled = fontsLoaded || fontError !== null;
  const settled = fontsSettled && dbState.status !== 'loading';

  useEffect(() => {
    if (settled) SplashScreen.hide();
  }, [settled]);

  if (!settled) return null;

  return (
    <ThemeProvider>
      {dbState.status === 'ready' ? (
        <DbContext.Provider value={dbState.db}>
          <SafetyProvider>{children}</SafetyProvider>
        </DbContext.Provider>
      ) : (
        <Screen>
          <Text variant="heading" accessibilityRole="header">
            MOJI belum bisa membuka catatanmu.
          </Text>
          <Text>Coba tutup lalu buka lagi aplikasinya, ya. Catatanmu tetap ada di HP ini.</Text>
        </Screen>
      )}
    </ThemeProvider>
  );
}
