import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { defaultAiClient, type AiFailure } from '@/ai/client';
import { normalizeInviteCode, setInviteCode } from '@/ai/inviteStore';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';

export interface InviteChecker {
  checkInvite: (code: string) => Promise<{ ok: true; data: { valid: true } } | { ok: false; reason: AiFailure }>;
}

const MESSAGES: Partial<Record<AiFailure, string>> = {
  invalid_invite: 'Kodenya belum cocok. Coba cek lagi, ya.',
  revoked_invite: 'Kode ini sudah tidak aktif. Kamu tetap bisa memakai MOJI tanpa AI.',
};
const FALLBACK_MESSAGE = 'Koneksi lagi bermasalah. Kamu bisa coba lagi nanti.';

export function InviteCodeForm({ onValid, client }: { onValid: (code: string) => void; client?: InviteChecker }) {
  const theme = useTheme();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    setMessage(null);
    try {
      const result = await (client ?? defaultAiClient()).checkInvite(code);
      if (result.ok) {
        await setInviteCode(code);
        onValid(normalizeInviteCode(code));
      } else {
        setMessage(MESSAGES[result.reason] ?? FALLBACK_MESSAGE);
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={{ gap: theme.space(3) }}>
      <Text>Kode undangan</Text>
      <TextInput
        accessibilityLabel="Kode undangan"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="MOJI-XXX-XXXX"
        placeholderTextColor={theme.color.textMuted}
        style={{
          minHeight: 48,
          paddingHorizontal: theme.space(4),
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.color.border,
          backgroundColor: theme.color.surface,
          color: theme.color.text,
          fontFamily: theme.font.regular,
          fontSize: 16,
        }}
      />
      {message ? (
        <Text accessibilityLiveRegion="polite" muted>
          {message}
        </Text>
      ) : null}
      <Button label="Cek kode" onPress={() => void check()} disabled={checking || code.trim() === ''} />
    </View>
  );
}
