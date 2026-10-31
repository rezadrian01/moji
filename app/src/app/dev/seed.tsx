import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { defaultAiClient } from '@/ai/client';
import { useDb } from '@/db/useDbQuery';
import { DEV_TOOLS_ENABLED } from '@/features/app/startup';
import { useAiAllowed } from '@/features/app/useAiAllowed';
import { resetApp } from '@/features/data/resetApp';
import { seedSampleData } from '@/features/dev/seed';
import { generateWeeklyIfDue } from '@/features/insights/generate';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

export default function DevSeedScreen() {
  const theme = useTheme();
  const db = useDb();
  const aiAllowed = useAiAllowed();
  const [status, setStatus] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!DEV_TOOLS_ENABLED) return <Redirect href="/" />;

  async function run(action: () => Promise<string>) {
    setBusy(true);
    try {
      setStatus(await action());
    } catch {
      setStatus('Belum berhasil. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  const onSeed = () =>
    run(async () => `${await seedSampleData(db, new Date())} catatan contoh dibuat.`);

  const onInsight = () =>
    run(async () => {
      const outcome = await generateWeeklyIfDue({
        db,
        ai: defaultAiClient(),
        aiAllowed: await aiAllowed(),
        now: new Date(),
      });
      if (outcome.status === 'created') return 'Insight mingguan dibuat.';
      if (outcome.status === 'exists') return 'Insight minggu lalu sudah ada.';
      return `Catatan minggu lalu belum cukup (${outcome.entryCount}).`;
    });

  const onReset = () => {
    setConfirming(false);
    return run(async () => {
      await resetApp(db);
      return 'Semua data dihapus.';
    });
  };

  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        Alat tim (data contoh)
      </Text>
      <View style={{ gap: theme.space(3) }}>
        <Button label="Isi data contoh" disabled={busy} onPress={onSeed} />
        <Button label="Buat insight mingguan sekarang" variant="secondary" disabled={busy} onPress={onInsight} />
        <Button label="Hapus semua data" variant="secondary" disabled={busy} onPress={() => setConfirming(true)} />
        {status ? <Text accessibilityLiveRegion="polite">{status}</Text> : null}
      </View>
      <Sheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        accessibilityLabel="Konfirmasi hapus semua data"
        closeLabel="Batal"
      >
        <View style={{ gap: theme.space(3), paddingBottom: theme.space(2) }}>
          <Text>Semua catatan, insight, dan pengaturan akan dihapus dari HP ini. Lanjutkan?</Text>
          <Button label="Ya, hapus" onPress={onReset} />
        </View>
      </Sheet>
    </Screen>
  );
}
