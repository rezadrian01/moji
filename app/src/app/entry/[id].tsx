import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { deleteEntry, getEntry, updateEntry } from '@/db/entriesRepo';
import { useDb, useDbQuery } from '@/db/useDbQuery';
import { CONTEXTS, labelForTag, MOOD_LABELS } from '@/domain/taxonomy';
import type { CopingHelped, Entry, Mood, Suggestions } from '@/domain/types';
import { clearDraftFor } from '@/features/entry/draft';
import { EntryDetailsForm, EntryTimeField, formatEntryTime, type EntryDetails } from '@/features/entry/EntryDetailsForm';
import { applySuggestions, SuggestionChips } from '@/features/entry/SuggestionChips';
import { usePostSave } from '@/features/entry/usePostSave';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { MoodFace } from '@/ui/MoodFace';
import { MoodPicker } from '@/ui/MoodPicker';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

const HELPED_TEXT: Record<CopingHelped, string> = {
  ya: 'membantu',
  sedikit: 'sedikit membantu',
  tidak: 'tidak membantu',
  belum_tahu: 'belum tahu',
};

const MESSAGES = {
  saveFailed: 'Perubahannya belum tersimpan. Coba sekali lagi, ya.',
  deleteFailed: 'Catatannya belum terhapus. Coba sekali lagi, ya.',
} as const;

const categoryLabel = (id: string) => CONTEXTS.find((c) => c.id === id)?.label ?? id;

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space(1) }}>
      <Text variant="caption" muted>
        {title}
      </Text>
      {children}
    </View>
  );
}

function EntryView({ entry }: { entry: Entry }) {
  const theme = useTheme();
  const contexts = [...new Set(entry.contexts.map((c) => c.category))].map((cat) => {
    const subs = entry.contexts.filter((c) => c.category === cat && c.subTag).map((c) => labelForTag(c.subTag!));
    return subs.length ? `${categoryLabel(cat)}: ${subs.join(', ')}` : categoryLabel(cat);
  });
  return (
    <View style={{ gap: theme.space(4) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(3) }}>
        <MoodFace mood={entry.mood} size={48} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{MOOD_LABELS[entry.mood]}</Text>
          <Text variant="caption" muted>
            {formatEntryTime(entry.createdAt)}
          </Text>
        </View>
      </View>
      {contexts.length ? (
        <Group title="Konteks">
          <Text>{contexts.join(' · ')}</Text>
        </Group>
      ) : null}
      {entry.experiences.length ? (
        <Group title="Perasaan & badan">
          <Text>{entry.experiences.map((e) => labelForTag(e.tag)).join(' · ')}</Text>
        </Group>
      ) : null}
      {entry.copings.length ? (
        <Group title="Coping">
          {entry.copings.map((c) => (
            <Text key={c.tag}>{`${labelForTag(c.tag)} (${HELPED_TEXT[c.helped]})`}</Text>
          ))}
        </Group>
      ) : null}
      {entry.note ? <Text>{entry.note}</Text> : null}
    </View>
  );
}

type Draft = { mood: Mood; details: EntryDetails };
type Editing = Draft & { initial: string };
const snapshot = (d: Draft) => JSON.stringify({ mood: d.mood, details: d.details });

