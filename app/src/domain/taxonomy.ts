import type { ContextCategory, ExperienceDimension, Mood } from './types';

export const MOOD_LABELS: Record<Mood, string> = {
  1: 'Sangat berat',
  2: 'Kurang baik',
  3: 'Biasa',
  4: 'Baik',
  5: 'Sangat baik',
};

export const CONTEXTS: {
  id: ContextCategory;
  label: string;
  subTags: { id: string; label: string }[];
}[] = [
  {
    id: 'akademik',
    label: 'Akademik',
    subTags: [
      { id: 'akademik.deadline', label: 'deadline' },
      { id: 'akademik.tugas', label: 'tugas' },
      { id: 'akademik.ujian', label: 'ujian' },
      { id: 'akademik.presentasi', label: 'presentasi' },
      { id: 'akademik.nilai', label: 'nilai' },
    ],
  },
  {
    id: 'interpersonal',
    label: 'Hubungan dengan orang lain',
    subTags: [
      { id: 'interpersonal.konflik', label: 'konflik' },
      { id: 'interpersonal.pertemanan', label: 'pertemanan' },
      { id: 'interpersonal.keluarga', label: 'keluarga' },
      { id: 'interpersonal.pasangan', label: 'pasangan' },
      { id: 'interpersonal.merasa-sendirian', label: 'merasa sendirian' },
    ],
  },
  {
    id: 'internal',
    label: 'Diri sendiri',
    subTags: [
      { id: 'internal.overthinking', label: 'overthinking' },
      { id: 'internal.ekspektasi-diri', label: 'ekspektasi diri' },
      { id: 'internal.membandingkan-diri', label: 'membandingkan diri' },
    ],
  },
  {
    id: 'finansial',
    label: 'Keuangan',
    subTags: [
      { id: 'finansial.kebutuhan-sehari-hari', label: 'kebutuhan sehari-hari' },
      { id: 'finansial.biaya-kuliah-kos', label: 'biaya kuliah/kos' },
      { id: 'finansial.kondisi-ekonomi-keluarga', label: 'kondisi ekonomi keluarga' },
    ],
  },
  {
    id: 'media',
    label: 'Media & hiburan',
    subTags: [
      { id: 'media.media-sosial', label: 'media sosial' },
      { id: 'media.berita', label: 'berita' },
      { id: 'media.kebanyakan-layar', label: 'kebanyakan layar' },
    ],
  },
  {
    id: 'tak_terduga',
    label: 'Kejadian tak terduga',
    subTags: [
      { id: 'tak_terduga.rencana-berubah', label: 'rencana berubah' },
      { id: 'tak_terduga.kabar-mendadak', label: 'kabar mendadak' },
      { id: 'tak_terduga.sakit', label: 'sakit' },
    ],
  },
];

export const EXPERIENCES: {
  dimension: ExperienceDimension;
  label: string;
  tags: { id: string; label: string }[];
}[] = [
  {
    dimension: 'emosi',
    label: 'Perasaan',
    tags: [
      { id: 'emosi.sedih', label: 'sedih' },
      { id: 'emosi.cemas', label: 'cemas' },
      { id: 'emosi.marah', label: 'marah' },
      { id: 'emosi.kecewa', label: 'kecewa' },
      { id: 'emosi.kesepian', label: 'kesepian' },
      { id: 'emosi.lega', label: 'lega' },
      { id: 'emosi.tenang', label: 'tenang' },
      { id: 'emosi.senang', label: 'senang' },
    ],
  },
  {
    dimension: 'fisik',
    label: 'Badan',
    tags: [
      { id: 'fisik.lelah', label: 'lelah' },
      { id: 'fisik.sulit-tidur', label: 'sulit tidur' },
      { id: 'fisik.pusing', label: 'pusing' },
      { id: 'fisik.tegang', label: 'tegang' },
      { id: 'fisik.tidak-nafsu-makan', label: 'tidak nafsu makan' },
      { id: 'fisik.berenergi', label: 'berenergi' },
    ],
  },
  {
    dimension: 'pikiran',
    label: 'Pikiran',
    tags: [
      { id: 'pikiran.overthinking', label: 'overthinking' },
      { id: 'pikiran.sulit-fokus', label: 'sulit fokus' },
      { id: 'pikiran.pikiran-negatif', label: 'pikiran negatif' },
      { id: 'pikiran.bingung', label: 'bingung' },
      { id: 'pikiran.jernih', label: 'jernih' },
    ],
  },
  {
    dimension: 'self_esteem',
    label: 'Cara memandang diri',
    tags: [
      { id: 'self_esteem.merasa-kurang', label: 'merasa kurang' },
      { id: 'self_esteem.ragu-sama-diri', label: 'ragu sama diri' },
      { id: 'self_esteem.bangga-sama-diri', label: 'bangga sama diri' },
      { id: 'self_esteem.percaya-diri', label: 'percaya diri' },
    ],
  },
];

export const COPINGS: { id: string; label: string }[] = [
  { id: 'coping.dengar-musik', label: 'dengar musik' },
  { id: 'coping.cerita-ke-teman', label: 'cerita ke teman' },
  { id: 'coping.istirahat-tidur', label: 'istirahat/tidur' },
  { id: 'coping.jalan-jalan', label: 'jalan-jalan' },
  { id: 'coping.olahraga', label: 'olahraga' },
  { id: 'coping.menulis', label: 'menulis' },
  { id: 'coping.ibadah-berdoa', label: 'ibadah/berdoa' },
  { id: 'coping.nonton-main-game', label: 'nonton/main game' },
  { id: 'coping.makan-enak', label: 'makan enak' },
  { id: 'coping.menyendiri-dulu', label: 'menyendiri dulu' },
  { id: 'coping.scroll-media-sosial', label: 'scroll media sosial' },
];

const CUSTOM_PREFIX = 'custom:';

const LABELS = new Map<string, string>([
  ...CONTEXTS.flatMap((c) => [[c.id, c.label], ...c.subTags.map((s) => [s.id, s.label])] as [string, string][]),
  ...EXPERIENCES.flatMap((e) => e.tags.map((t) => [t.id, t.label] as [string, string])),
  ...COPINGS.map((c) => [c.id, c.label] as [string, string]),
]);

/** id taksonomi -> label; "custom:xyz" -> "xyz"; id tak dikenal dikembalikan apa adanya. */
export function labelForTag(id: string): string {
  if (id.startsWith(CUSTOM_PREFIX)) return id.slice(CUSTOM_PREFIX.length);
  return LABELS.get(id) ?? id;
}
