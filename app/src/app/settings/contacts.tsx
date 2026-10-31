import { useEffect, useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { getSettings, updateSettings } from '@/db/settingsRepo';
import { useDb } from '@/db/useDbQuery';
import type { Contact } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

type Form = {
  campusName: string;
  campusPhone: string;
  campusUrl: string;
  personalName: string;
  personalPhone: string;
};
type Status = 'idle' | 'saving' | 'saved' | 'failed';

const orNull = (s: string) => (s.trim() === '' ? null : s.trim());

/** null kalau semua kolomnya kosong. */
function toContact(name: string, phone: string, url: string): Contact | null {
  const c: Contact = { name: name.trim(), phone: orNull(phone), url: orNull(url) };
  return c.name === '' && c.phone === null && c.url === null ? null : c;
}

function Field({
  label,
  hint,
  value,
  onChangeText,
  ...input
}: {
  label: string;
  hint: string;
  value: string;
  onChangeText: (v: string) => void;
} & Pick<TextInputProps, 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'textContentType'>) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space(1) }}>
      <Text>{hint}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        placeholderTextColor={theme.color.textMuted}
        style={{
          minHeight: 48,
          paddingHorizontal: theme.space(4),
          paddingVertical: theme.space(3),
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.color.border,
          backgroundColor: theme.color.surface,
          color: theme.color.text,
          fontFamily: theme.font.regular,
          fontSize: 16,
        }}
        {...input}
      />
    </View>
  );
}

export default function ContactsScreen() {
  const db = useDb();
  const theme = useTheme();
  const [form, setForm] = useState<Form | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    let cancelled = false;
    getSettings(db).then(
      (s) => {
        if (cancelled) return;
        setForm({
          campusName: s.campusContact?.name ?? '',
          campusPhone: s.campusContact?.phone ?? '',
          campusUrl: s.campusContact?.url ?? '',
          personalName: s.personalContact?.name ?? '',
          personalPhone: s.personalContact?.phone ?? '',
        });
      },
      () => {
        // Jangan tampilkan form kosong: menyimpannya bisa menghapus kontak yang sudah ada.
        if (!cancelled) setLoadFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db]);

  if (loadFailed) {
    return (
      <Screen>
        <Text variant="title" accessibilityRole="header">
          Kontak bantuan
        </Text>
        <Text>Kontak belum bisa dibuka. Coba buka lagi halaman ini, ya.</Text>
      </Screen>
    );
  }
  if (!form) return <Screen>{null}</Screen>;

  const set = (key: keyof Form) => (value: string) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setStatus('idle');
  };

  const save = async () => {
    setStatus('saving');
    try {
      await updateSettings(db, {
        campusContact: toContact(form.campusName, form.campusPhone, form.campusUrl),
        personalContact: toContact(form.personalName, form.personalPhone, ''),
      });
      setStatus('saved');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <Screen scroll>
      <View style={{ gap: theme.space(2) }}>
        <Text variant="title" accessibilityRole="header">
          Kontak bantuan
        </Text>
        <Text muted>
          Semuanya boleh dikosongkan. Kontak yang kamu isi akan muncul di halaman bantuan supaya mudah
          dihubungi. Kontak ini hanya disimpan di HP ini.
        </Text>
      </View>

      <View style={{ gap: theme.space(3) }}>
        <Text variant="heading" accessibilityRole="header">
          Konseling kampus
        </Text>
        <Field label="Nama konseling kampus" hint="Nama" value={form.campusName} onChangeText={set('campusName')} />
        <Field
          label="Nomor konseling kampus"
          hint="Nomor telepon"
          value={form.campusPhone}
          onChangeText={set('campusPhone')}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
        <Field
          label="Tautan konseling kampus"
          hint="Tautan (situs atau formulir)"
          value={form.campusUrl}
          onChangeText={set('campusUrl')}
          keyboardType="url"
          autoCapitalize="none"
          autoComplete="url"
          textContentType="URL"
        />
      </View>

      <View style={{ gap: theme.space(3) }}>
        <Text variant="heading" accessibilityRole="header">
          Orang terpercaya
        </Text>
        <Text muted>Satu orang yang kamu percaya, bisa dihubungi lewat telepon atau WhatsApp.</Text>
        <Field
          label="Nama orang terpercaya"
          hint="Nama"
          value={form.personalName}
          onChangeText={set('personalName')}
          autoComplete="name"
          textContentType="name"
        />
        <Field
          label="Nomor orang terpercaya"
          hint="Nomor HP"
          value={form.personalPhone}
          onChangeText={set('personalPhone')}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
      </View>

      <Button label="Simpan" onPress={save} disabled={status === 'saving'} />
      {status === 'saved' ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert">
          Kontak tersimpan.
        </Text>
      ) : null}
      {status === 'failed' ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert">
          Kontaknya belum tersimpan. Coba sekali lagi, ya.
        </Text>
      ) : null}
    </Screen>
  );
}
