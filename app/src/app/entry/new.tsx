import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { defaultAiClient } from '@/ai/client';
import type { Db } from '@/db/db';
import { createEntry, listEntries, updateEntry } from '@/db/entriesRepo';
import { useDb } from '@/db/useDbQuery';
import { MOOD_LABELS } from '@/domain/taxonomy';
import type { Entry, Mood, NewEntry } from '@/domain/types';
import { useAiAllowed } from '@/features/app/useAiAllowed';
import { useDraft } from '@/features/entry/draft';
import { EntryDetailsForm, EntryTimeField, formatEntryTime, type EntryDetails } from '@/features/entry/EntryDetailsForm';
import { runPostSave } from '@/features/entry/postSave';
import { useSafety } from '@/features/safety/SafetyProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { MoodPicker } from '@/ui/MoodPicker';
import { useCalmMotion } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

type Details = Omit<EntryDetails, 'createdAt'>;
type Stage =
  | { kind: 'restoring' }
  | { kind: 'pick' }
  | { kind: 'saved'; entry: Entry }
  | { kind: 'details'; entry: Entry; resumed: boolean };

const NO_DETAILS: Details = { note: null, contexts: [], experiences: [], copings: [] };

function parseMood(raw: string | string[] | undefined): Mood | null {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? (n as Mood) : null;
}

const hasDetails = (d: Partial<Details>) =>
  !!d.note?.trim() || !!d.contexts?.length || !!d.experiences?.length || !!d.copings?.length;

const detailsOf = (d: Partial<NewEntry>): Details => ({
  note: d.note ?? null,
  contexts: d.contexts ?? [],
  experiences: d.experiences ?? [],
  copings: d.copings ?? [],
});

/** Teks yang hanya spasi disimpan sebagai "tanpa tulisan". */
const forSave = (d: Details): Details => ({ ...d, note: d.note?.trim() ? d.note : null });