export default function EntryDetailScreen() {
  const theme = useTheme();
  const db = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry, loading } = useDbQuery((d) => getEntry(d, id), ['entries'], [id]);
  const postSave = usePostSave();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [askSave, setAskSave] = useState(false);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);

  // Kembali (header/tombol back) dengan perubahan yang belum disimpan: tanya dulu.
  const dirty = editing !== null && snapshot(editing) !== editing.initial;
  const pendingLeave = useRef<(() => void) | null>(null);
  const leaveWhenClean = useRef(false);
  usePreventRemove(dirty, ({ repeat }) => {
    pendingLeave.current = repeat;
    setAskSave(true);
  });
  useEffect(() => {
    // Dijalankan setelah pencegahan dimatikan (dirty = false), supaya aksi kembali tidak tertahan lagi.
    if (dirty || !leaveWhenClean.current) return;
    leaveWhenClean.current = false;
    const go = pendingLeave.current;
    pendingLeave.current = null;
    go?.();
  }, [dirty]);

  if (loading && entry === undefined) return <Screen>{null}</Screen>;

  if (!entry || gone) {
    return (
      <Screen>
        <Text variant="heading" accessibilityRole="header">
          Catatan ini sudah tidak ada.
        </Text>
        <Button label="Kembali" variant="secondary" onPress={leave} />
      </Screen>
    );
  }

  const messageNote = message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null;

  const startEditing = () => {
    setMessage(null);
    const start: Draft = {
      mood: entry.mood,
      details: {
        note: entry.note,
        contexts: entry.contexts,
        experiences: entry.experiences,
        copings: entry.copings,
        createdAt: entry.createdAt,
      },
    };
    setEditing({ ...start, initial: snapshot(start) });
  };

  /** true kalau perubahan tersimpan (atau catatannya ternyata sudah tidak ada). */
  const saveChanges = async (): Promise<boolean> => {
    if (!editing || inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    const { details } = editing;
    try {
      const saved = await updateEntry(
        db,
        entry.id,
        { ...details, mood: editing.mood, note: details.note?.trim() ? details.note : null },
        new Date(),
      );
      if (saved) postSave(saved);
      else setGone(true);
      setEditing(null);
      return saved !== null;
    } catch {
      setMessage(MESSAGES.saveFailed);
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const cancelEditing = () => {
    if (dirty) setAskSave(true);
    else setEditing(null);
  };
  const discard = () => {
    setAskSave(false);
    leaveWhenClean.current = pendingLeave.current !== null;
    setEditing(null);
  };
  const saveFromAsk = async () => {
    setAskSave(false);
    leaveWhenClean.current = pendingLeave.current !== null;
    if (!(await saveChanges())) {
      leaveWhenClean.current = false;
      pendingLeave.current = null;
    }
  };
  const stayEditing = () => {
    setAskSave(false);
    pendingLeave.current = null;
  };

  const remove = async () => {
    setConfirming(false);
    setMessage(null);
    try {
      await deleteEntry(db, entry.id);
    } catch {
      setMessage(MESSAGES.deleteFailed);
      return;
    }
    // Draft detail milik catatan ini tidak boleh muncul lagi di catatan baru.
    await clearDraftFor(db, entry.id).catch(() => {});
    leave();
  };

  // Saran yang gagal disimpan cukup tetap tampil; pengguna bisa mencoba lagi.
  const acceptSuggestions = (s: Suggestions) =>
    updateEntry(db, entry.id, applySuggestions(entry, s), new Date()).catch(() => null);
  const dismissSuggestions = () =>
    updateEntry(db, entry.id, { pendingSuggestions: null }, new Date()).catch(() => null);

  if (editing) {
    return (
      <Screen scroll>
        <Text variant="title" accessibilityRole="header">
          Ubah catatan
        </Text>
        <MoodPicker value={editing.mood} onChange={(mood) => setEditing({ ...editing, mood })} />
        <EntryTimeField
          value={editing.details.createdAt}
          onChange={(createdAt) => setEditing({ ...editing, details: { ...editing.details, createdAt } })}
        />
        <EntryDetailsForm value={editing.details} onChange={(details) => setEditing({ ...editing, details })} />
        {messageNote}
        <View style={{ gap: theme.space(2) }}>
          <Button label="Simpan perubahan" disabled={busy} onPress={saveChanges} />
          <Button label="Batal" variant="quiet" onPress={cancelEditing} />
        </View>
        <Sheet visible={askSave} onClose={stayEditing} accessibilityLabel="Simpan perubahan?" hideCloseButton>
          <View style={{ gap: theme.space(4) }}>
            <Text variant="heading">Simpan perubahan?</Text>
            <Button label="Simpan" onPress={saveFromAsk} />
            <Button label="Buang" variant="secondary" onPress={discard} />
          </View>
        </Sheet>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header">
        Catatan
      </Text>
      <EntryView entry={entry} />
      <SuggestionChips entry={entry} onAccept={acceptSuggestions} onDismiss={dismissSuggestions} />
      {messageNote}
      <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
        <Button label="Ubah" variant="secondary" onPress={startEditing} />
        <Button label="Hapus" variant="quiet" onPress={() => setConfirming(true)} />
      </View>
      <Sheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        accessibilityLabel="Konfirmasi hapus catatan"
        hideCloseButton
      >
        <View style={{ gap: theme.space(4) }}>
          <View style={{ gap: theme.space(1) }}>
            <Text variant="heading">Hapus catatan ini?</Text>
            <Text muted>Catatan yang dihapus tidak bisa dikembalikan.</Text>
          </View>
          <Button label="Batal" onPress={() => setConfirming(false)} />
          <Button label="Hapus" variant="secondary" onPress={remove} />
        </View>
      </Sheet>
    </Screen>
  );
}
