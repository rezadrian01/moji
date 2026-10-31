import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { AppState, View } from 'react-native';

import { defaultAiClient } from '@/ai/client';
import { deleteEntry, getEntry, updateEntry } from '@/db/entriesRepo';
import { useDb, useDbQuery } from '@/db/useDbQuery';
import { CONTEXTS, labelForTag, MOOD_LABELS } from '@/domain/taxonomy';
import type { CopingHelped, Entry, Mood } from '@/domain/types';
import { useAiAllowed } from '@/features/app/useAiAllowed';
import { EntryDetailsForm, EntryTimeField, formatEntryTime, type EntryDetails } from '@/features/entry/EntryDetailsForm';
import { runPostSave } from '@/features/entry/postSave';
import { applySuggestions, SuggestionChips } from '@/features/entry/SuggestionChips';
import { useSafety } from '@/features/safety/SafetyProvider';
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
  belum_tahu: 'belum tahu membantu atau tidak',
};

const categoryLabel = (id: string) => CONTEXTS.find((c) => c.id === id)?.label ?? id;

/** Safety lokal + AI setelah simpan. Tidak pernah ditunggu, dan gagalnya tidak menghalangi layar. */
function usePostSave(): (entry: Entry) => void {
  const db = useDb();
  const { show } = useSafety();
  const aiAllowed = useAiAllowed();
  const ai = useMemo(() => defaultAiClient(), []);
  return useCallback(
    (entry: Entry) => {
      runPostSave(entry, {
        db,
        ai,
        aiAllowed,
        showSupport: show,
        isAppActive: () => AppState.currentState === 'active',
        now: () => new Date(),
      }).catch(() => {
        // Perubahan sudah tersimpan; langkah lanjutan yang gagal tidak boleh menghalangi pengguna.
      });
    },
    [db, ai, aiAllowed, show],
  );
}

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

type Editing = { mood: Mood; details: EntryDetails };

export default function EntryDetailScreen() {
  const theme = useTheme();
  const db = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry, loading } = useDbQuery((d) => getEntry(d, id), ['entries'], [id]);
  const postSave = usePostSave();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (loading && entry === undefined) return <Screen>{null}</Screen>;

  if (!entry) {
    return (
      <Screen>
        <Text variant="heading" accessibilityRole="header">
          Catatan ini sudah tidak ada.
        </Text>
        <Button label="Kembali" variant="secondary" onPress={leave} />
      </Screen>
    );
  }

  const failedNote = failed ? (
    <Text accessibilityLiveRegion="polite">Perubahannya belum tersimpan. Coba sekali lagi, ya.</Text>
  ) : null;

  const startEditing = () => {
    setFailed(false);
    setEditing({
      mood: entry.mood,
      details: {
        note: entry.note,
        contexts: entry.contexts,
        experiences: entry.experiences,
        copings: entry.copings,
        createdAt: entry.createdAt,
      },
    });
  };

  const saveChanges = async () => {
    if (!editing || busy) return;
    setBusy(true);
    setFailed(false);
    const { details } = editing;
    try {
      const saved = await updateEntry(
        db,
        entry.id,
        { ...details, mood: editing.mood, note: details.note?.trim() ? details.note : null },
        new Date(),
      );
      if (saved) postSave(saved);
      setEditing(null);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setConfirming(false);
    try {
      await deleteEntry(db, entry.id);
      leave();
    } catch {
      setFailed(true);
    }
  };

  // Saran yang gagal disimpan cukup tetap tampil; pengguna bisa mencoba lagi.
  const acceptSuggestions = (s: Parameters<typeof applySuggestions>[1]) =>
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
        {failedNote}
        <View style={{ gap: theme.space(2) }}>
          <Button label="Simpan perubahan" disabled={busy} onPress={saveChanges} />
          <Button label="Batal" variant="quiet" onPress={() => setEditing(null)} />
        </View>
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
      {failedNote}
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
          <Text variant="heading">Hapus catatan ini? Catatan yang dihapus tidak bisa dikembalikan.</Text>
          <Button label="Batal" onPress={() => setConfirming(false)} />
          <Button label="Hapus" variant="secondary" onPress={remove} />
        </View>
      </Sheet>
    </Screen>
  );
}
