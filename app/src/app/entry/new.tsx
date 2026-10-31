import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { createEntry, getEntry, updateEntry } from '@/db/entriesRepo';
import { useDb } from '@/db/useDbQuery';
import { MOOD_LABELS } from '@/domain/taxonomy';
import type { Entry, Mood } from '@/domain/types';
import { useDraft, type EntryDraft } from '@/features/entry/draft';
import { EntryDetailsForm, EntryTimeField, formatEntryTime, type EntryDetails } from '@/features/entry/EntryDetailsForm';
import { usePostSave } from '@/features/entry/usePostSave';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { MoodPicker } from '@/ui/MoodPicker';
import { useCalmMotion } from '@/ui/motion';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

type Details = Omit<EntryDetails, 'createdAt'>;
type Notice = 'resumed' | 'leftover' | null;
type Stage =
  | { kind: 'restoring' }
  | { kind: 'pick' }
  | { kind: 'saved'; entry: Entry }
  | { kind: 'details'; entry: Entry; notice: Notice };

const NO_DETAILS: Details = { note: null, contexts: [], experiences: [], copings: [] };

const NOTICE_TEXT: Record<Exclude<Notice, null>, string> = {
  resumed: 'Ceritamu tadi belum selesai. Ini lanjutannya, kalau kamu mau.',
  leftover: 'Tulisanmu sebelumnya masih ada di sini.',
};

function parseMood(raw: string | string[] | undefined): Mood | null {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? (n as Mood) : null;
}

const hasDetails = (d: Partial<Details>) =>
  !!d.note?.trim() || !!d.contexts?.length || !!d.experiences?.length || !!d.copings?.length;

const detailsOf = (d: Partial<Details>): Details => ({
  note: d.note ?? null,
  contexts: d.contexts ?? [],
  experiences: d.experiences ?? [],
  copings: d.copings ?? [],
});

