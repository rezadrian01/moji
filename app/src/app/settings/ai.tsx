import { useState } from 'react';
import { Switch, View } from 'react-native';

import { getInviteCode } from '@/ai/inviteStore';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { useDb, useDbQuery } from '@/db/useDbQuery';
import { AiConsentText } from '@/features/ai/AiConsentText';
import { InviteCodeForm } from '@/features/ai/InviteCodeForm';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function AiSettingsScreen() {
  const db = useDb();
  const { data: settings } = useDbQuery(getSettings, ['settings'], []);
  const [form, setForm] = useState<'none' | 'enable' | 'change'>('none');

  if (!settings) {
    return (
      <Screen>
        <Text>Sebentar, ya.</Text>
      </Screen>
    );
  }

  async function toggle(next: boolean) {
    if (!next) {
      // Kode tetap tersimpan; hanya AI yang dimatikan.
      await updateSettings(db, { aiEnabled: false });
      setForm('none');
      return;
    }
    if ((await getInviteCode()) !== null) {
      await updateSettings(db, { aiEnabled: true, aiConsentAt: new Date().toISOString() });
    } else {
      setForm('enable');
    }
  }

  async function onValid() {
    if (form === 'enable') {
      await updateSettings(db, { aiEnabled: true, aiConsentAt: new Date().toISOString() });
    }
    setForm('none');
  }

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Bantuan AI
      </Text>
      <AiConsentText />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
        <Text>Bantuan AI</Text>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel="Bantuan AI"
          value={settings.aiEnabled}
          onValueChange={(v) => void toggle(v)}
        />
      </View>
      {form !== 'none' ? (
        <>
          <InviteCodeForm onValid={() => void onValid()} />
          <Button label="Batal" variant="quiet" onPress={() => setForm('none')} />
        </>
      ) : (
        <Button label="Ganti kode" variant="secondary" onPress={() => setForm('change')} />
      )}
    </Screen>
  );
}
