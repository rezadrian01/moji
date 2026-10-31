import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useDb } from '@/db/useDbQuery';
import { shareExport } from '@/features/data/exportData';
import { resetApp } from '@/features/data/resetApp';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

type Step = 'closed' | 'confirm' | 'type';

export default function PrivacyScreen() {
  const theme = useTheme();
  const db = useDb();
  const [step, setStep] = useState<Step>('closed');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);

  function close() {
    setStep('closed');
    setTyped('');
  }

  async function onExport() {
    setExportFailed(false);
    try {
      await shareExport(db, new Date());
    } catch {
      setExportFailed(true);
    }
  }

  async function onDelete() {
    setBusy(true);
    try {
      await resetApp(db);
      close();
      router.replace('/onboarding');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Privasi & data
      </Text>

      <View style={{ gap: theme.space(2) }}>
        <Text variant="heading" accessibilityRole="header">
          Apa yang disimpan
        </Text>
        <Text>
          Catatan, insight, dan pengaturanmu disimpan di HP ini saja. Penyimpanan catatan tidak pernah menunggu
          jaringan.
        </Text>
      </View>

      <View style={{ gap: theme.space(2) }}>
        <Text variant="heading" accessibilityRole="header">
          Apa yang dikirim
        </Text>
        <Text>
          Tidak ada yang dikirim kalau Bantuan AI mati. Kalau kamu menyalakannya, tulisan catatan dan ringkasan
          polamu dikirim ke Gemini lewat server MOJI untuk membuat saran dan insight. Server tidak menyimpannya.
        </Text>
        <Text>
          Kamu yang memutuskan: Bantuan AI hanya aktif setelah kamu mengizinkannya, dan bisa dimatikan kapan saja
          di Pengaturan.
        </Text>
      </View>

      <View style={{ gap: theme.space(2) }}>
        <Button label="Ekspor data" variant="secondary" onPress={onExport} />
        <Text variant="caption" muted>
          Simpan file ini kalau kamu mau ganti HP atau menghapus aplikasi.
        </Text>
        {exportFailed ? <Text muted>File belum bisa dibagikan. Coba lagi sebentar lagi, ya.</Text> : null}
      </View>

      <Button label="Hapus semua data" variant="secondary" onPress={() => setStep('confirm')} />

      <Sheet
        visible={step === 'confirm'}
        onClose={close}
        accessibilityLabel="Konfirmasi hapus semua data"
        closeLabel="Batal"
      >
        <View style={{ gap: theme.space(3), paddingBottom: theme.space(2) }}>
          <Text>Semua catatan, insight, dan pengaturan akan dihapus dari HP ini. Lanjutkan?</Text>
          <Button label="Lanjutkan" onPress={() => setStep('type')} />
        </View>
      </Sheet>

      <Sheet
        visible={step === 'type'}
        onClose={close}
        accessibilityLabel="Ketik HAPUS untuk menghapus"
        closeLabel="Batal"
      >
        <View style={{ gap: theme.space(3), paddingBottom: theme.space(2) }}>
          <Text>Ketik HAPUS untuk memastikan. Data yang dihapus tidak bisa dikembalikan.</Text>
          <TextInput
            accessibilityLabel="Ketik HAPUS untuk mengonfirmasi"
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: theme.color.border,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.space(3),
              color: theme.color.text,
              fontFamily: theme.font.regular,
              fontSize: 16,
            }}
          />
          <Button label="Hapus sekarang" disabled={typed !== 'HAPUS' || busy} onPress={onDelete} />
        </View>
      </Sheet>
    </Screen>
  );
}
