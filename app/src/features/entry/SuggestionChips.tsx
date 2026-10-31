import { useState } from 'react';
import { View } from 'react-native';

import { EXPERIENCES, labelForTag } from '@/domain/taxonomy';
import type { Entry, ExperienceDimension, Suggestions } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Text } from '@/ui/Text';

const DIMENSION_OF = new Map<string, ExperienceDimension>(
  EXPERIENCES.flatMap((d) => d.tags.map((t) => [t.id, d.dimension] as const)),
);

type SuggestionPatch = Pick<Entry, 'contexts' | 'experiences' | 'copings' | 'aiSuggested' | 'pendingSuggestions'>;

/** Patch untuk `updateEntry`: saran yang diterima masuk ke catatan tanpa duplikat, lalu saran dikosongkan. */
export function applySuggestions(entry: Entry, accepted: Suggestions): SuggestionPatch {
  const added: string[] = [];
  const contexts = [...entry.contexts];
  for (const category of accepted.contexts) {
    if (contexts.some((c) => c.category === category)) continue;
    contexts.push({ category, subTag: null });
    added.push(category);
  }
  const experiences = [...entry.experiences];
  for (const tag of accepted.experiences) {
    const dimension = DIMENSION_OF.get(tag);
    if (!dimension || experiences.some((e) => e.tag === tag)) continue;
    experiences.push({ dimension, tag });
    added.push(tag);
  }
  const copings = [...entry.copings];
  for (const tag of accepted.copings) {
    if (copings.some((c) => c.tag === tag)) continue;
    copings.push({ tag, helped: 'belum_tahu' });
    added.push(tag);
  }
  const aiSuggested = [...entry.aiSuggested, ...added.filter((id) => !entry.aiSuggested.includes(id))];
  return { contexts, experiences, copings, aiSuggested, pendingSuggestions: null };
}

/** Saran AI sebagai chip "disarankan". Tidak ada yang masuk ke catatan tanpa "Pakai". */
export function SuggestionChips({
  entry,
  onAccept,
  onDismiss,
}: {
  entry: Entry;
  onAccept: (s: Suggestions) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const s = entry.pendingSuggestions;
  if (!s) return null;
  const ids = [...s.contexts, ...s.experiences, ...s.copings];
  if (ids.length === 0) return null;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const accept = () => {
    if (picked.size === 0) return onAccept(s);
    onAccept({
      contexts: s.contexts.filter((id) => picked.has(id)),
      experiences: s.experiences.filter((id) => picked.has(id)),
      copings: s.copings.filter((id) => picked.has(id)),
    });
  };

  return (
    <View
      style={{
        gap: theme.space(3),
        padding: theme.space(4),
        borderRadius: theme.radius.md,
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.border,
      }}
    >
      <View style={{ gap: theme.space(1) }}>
        <Text variant="heading">Mungkin cocok dengan catatanmu</Text>
        <Text variant="caption" muted>
          Saran dari AI. Pilih yang pas, atau pakai semuanya.
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>
        {ids.map((id) => (
          <Chip key={id} label={labelForTag(id)} suggested selected={picked.has(id)} onToggle={() => toggle(id)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: theme.space(2) }}>
        <Button
          label="Pakai"
          onPress={accept}
          accessibilityHint={picked.size === 0 ? 'Memakai semua saran' : 'Memakai saran yang kamu pilih'}
        />
        <Button label="Abaikan" variant="quiet" onPress={onDismiss} />
      </View>
    </View>
  );
}
