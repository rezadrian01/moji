import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui/Text';

/** Penjelasan izin AI. Dipakai di onboarding, pengaturan AI, dan Privasi & data. */
export function AiConsentText() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space(3) }}>
      <Text>
        Kalau kamu aktifkan, tulisan di catatanmu dan ringkasan polamu dikirim ke AI (Gemini) untuk menyarankan
        kategori, menuliskan insight, dan membantu mengenali saat kamu mungkin butuh dukungan.
      </Text>
      <Text>Server MOJI tidak menyimpan tulisanmu.</Text>
      <Text>Kamu bisa mematikannya kapan saja di Pengaturan.</Text>
    </View>
  );
}
