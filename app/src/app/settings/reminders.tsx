import { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';

import { getSettings, updateSettings } from '@/db/settingsRepo';
import { useDb, useDbQuery } from '@/db/useDbQuery';
import type { AppSettings } from '@/domain/types';
import { applyReminderSettings, ensureNotificationPermission } from '@/features/reminders/scheduler';
import { useTheme } from '@/theme/ThemeProvider';
import { Chip } from '@/ui/Chip';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const DEFAULT_TIME = '20:00';
const HOURS = Array.from({ length: 19 }, (_, i) => `${String(i + 5).padStart(2, '0')}:00`);
const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function RemindersScreen() {
  const theme = useTheme();
  const db = useDb();
  const { data: settings } = useDbQuery(getSettings, ['settings'], []);
  const [denied, setDenied] = useState(false);

  async function change(patch: Partial<AppSettings>) {
    const next = await updateSettings(db, patch);
    await applyReminderSettings(next);
  }

  async function toggle(patch: Partial<AppSettings>) {
    if (Object.values(patch)[0]) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        setDenied(true);
        return;
      }
    }
    setDenied(false);
    await change(patch);
  }

  const daily = settings?.reminderTime ?? null;
  const row = { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 } as const;

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Pengingat
      </Text>
      {settings ? (
        <>
          <View style={row}>
            <Text style={{ flex: 1 }}>Pengingat harian</Text>
            <Switch
              accessibilityLabel="Pengingat harian"
              value={daily !== null}
              onValueChange={(on) => toggle({ reminderTime: on ? DEFAULT_TIME : null })}
            />
          </View>
          {daily !== null ? (
            <View style={{ gap: theme.space(2) }}>
              <Text variant="caption" muted>
                Jam pengingat
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
                  {HOURS.map((h) => (
                    <Chip key={h} label={h} selected={h === daily} onToggle={() => change({ reminderTime: h })} />
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <View style={row}>
            <Text style={{ flex: 1 }}>Ringkasan mingguan</Text>
            <Switch
              accessibilityLabel="Ringkasan mingguan"
              value={settings.weeklyNudge}
              onValueChange={(on) => toggle({ weeklyNudge: on })}
            />
          </View>
          {settings.weeklyNudge ? (
            <View style={{ gap: theme.space(2) }}>
              <Text variant="caption" muted>
                Hari ringkasan
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
                  {DAYS.map((d, i) => (
                    <Chip
                      key={d}
                      label={d}
                      selected={settings.weeklyNudgeDay === i + 1}
                      onToggle={() => change({ weeklyNudgeDay: i + 1 })}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          {denied ? (
            <Text muted>
              Izin notifikasi belum aktif, jadi pengingat belum bisa dinyalakan. Kamu bisa mengizinkannya di
              pengaturan HP kapan saja.
            </Text>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
