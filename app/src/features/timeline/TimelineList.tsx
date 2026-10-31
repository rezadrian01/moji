import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { localDateKey } from '@/domain/period';
import { CONTEXTS, MOOD_LABELS } from '@/domain/taxonomy';
import type { ContextCategory, Entry } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { MoodFace } from '@/ui/MoodFace';
import { useCalmMotion } from '@/ui/motion';
import { Text } from '@/ui/Text';

import { formatDayLabel } from './WeekStrip';

const EMPTY_COPY = 'Belum ada catatan. Kapan pun kamu siap, satu tap di Beranda sudah cukup.';
const NOTE_MAX = 80;

const pad = (n: number) => String(n).padStart(2, '0');
const formatTime = (d: Date) => `${pad(d.getHours())}.${pad(d.getMinutes())}`;
const excerpt = (note: string) => (note.length > NOTE_MAX ? `${note.slice(0, NOTE_MAX)}…` : note);
const contextLabel = (id: ContextCategory) => CONTEXTS.find((c) => c.id === id)?.label ?? id;

function EntryRow({ entry }: { entry: Entry }) {
  const theme = useTheme();
  const time = formatTime(new Date(entry.createdAt));
  const note = entry.note?.trim() ? excerpt(entry.note.trim()) : null;
  const hasSuggestion = entry.pendingSuggestions !== null;
  const label = [MOOD_LABELS[entry.mood], time, note, hasSuggestion ? 'Ada saran untukmu' : null]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(`/entry/${entry.id}`)}
      style={{
        minHeight: 48,
        flexDirection: 'row',
        gap: theme.space(3),
        padding: theme.space(3),
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.color.border,
        backgroundColor: theme.color.surface,
      }}
    >
      <MoodFace mood={entry.mood} size={36} />
      <View style={{ flex: 1, gap: theme.space(1) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="body" style={{ fontFamily: theme.font.semibold }}>
            {MOOD_LABELS[entry.mood]}
          </Text>
          <Text variant="caption" muted>
            {time}
          </Text>
        </View>
        {entry.contexts.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(1) }}>
            {[...new Set(entry.contexts.map((c) => c.category))].map((c) => (
              <View
                key={c}
                style={{
                  paddingHorizontal: theme.space(2),
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.color.surfaceAlt,
                }}
              >
                <Text variant="caption">{contextLabel(c)}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {note ? <Text variant="body">{note}</Text> : null}
        {hasSuggestion ? (
          <Text variant="caption" muted>
            Ada saran untukmu
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Daftar catatan per tanggal lokal. Tidak scroll sendiri; layar pemanggil yang scroll. */
export function TimelineList({ entries, filter }: { entries: Entry[]; filter: ContextCategory | null }) {
  const theme = useTheme();
  const { enter } = useCalmMotion();
  const shown = filter ? entries.filter((e) => e.contexts.some((c) => c.category === filter)) : entries;

  if (shown.length === 0) {
    return (
      <Animated.View entering={enter}>
        <Text muted>{EMPTY_COPY}</Text>
      </Animated.View>
    );
  }

  const groups: { key: string; date: Date; items: Entry[] }[] = [];
  for (const e of shown) {
    const date = new Date(e.createdAt);
    const key = localDateKey(date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, date, items: [e] });
  }

  return (
    // Sengaja tanpa `entering`: di Android, View ber-entering yang sibling-nya (baris chip filter)
    // muncul setelah data async termuat bisa tertinggal di frame lama dan menimpa chip.
    <View style={{ gap: theme.space(5) }}>
      {groups.map((g) => (
        <View key={g.key} style={{ gap: theme.space(2) }}>
          <Text variant="heading" accessibilityRole="header">
            {formatDayLabel(g.date)}
          </Text>
          {g.items.map((e) => (
            <EntryRow key={e.id} entry={e} />
          ))}
        </View>
      ))}
    </View>
  );
}