/** Draft detail menyimpan createdAt + mood catatan yang sudah tersimpan; cari catatan itu lagi. */
async function findDraftEntry(db: Db, d: Partial<NewEntry>): Promise<Entry | null> {
  if (!d.createdAt || !d.mood) return null;
  const to = new Date(Date.parse(d.createdAt) + 1).toISOString();
  const found = await listEntries(db, { from: d.createdAt, to });
  return found.find((e) => e.createdAt === d.createdAt && e.mood === d.mood) ?? null;
}

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
        // Catatan sudah tersimpan; langkah lanjutan yang gagal tidak boleh menghalangi pengguna.
      });
    },
    [db, ai, aiAllowed, show],
  );
}

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function NewEntryScreen() {
  const theme = useTheme();
  const db = useDb();
  const { enter } = useCalmMotion();
  const params = useLocalSearchParams<{ mood?: string }>();
  const paramMood = parseMood(params.mood);
  const draft = useDraft();
  const postSave = usePostSave();

  const [stage, setStage] = useState<Stage>({ kind: 'restoring' });
  const [mood, setMood] = useState<Mood | null>(paramMood);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [details, setDetails] = useState<Details>(NO_DETAILS);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Pulihkan draft sekali, begitu selesai dibaca.
  const restored = useRef(false);
  useEffect(() => {
    if (!draft.loaded || restored.current) return;
    restored.current = true;
    const d = draft.draft;
    (async () => {
      if (d && hasDetails(d)) {
        const entry = await findDraftEntry(db, d).catch(() => null);
        setDetails(detailsOf(d));
        if (entry) {
          setStage({ kind: 'details', entry, resumed: true });
          return;
        }
      }
      if (d) {
        setMood(paramMood ?? d.mood ?? null);
        setCreatedAt(d.createdAt ?? null);
      }
      setStage({ kind: 'pick' });
    })();
  }, [draft.loaded, draft.draft, db, paramMood]);

  const pickDraft = (m: Mood | null, at: string | null): Partial<NewEntry> => ({
    ...(m ? { mood: m } : {}),
    ...(at ? { createdAt: at } : {}),
    // Detail dari draft lama yang catatannya sudah tidak ada ikut dibawa.
    ...(hasDetails(details) ? details : {}),
  });

  const onMood = (m: Mood) => {
    setMood(m);
    draft.save(pickDraft(m, createdAt));
  };
  const onTime = (iso: string) => {
    setCreatedAt(iso);
    draft.save(pickDraft(mood, iso));
  };

  const onSave = async () => {
    if (!mood || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const entry = await createEntry(
        db,
        { mood, ...(createdAt ? { createdAt } : {}), ...(hasDetails(details) ? forSave(details) : {}) },
        new Date(),
      );
      draft.clear();
      postSave(entry);
      setStage({ kind: 'saved', entry });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const onDetailsChange = (entry: Entry) => (v: EntryDetails) => {
    const next = detailsOf(v);
    setDetails(next);
    if (hasDetails(next)) draft.save({ mood: entry.mood, createdAt: entry.createdAt, ...next });
    else draft.clear();
  };

  const onSaveDetails = async (entry: Entry) => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const patch = forSave(details);
      const saved =
        (await updateEntry(db, entry.id, patch, new Date())) ??
        // Catatannya terhapus di tempat lain selagi detail diisi: simpan sebagai catatan baru.
        (await createEntry(db, { mood: entry.mood, createdAt: entry.createdAt, ...patch }, new Date()));
      draft.clear();
      postSave(saved);
      router.replace({ pathname: '/entry/[id]', params: { id: saved.id } });
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  const onLater = () => {
    draft.clear();
    leave();
  };

  const failedNote = failed ? (
    <Text accessibilityLiveRegion="polite">Catatanmu belum tersimpan. Coba sekali lagi, ya.</Text>
  ) : null;

  if (stage.kind === 'restoring') return <Screen>{null}</Screen>;

  if (stage.kind === 'pick') {
    return (
      <Screen scroll>
        <Animated.View entering={enter} style={{ gap: theme.space(4) }}>
          <Text variant="title" accessibilityRole="header">
            Gimana perasaanmu sekarang?
          </Text>
          <MoodPicker value={mood} onChange={onMood} />
          <EntryTimeField value={createdAt} onChange={onTime} />
          {failedNote}
          <Button label="Simpan" disabled={!mood || busy} onPress={onSave} />
        </Animated.View>
      </Screen>
    );
  }

  if (stage.kind === 'saved') {
    return (
      <Screen>
        <Animated.View entering={enter} style={{ gap: theme.space(4) }}>
          <Text variant="title" accessibilityRole="header" accessibilityLiveRegion="polite">
            Tersimpan. Mau cerita lebih?
          </Text>
          <Text muted>Kamu bisa tambahkan apa yang terjadi dan yang kamu rasakan. Boleh juga nanti saja.</Text>
          <Button label="Ceritain lebih" onPress={() => setStage({ kind: 'details', entry: stage.entry, resumed: false })} />
          <Button label="Nanti saja" variant="quiet" onPress={onLater} />
        </Animated.View>
      </Screen>
    );
  }

  const { entry, resumed } = stage;
  return (
    <Screen scroll>
      <Animated.View entering={enter} style={{ gap: theme.space(2) }}>
        <Text variant="title" accessibilityRole="header">
          Mau cerita lebih?
        </Text>
        {resumed ? <Text muted>Ceritamu tadi belum selesai. Ini lanjutannya, kalau kamu mau.</Text> : null}
        <Text variant="caption" muted>
          {`${MOOD_LABELS[entry.mood]} · ${formatEntryTime(entry.createdAt)}`}
        </Text>
      </Animated.View>
      <EntryDetailsForm value={{ ...details, createdAt: entry.createdAt }} onChange={onDetailsChange(entry)} />
      {failedNote}
      <View style={{ gap: theme.space(2) }}>
        <Button label="Simpan detail" disabled={busy} onPress={() => onSaveDetails(entry)} />
        <Button label="Nanti saja" variant="quiet" onPress={onLater} />
      </View>
    </Screen>
  );
}
