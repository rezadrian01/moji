import * as Linking from 'expo-linking';
import { useState } from 'react';
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
const DISCLAIMER = 'MOJI bukan layanan darurat.';
const CALL_FAILED = 'Belum bisa membuka teleponnya. Nomornya ada di atas, ya.';
const NATIONAL_HEADING = 'Layanan nasional';
const PERSONAL_HEADING = 'Orang terpercayamu';
const CAMPUS_HEADING = 'Konseling kampus';

/** Buka tautan; `section` = judul bagian tempat tombolnya, dipakai untuk pesan gagal. */
type OpenLink = (url: string, section: string) => void;

function Section({
  heading,
  callFailed = false,
  children,
}: {
  heading: string;
  callFailed?: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space(2) }}>
      <Text variant="heading" accessibilityRole="header">
        {heading}
      </Text>
      {children}
      {callFailed ? <Text accessibilityLiveRegion="polite">{CALL_FAILED}</Text> : null}
    </View>
  );
}

function ContactActions({
  heading,
  contact,
  fallbackName,
  primary,
  openLink,
  callFailed,
}: {
  heading: string;
  contact: Contact;
  fallbackName: string;
  primary: boolean;
  openLink: OpenLink;
  callFailed: boolean;
}) {
  const links = contactLinks(contact);
  const shownName = contact.name.trim();
  const name = shownName || fallbackName;
  return (
    <Section heading={heading} callFailed={callFailed}>
      {shownName ? <Text>{shownName}</Text> : null}
      {contact.phone?.trim() ? <Text muted>{contact.phone.trim()}</Text> : null}
      {links.call ? (
        <Button
          label={`Telepon ${name}`}
          variant={primary ? 'primary' : 'secondary'}
          onPress={() => openLink(links.call!, heading)}
        />
      ) : null}
      {links.whatsapp ? (
        <Button
          label={`WhatsApp ${name}`}
          variant="secondary"
          onPress={() => openLink(links.whatsapp!, heading)}
        />
      ) : null}
      {links.web ? (
        <Button label={`Buka situs ${name}`} variant="secondary" onPress={() => openLink(links.web!, heading)} />
      ) : null}
    </Section>
  );
}


function NationalServices({
  prominent,
  openLink,
  callFailed,
}: {
  prominent: boolean;
  openLink: OpenLink;
  callFailed: boolean;
}) {
  const theme = useTheme();
  const anyUnverified = NATIONAL_SERVICES.some((s) => !s.verified);
  return (
    <Section heading={NATIONAL_HEADING} callFailed={callFailed}>
      {NATIONAL_SERVICES.map((s, i) => {
        const number = displayPhone(s.phone);
        const call = contactLinks({ phone: s.phone }).call;
        if (!call) return null;
        return prominent ? (
          <View key={s.name} style={{ gap: theme.space(1) }}>
            <Button
              label={`Telepon ${s.name} (${number})`}
              variant={i === 0 ? 'primary' : 'secondary'}
              onPress={() => openLink(call, NATIONAL_HEADING)}
            />
            <Text variant="caption" muted>
              {s.description}
            </Text>
          </View>
        ) : (
          <Pressable
            key={s.name}
            accessibilityRole="link"
            accessibilityLabel={`Telepon ${s.name}, ${number}`}
            onPress={() => openLink(call, NATIONAL_HEADING)}
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
 * `showDisclaimer={false}` dipakai sheet, yang menaruh kalimat itu sendiri di atas tombol tutup.
 */
export function SupportContent({
  level,
  title,
  titleVariant = 'heading',
  onAddContact,
  showDisclaimer = true,
}: {
  level: SupportLevel;
  title: string;
  titleVariant?: 'title' | 'heading';
  onAddContact: () => void;
  showDisclaimer?: boolean;
}) {
  const theme = useTheme();
  const [failedSection, setFailedSection] = useState<string | null>(null);
  const openLink: OpenLink = (url, section) => {
    setFailedSection(null);
    // Kalau perangkat tidak bisa menelepon, pesan lembut muncul di bagian itu; nomornya tetap terlihat.
    Linking.openURL(url).catch(() => {
      if (url.startsWith('tel:')) setFailedSection(section);
    });
  };
  const failed = (section: string) => failedSection === section;
  const { data: settings } = useDbQuery(getSettings, ['settings'], []);
  const loaded = settings !== undefined;
  const personal = hasReachableContact(settings?.personalContact) ? settings.personalContact : null;
  const campus = hasReachableContact(settings?.campusContact) ? settings.campusContact : null;

  const personalBlock = personal ? (
    <ContactActions
      key="personal"
      heading={PERSONAL_HEADING}
      contact={personal}
      fallbackName="orang terpercayamu"
      primary
      openLink={openLink}
      callFailed={failed(PERSONAL_HEADING)}
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
          heading={CAMPUS_HEADING}
          contact={campus}
          fallbackName="konseling kampus"
          primary={false}
          openLink={openLink}
          callFailed={failed(CAMPUS_HEADING)}
        />
      ) : null}
      {loaded && addLabel ? <Button label={addLabel} variant="quiet" onPress={onAddContact} /> : null}
    </View>
  );

  const national = (
    <NationalServices
      key="national"
      prominent={level === 'urgent'}
      openLink={openLink}
      callFailed={failed(NATIONAL_HEADING)}
    />
  );
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
      {showDisclaimer ? <Text>{DISCLAIMER}</Text> : null}
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
      <ScrollView
        testID="support-scroll"
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ paddingBottom: theme.space(4) }}
      >
        <SupportContent level={level} title={SHEET_TITLE} onAddContact={onAddContact} showDisclaimer={false} />
      </ScrollView>
      <View style={{ gap: theme.space(3) }}>
        <Text>{DISCLAIMER}</Text>
        <Button label={CLOSE_LABEL} variant="secondary" onPress={onClose} />
      </View>
    </Sheet>
  );
}
