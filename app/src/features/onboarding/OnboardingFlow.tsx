import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { updateSettings } from '@/db/settingsRepo';
import { useDb } from '@/db/useDbQuery';
import { AiConsentText } from '@/features/ai/AiConsentText';
import { InviteCodeForm, type InviteChecker } from '@/features/ai/InviteCodeForm';
import { applyReminderSettings, ensureNotificationPermission } from '@/features/reminders/scheduler';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { useCalmMotion } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const TIMES = ['18:00', '19:00', '20:00', '21:00', '22:00'];
const DEFAULT_TIME = '20:00';

export function OnboardingFlow({ client }: { client?: InviteChecker }) {
  const db = useDb();
  const router = useRouter();
  const theme = useTheme();
  const motion = useCalmMotion();
  const [step, setStep] = useState(1);
  const [askCode, setAskCode] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);
  const [time, setTime] = useState(DEFAULT_TIME);
  const [finishing, setFinishing] = useState(false);

  async function enableAi() {
    await updateSettings(db, { aiEnabled: true, aiConsentAt: new Date().toISOString() });
    setAiOn(true);
    setStep(4);
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    let reminderTime: string | null = null;
    if (reminderOn && (await ensureNotificationPermission())) reminderTime = time;
    const saved = await updateSettings(db, { reminderTime, onboardingDone: true });
    await applyReminderSettings(saved);
    router.replace('/');
  }

  return (
    <Screen scroll>
      <Animated.View key={step} entering={motion.enter} style={{ gap: theme.space(4) }}>
        {step === 1 ? (
          <>
            <Text variant="title" accessibilityRole="header">
              Hai, ini MOJI.
            </Text>
            <Text>
              MOJI membantumu mencatat perasaan dan melihat polanya pelan-pelan. MOJI bukan alat diagnosis dan bukan
              pengganti psikolog.
            </Text>
            <Button label="Lanjut" onPress={() => setStep(2)} />
            <Button label="Lewati" variant="quiet" onPress={() => setStep(2)} />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Text variant="title" accessibilityRole="header">
              Catatanmu milikmu.
            </Text>
            <Text>
              Semua catatan tersimpan hanya di HP ini. Kamu bisa mengekspor atau menghapusnya kapan saja. Kalau
              aplikasi dihapus, catatan ikut hilang, jadi ekspor dulu kalau perlu.
            </Text>
            <Button label="Lanjut" onPress={() => setStep(3)} />
            <Button label="Lewati" variant="quiet" onPress={() => setStep(3)} />
          </>
        ) : null}
        {step === 3 ? (
          <>
            <Text variant="title" accessibilityRole="header">
              Mau pakai bantuan AI?
            </Text>
            <AiConsentText />
            {askCode ? (
              <InviteCodeForm client={client} onValid={() => void enableAi()} />
            ) : (
              <Button label="Aktifkan" onPress={() => setAskCode(true)} />
            )}
            <Button label="Nanti saja" variant="quiet" onPress={() => setStep(4)} />
          </>
        ) : null}
        {step === 4 ? (
          <>
            <Text variant="title" accessibilityRole="header">
              Pengingat & kontak (opsional)
            </Text>
            {aiOn ? <Text muted>Bantuan AI sudah aktif.</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
              <Text>Pengingat harian</Text>
              <Switch
                accessibilityRole="switch"
                accessibilityLabel="Pengingat harian"
                value={reminderOn}
                onValueChange={setReminderOn}
              />
            </View>
            {reminderOn ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
                {TIMES.map((t) => (
                  <Chip key={t} label={t} selected={t === time} onToggle={() => setTime(t)} />
                ))}
              </View>
            ) : null}
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Isi kontak bantuan sekarang"
              onPress={() => router.push('/settings/contacts')}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <Text style={{ color: theme.color.primary, textDecorationLine: 'underline' }}>
                Isi kontak bantuan sekarang
              </Text>
            </Pressable>
            <Button label="Mulai" onPress={() => void finish()} disabled={finishing} />
          </>
        ) : null}
      </Animated.View>
    </Screen>
  );
}
