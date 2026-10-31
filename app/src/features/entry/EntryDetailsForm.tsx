import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { toLocalIso } from '@/db/db';
import { CONTEXTS, COPINGS, EXPERIENCES, labelForTag } from '@/domain/taxonomy';
import type { ContextCategory, ContextTag, CopingHelped, Entry, ExperienceDimension } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Text } from '@/ui/Text';

export type EntryDetails = Pick<Entry, 'note' | 'contexts' | 'experiences' | 'copings'> & { createdAt: string };

const CUSTOM = 'custom:';
const isCustom = (id: string | null) => id !== null && id.startsWith(CUSTOM);

const HELPED_OPTIONS: { value: CopingHelped; label: string }[] = [
  { value: 'ya', label: 'Ya' },
  { value: 'sedikit', label: 'Sedikit' },
  { value: 'tidak', label: 'Tidak' },
  { value: 'belum_tahu', label: 'Belum tahu' },
];

// ---------- Waktu catatan ----------

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "Kamis, 29 Okt 2026 · 20.15" dalam waktu lokal HP. */
export function formatEntryTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

type PickerStep = { mode: 'date' } | { mode: 'time'; day: Date } | null;

/** "Waktu: sekarang · Ubah". `value` null berarti saat catatan disimpan. Waktu tidak bisa di masa depan. */
export function EntryTimeField({ value, onChange }: { value: string | null; onChange: (iso: string) => void }) {
  const theme = useTheme();
  const [step, setStep] = useState<PickerStep>(null);
  const current = value ? new Date(value) : new Date();

  const pickDay = (day: Date) => setStep({ mode: 'time', day });
  const pickTime = (day: Date, time: Date) => {
    const now = new Date();
    const picked = new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes());
    setStep(null);
    onChange(toLocalIso(picked > now ? now : picked));
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.space(1) }}>
      <Text muted>{`Waktu: ${value ? formatEntryTime(value) : 'sekarang'}`}</Text>
      <Text muted accessible={false}>
        ·
      </Text>
      <TextAction label="Ubah" accessibilityLabel="Ubah waktu catatan" onPress={() => setStep({ mode: 'date' })} />
      {step?.mode === 'date' ? (
        <DateTimePicker
          key="date"
          mode="date"
          value={current}
          maximumDate={new Date()}
          onValueChange={(_e, d) => pickDay(d)}
          onDismiss={() => setStep(null)}
        />
      ) : null}
      {step?.mode === 'time' ? (
        <DateTimePicker
          key="time"
          mode="time"
          is24Hour
          value={new Date(step.day.getFullYear(), step.day.getMonth(), step.day.getDate(), current.getHours(), current.getMinutes())}
          onValueChange={(_e, t) => pickTime(step.day, t)}
          onDismiss={() => setStep(null)}
        />
      ) : null}
    </View>
  );
}

// ---------- Bagian kecil ----------

function TextAction({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        minWidth: 48,
        justifyContent: 'center',
        paddingHorizontal: theme.space(2),
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: theme.color.primary, fontFamily: theme.font.semibold }}>{label}</Text>
    </Pressable>
  );
}

function Section({
  title,
  summary,
  initiallyOpen,
  children,
}: {
  title: string;
  summary: string | null;
  initiallyOpen: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={{ borderTopWidth: 1, borderColor: theme.color.border }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        accessibilityHint={summary ?? undefined}
        onPress={() => setOpen((o) => !o)}
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.space(2),
        }}
      >
        <Text variant="heading">{title}</Text>
        <Text variant="caption" muted>
          {summary ? `${summary}  ` : ''}
          {open ? '▴' : '▾'}
        </Text>
      </Pressable>
      {open ? <View style={{ gap: theme.space(3), paddingBottom: theme.space(4) }}>{children}</View> : null}
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}>{children}</View>;
}

function useInputStyle() {
  const theme = useTheme();
  return {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
    color: theme.color.text,
    backgroundColor: theme.color.surface,
    fontFamily: theme.font.regular,
    fontSize: 16,
  } as const;
}

