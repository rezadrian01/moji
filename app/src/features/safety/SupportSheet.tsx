import * as Linking from 'expo-linking';
import { Pressable, ScrollView, View } from 'react-native';

import { getSettings } from '@/db/settingsRepo';
import { useDbQuery } from '@/db/useDbQuery';
import type { Contact, RiskLevel } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

import { contactLinks, displayPhone, hasReachableContact, NATIONAL_SERVICES } from './helpContacts';

export type SupportLevel = Exclude<RiskLevel, 'none'>;

const SHEET_TITLE = 'Kedengarannya ini berat banget.';
const BODY =
  'Kamu nggak harus menghadapinya sendirian. Kalau mau, kamu bisa menghubungi salah satu di bawah ini.';
const CLOSE_LABEL = 'Aku baik-baik saja sekarang';

function openLink(url: string): void {
  // Kalau perangkat tidak bisa membuka tautan, nomornya tetap terlihat untuk dihubungi manual.
  Linking.openURL(url).catch(() => {});
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space(2) }}>
      <Text variant="heading" accessibilityRole="header">
        {heading}
      </Text>
      {children}
    </View>
  );
}

function ContactActions({
  heading,
  contact,
  fallbackName,
  primary,
}: {
  heading: string;
  contact: Contact;
  fallbackName: string;
  primary: boolean;
}) {
  const links = contactLinks(contact);
  const shownName = contact.name.trim();
  const name = shownName || fallbackName;
  return (
    <Section heading={heading}>
      {shownName ? <Text>{shownName}</Text> : null}
      {contact.phone?.trim() ? <Text muted>{contact.phone.trim()}</Text> : null}
      {links.call ? (
        <Button
          label={`Telepon ${name}`}
          variant={primary ? 'primary' : 'secondary'}
          onPress={() => openLink(links.call!)}
        />
      ) : null}
      {links.whatsapp ? (
        <Button label={`WhatsApp ${name}`} variant="secondary" onPress={() => openLink(links.whatsapp!)} />
      ) : null}
      {links.web ? (
        <Button label={`Buka situs ${name}`} variant="secondary" onPress={() => openLink(links.web!)} />
      ) : null}
    </Section>
  );
}

function NationalServices({ prominent }: { prominent: boolean }) {
  const theme = useTheme();
  const anyUnverified = NATIONAL_SERVICES.some((s) => !s.verified);
  return (
    <Section heading="Layanan nasional">
      {NATIONAL_SERVICES.map((s) => {
        const number = displayPhone(s.phone);
        const call = contactLinks({ phone: s.phone }).call;
        if (!call) return null;
        return prominent ? (
          <View key={s.name} style={{ gap: theme.space(1) }}>
            <Button label={`Telepon ${s.name} (${number})`} onPress={() => openLink(call)} />
            <Text variant="caption" muted>
              {s.description}
            </Text>
          </View>
        ) : (
          <Pressable
            key={s.name}
            accessibilityRole="link"
            accessibilityLabel={`Telepon ${s.name}, ${number}`}
            onPress={() => openLink(call)}
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={{ color: theme.color.primary, textDecorationLine: 'underline' }}>
              {`${s.name} · ${number}`}
            </Text>
            <Text variant="caption" muted>
              {s.description}
            </Text>
          </Pressable>
        );
      })}
      {anyUnverified ? (
        <Text variant="caption" muted>
          Nomor layanan bisa berubah sewaktu-waktu.
        </Text>
      ) : null}
    </Section>
  );
}

/**
 * Isi jaring pengaman: kontak pribadi, konseling kampus, layanan nasional.
 * `urgent` menonjolkan layanan nasional sebagai tombol besar; `concern` menaruhnya paling bawah sebagai tautan.
 */
export function SupportContent({
  level,
  title,
  titleVariant = 'heading',
  onAddContact,
}: {
  level: SupportLevel;
  title: string;
  titleVariant?: 'title' | 'heading';
  onAddContact: () => void;
}) {
  const theme = useTheme();
  const { data: settings } = useDbQuery(getSettings, ['settings'], []);
  const loaded = settings !== undefined;
  const personal = hasReachableContact(settings?.personalContact) ? settings.personalContact : null;
  const campus = hasReachableContact(settings?.campusContact) ? settings.campusContact : null;

  const personalBlock = personal ? (
    <ContactActions
      key="personal"
      heading="Orang terpercayamu"
      contact={personal}
      fallbackName="orang terpercayamu"
      primary
    />
  ) : null;

  const addLabel = !campus
    ? 'Tambahkan kontak konseling kampus'
    : !personal
      ? 'Tambahkan kontak orang terpercaya'
      : null;
  const campusBlock = (
    <View key="campus" style={{ gap: theme.space(2) }}>
      {campus ? (
        <ContactActions
          heading="Konseling kampus"
          contact={campus}
          fallbackName="konseling kampus"
          primary={false}
        />
      ) : null}
      {loaded && addLabel ? <Button label={addLabel} variant="quiet" onPress={onAddContact} /> : null}
    </View>
  );

  const national = <NationalServices key="national" prominent={level === 'urgent'} />;
  const ordered =
    level === 'urgent' ? [personalBlock, national, campusBlock] : [personalBlock, campusBlock, national];

  return (
    <View style={{ gap: theme.space(5) }}>
      <View style={{ gap: theme.space(2) }}>
        <Text variant={titleVariant} accessibilityRole="header">
          {title}
        </Text>
        <Text>{BODY}</Text>
      </View>
      {ordered}
      <Text variant="caption" muted>
        MOJI bukan layanan darurat.
      </Text>
    </View>
  );
}

/** Support sheet yang muncul lembut setelah catatan disimpan. Tidak pernah memblokir apa pun. */
export function SupportSheet({
  visible,
  level,
  onClose,
  onAddContact,
}: {
  visible: boolean;
  level: SupportLevel;
  onClose: () => void;
  onAddContact: () => void;
}) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel="Bantuan untukmu" hideCloseButton>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: theme.space(4) }}>
        <SupportContent level={level} title={SHEET_TITLE} onAddContact={onAddContact} />
      </ScrollView>
      <Button label={CLOSE_LABEL} variant="secondary" onPress={onClose} />
    </Sheet>
  );
}