/** Teks yang hanya spasi disimpan sebagai "tanpa tulisan". */
const forSave = (d: Details): Details => ({ ...d, note: d.note?.trim() ? d.note : null });

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Aturan draft (R11): teks yang sudah diketik tidak pernah dibuang diam-diam, dan mood yang di-tap
 * di Beranda selalu menjadi catatan baru.
 * - Draft detail (punya `entryId`) untuk catatan yang masih ada: dibuka tanpa mood → dilanjutkan;
 *   dibuka dengan `?mood=` → detailnya disimpan ke catatan itu dulu, lalu catatan baru dimulai.
 * - Draft detail yang catatannya sudah tidak ada: teksnya ditampilkan di catatan baru setelah disimpan.
 */
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
  // Tulisan dari draft yang catatannya sudah tidak ada; ditampilkan setelah catatan baru disimpan.
  const [leftover, setLeftover] = useState<Details | null>(null);
  const [previousSaved, setPreviousSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);

  const restored = useRef(false);
  useEffect(() => {
    if (!draft.loaded || restored.current) return;
    restored.current = true;
    const d: EntryDraft | null = draft.draft;
    (async () => {
      const carried = d && hasDetails(d) ? detailsOf(d) : null;
      const linked = carried && d?.entryId ? await getEntry(db, d.entryId).catch(() => null) : null;
      if (carried && linked && paramMood === null) {
        setDetails(carried);
        setStage({ kind: 'details', entry: linked, notice: 'resumed' });
        return;
      }
      if (carried && linked) {
        try {
          const saved = await updateEntry(db, linked.id, forSave(carried), new Date());
          if (saved) {
            postSave(saved);
            draft.clear();
            setPreviousSaved(true);
          } else {
            setLeftover(carried);
          }
        } catch {
          setLeftover(carried);
        }
      } else if (carried) {
        setLeftover(carried);
      }
      // Mood & waktu hanya dipulihkan dari draft catatan yang belum tersimpan, dan tidak pernah
      // ditempelkan ke mood yang baru di-tap.
      const unsaved = d && !d.entryId ? d : null;
      setMood(paramMood ?? unsaved?.mood ?? null);
      setCreatedAt(paramMood === null ? (unsaved?.createdAt ?? null) : null);
      setStage({ kind: 'pick' });
    })();
  }, [draft, db, paramMood, postSave]);

  const savePickDraft = (m: Mood | null, at: string | null) =>
    draft.save({
      ...(m ? { mood: m } : {}),
      ...(at ? { createdAt: at } : {}),
      ...(leftover ?? {}),
    });

  const onMood = (m: Mood) => {
    setMood(m);
    savePickDraft(m, createdAt);
  };
  const onTime = (iso: string) => {
    setCreatedAt(iso);
    savePickDraft(mood, iso);
  };

  /** Satu aksi simpan pada satu waktu, termasuk dua tap dalam satu frame. */
  const once = async (work: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await work();
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const onSave = () =>
    once(async () => {
      if (!mood) return;
      const entry = await createEntry(db, { mood, ...(createdAt ? { createdAt } : {}) }, new Date());
      postSave(entry);
      if (leftover) {
        setDetails(leftover);
        draft.save({ entryId: entry.id, mood: entry.mood, createdAt: entry.createdAt, ...leftover });
        setLeftover(null);
        setStage({ kind: 'details', entry, notice: 'leftover' });
      } else {
        draft.clear();
        setStage({ kind: 'saved', entry });
      }
    });

  const onDetailsChange = (entry: Entry) => (v: EntryDetails) => {
    const next = detailsOf(v);
    setDetails(next);
    if (hasDetails(next)) draft.save({ entryId: entry.id, mood: entry.mood, createdAt: entry.createdAt, ...next });
    else draft.clear();
  };

  const onSaveDetails = (entry: Entry) =>
    once(async () => {
      const patch = forSave(details);
      const saved =
        (await updateEntry(db, entry.id, patch, new Date())) ??
        // Catatannya terhapus di tempat lain selagi detail diisi: pengguna menekan simpan atas teks
        // yang ia lihat, jadi simpan sebagai catatan baru.
        (await createEntry(db, { mood: entry.mood, createdAt: entry.createdAt, ...patch }, new Date()));
      draft.clear();
      postSave(saved);
      router.replace({ pathname: '/entry/[id]', params: { id: saved.id } });
    });

  /** "Nanti saja" di tahap detail: apa pun yang sudah diisi tetap disimpan ke catatannya. */
  const onLaterDetails = (entry: Entry) =>
    once(async () => {
      if (hasDetails(details)) {
        const saved = await updateEntry(db, entry.id, forSave(details), new Date());
        // Kalau catatannya sudah tidak ada, draft dibiarkan dan teksnya muncul lagi lain kali.
        if (saved) {
          draft.clear();
          postSave(saved);
        }
      } else {
        draft.clear();
      }
      leave();
    });

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
          {previousSaved ? <Text muted>Ceritamu yang sebelumnya sudah tersimpan.</Text> : null}
          <Text muted>Kamu bisa tambahkan apa yang terjadi dan yang kamu rasakan. Boleh juga nanti saja.</Text>
          <Button
            label="Ceritain lebih"
            onPress={() => setStage({ kind: 'details', entry: stage.entry, notice: null })}
          />
          <Button label="Nanti saja" variant="quiet" onPress={onLater} />
        </Animated.View>
      </Screen>
    );
  }

  const { entry, notice } = stage;
  return (
    <Screen scroll>
      <Animated.View entering={enter} style={{ gap: theme.space(2) }}>
        <Text variant="title" accessibilityRole="header">
          {notice === 'leftover' ? 'Tersimpan. Mau cerita lebih?' : 'Mau cerita lebih?'}
        </Text>
        {notice ? <Text muted>{NOTICE_TEXT[notice]}</Text> : null}
        <Text variant="caption" muted>
          {`${MOOD_LABELS[entry.mood]} · ${formatEntryTime(entry.createdAt)}`}
        </Text>
      </Animated.View>
      <EntryDetailsForm value={{ ...details, createdAt: entry.createdAt }} onChange={onDetailsChange(entry)} />
      {failedNote}
      <View style={{ gap: theme.space(2) }}>
        <Button label="Simpan detail" disabled={busy} onPress={() => onSaveDetails(entry)} />
        <Button label="Nanti saja" variant="quiet" disabled={busy} onPress={() => onLaterDetails(entry)} />
      </View>
    </Screen>
  );
}