/** "+ Tambah sendiri": label kosong diabaikan begitu saja. */
function TagAdder({ where, onAdd }: { where: string; onAdd: (label: string) => void }) {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const submit = () => {
    const label = text.trim();
    if (label) onAdd(label);
    setText('');
    setOpen(false);
  };
  if (!open) {
    return <TextAction label="+ Tambah sendiri" accessibilityLabel={`Tambah sendiri di ${where}`} onPress={() => setOpen(true)} />;
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space(2) }}>
      <TextInput
        accessibilityLabel={`Tag baru di ${where}`}
        placeholder="Tulis sendiri"
        placeholderTextColor={theme.color.textMuted}
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        maxLength={40}
        autoFocus
        returnKeyType="done"
        style={[inputStyle, { flex: 1 }]}
      />
      <Button label="Tambah" variant="secondary" onPress={submit} />
    </View>
  );
}

// ---------- Form ----------

const count = (n: number) => (n > 0 ? `${n} dipilih` : null);

/** Detail opsional catatan, dalam bagian yang bisa dilipat. `createdAt` diteruskan apa adanya. */
export function EntryDetailsForm({ value, onChange }: { value: EntryDetails; onChange: (v: EntryDetails) => void }) {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const set = (patch: Partial<EntryDetails>) => onChange({ ...value, ...patch });

  // Konteks: kategori terpilih <=> ada minimal satu ContextTag; {subTag: null} hanya kalau belum ada sub-tag.
  const hasCategory = (cat: ContextCategory) => value.contexts.some((c) => c.category === cat);
  const toggleCategory = (cat: ContextCategory) =>
    set({
      contexts: hasCategory(cat)
        ? value.contexts.filter((c) => c.category !== cat)
        : [...value.contexts, { category: cat, subTag: null }],
    });
  const toggleSubTag = (cat: ContextCategory, subTag: string) => {
    const has = value.contexts.some((c) => c.category === cat && c.subTag === subTag);
    let next: ContextTag[];
    if (has) {
      next = value.contexts.filter((c) => !(c.category === cat && c.subTag === subTag));
      if (!next.some((c) => c.category === cat)) next.push({ category: cat, subTag: null });
    } else {
      next = [...value.contexts.filter((c) => !(c.category === cat && c.subTag === null)), { category: cat, subTag }];
    }
    set({ contexts: next });
  };

  const hasExperience = (tag: string) => value.experiences.some((e) => e.tag === tag);
  const toggleExperience = (dimension: ExperienceDimension, tag: string) =>
    set({
      experiences: hasExperience(tag)
        ? value.experiences.filter((e) => e.tag !== tag)
        : [...value.experiences, { dimension, tag }],
    });

  const hasCoping = (tag: string) => value.copings.some((c) => c.tag === tag);
  const toggleCoping = (tag: string) =>
    set({
      copings: hasCoping(tag)
        ? value.copings.filter((c) => c.tag !== tag)
        : [...value.copings, { tag, helped: 'belum_tahu' }],
    });
  const setHelped = (tag: string, helped: CopingHelped) =>
    set({ copings: value.copings.map((c) => (c.tag === tag ? { ...c, helped } : c)) });

  const categoryCount = new Set(value.contexts.map((c) => c.category)).size;

  return (
    <View>
      <Section title="Konteks" summary={count(categoryCount)} initiallyOpen={categoryCount > 0}>
        <Text muted>Apa yang lagi terjadi? Boleh pilih lebih dari satu.</Text>
        <ChipRow>
          {CONTEXTS.map((c) => (
            <Chip key={c.id} label={c.label} selected={hasCategory(c.id)} onToggle={() => toggleCategory(c.id)} />
          ))}
        </ChipRow>
        {CONTEXTS.filter((c) => hasCategory(c.id)).map((c) => {
          const custom = value.contexts.filter((t) => t.category === c.id && isCustom(t.subTag));
          return (
            <View key={c.id} style={{ gap: theme.space(2) }}>
              <Text variant="caption" muted>
                {c.label}
              </Text>
              <ChipRow>
                {c.subTags.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.label}
                    selected={value.contexts.some((t) => t.category === c.id && t.subTag === s.id)}
                    onToggle={() => toggleSubTag(c.id, s.id)}
                  />
                ))}
                {custom.map((t) => (
                  <Chip key={t.subTag} label={labelForTag(t.subTag!)} selected onToggle={() => toggleSubTag(c.id, t.subTag!)} />
                ))}
              </ChipRow>
              <TagAdder
                where={c.label}
                onAdd={(label) => {
                  const id = `${CUSTOM}${label}`;
                  if (!value.contexts.some((t) => t.category === c.id && t.subTag === id)) toggleSubTag(c.id, id);
                }}
              />
            </View>
          );
        })}
      </Section>

      <Section
        title="Perasaan & badan"
        summary={count(value.experiences.length)}
        initiallyOpen={value.experiences.length > 0}
      >
        {EXPERIENCES.map((d) => {
          const custom = value.experiences.filter((e) => e.dimension === d.dimension && isCustom(e.tag));
          return (
            <View key={d.dimension} style={{ gap: theme.space(2) }}>
              <Text variant="caption" muted>
                {d.label}
              </Text>
              <ChipRow>
                {d.tags.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.label}
                    selected={hasExperience(t.id)}
                    onToggle={() => toggleExperience(d.dimension, t.id)}
                  />
                ))}
                {custom.map((e) => (
                  <Chip key={e.tag} label={labelForTag(e.tag)} selected onToggle={() => toggleExperience(d.dimension, e.tag)} />
                ))}
              </ChipRow>
              <TagAdder
                where={d.label}
                onAdd={(label) => {
                  const id = `${CUSTOM}${label}`;
                  if (!hasExperience(id)) toggleExperience(d.dimension, id);
                }}
              />
            </View>
          );
        })}
      </Section>

      <Section title="Coping" summary={count(value.copings.length)} initiallyOpen={value.copings.length > 0}>
        <Text muted>Apa yang kamu lakukan untuk dirimu?</Text>
        <ChipRow>
          {COPINGS.map((c) => (
            <Chip key={c.id} label={c.label} selected={hasCoping(c.id)} onToggle={() => toggleCoping(c.id)} />
          ))}
          {value.copings
            .filter((c) => isCustom(c.tag))
            .map((c) => (
              <Chip key={c.tag} label={labelForTag(c.tag)} selected onToggle={() => toggleCoping(c.tag)} />
            ))}
        </ChipRow>
        <TagAdder
          where="Coping"
          onAdd={(label) => {
            const id = `${CUSTOM}${label}`;
            if (!hasCoping(id)) toggleCoping(id);
          }}
        />
        {value.copings.map((c) => (
          <View key={c.tag} style={{ gap: theme.space(2) }}>
            <Text>
              <Text style={{ fontFamily: theme.font.semibold }}>{labelForTag(c.tag)}</Text>
              {' · '}
              Apakah ini membantu?
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={`Apakah ${labelForTag(c.tag)} membantu?`}
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space(2) }}
            >
              {HELPED_OPTIONS.map((o) => {
                const checked = c.helped === o.value;
                return (
                  <Pressable
                    key={o.value}
                    accessibilityRole="radio"
                    accessibilityLabel={o.label}
                    accessibilityState={{ checked, selected: checked }}
                    onPress={() => setHelped(c.tag, o.value)}
                    style={{
                      minHeight: 48,
                      minWidth: 48,
                      paddingHorizontal: theme.space(4),
                      justifyContent: 'center',
                      borderRadius: theme.radius.lg,
                      borderWidth: checked ? 2 : 1,
                      borderColor: checked ? theme.color.primary : theme.color.border,
                      backgroundColor: checked ? theme.color.surfaceAlt : theme.color.surface,
                    }}
                  >
                    <Text style={checked ? { fontFamily: theme.font.semibold } : undefined}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </Section>

      <Section title="Tulisan bebas" summary={null} initiallyOpen={!!value.note}>
        <TextInput
          accessibilityLabel="Tulisan bebas, isi catatan"
          placeholder="Tulis apa saja yang ingin kamu ceritakan."
          placeholderTextColor={theme.color.textMuted}
          value={value.note ?? ''}
          onChangeText={(t) => set({ note: t === '' ? null : t })}
          multiline
          textAlignVertical="top"
          style={[inputStyle, { minHeight: 140 }]}
        />
      </Section>
    </View>
  );
}
