import type { Pattern, PatternKind, PatternSummary } from './types';

export const NOT_ENOUGH_DATA_TEXT =
  'MOJI masih mengenal polamu. Coba cek lagi setelah beberapa catatan lagi, ya.';

export const FORBIDDEN_WORDS =
  /depresi|gangguan|diagnos|bipolar|skizo|trauma|klinis|penyakit mental|kecemasan|anxiety|psikosis|ptsd|ocd|adhd|patologis|psikiat|mengidap|menderita|gejala|sakit jiwa|kelainan jiwa/i;

export const PRESSURE_WORDS =
  /kamu\s+(harus|perlu|wajib)|seharusnya|sebaiknya|jangan\s+lupa|streak|hari bolong|tidak mencatat|belum mencatat|terlewat/i;

const REJECTED_PREFIX =
  'Sebelumnya kamu merasa pola ini kurang pas. Kalau menurutmu masih begitu, tidak apa-apa. Ini yang MOJI lihat sekarang: ';

const mid = (label: string) => label.toLowerCase();
const start = (label: string) => {
  const l = mid(label);
  return l.charAt(0).toUpperCase() + l.slice(1);
};

const PATTERN_TEMPLATES: Record<PatternKind, (p: Pattern) => string> = {
  low_mood_context: (p) => {
    const l = mid(p.subjectLabel);
    return `Dari ${p.count} catatan yang menyebut ${l}, ${p.hitCount} di antaranya mood-mu sedang rendah. Mungkin ${l} ikut berperan di sini, tapi kamu yang paling tahu. Apakah ini terasa sesuai?`;
  },
  low_mood_experience: (p) =>
    `Di catatan saat mood-mu rendah, ${mid(p.subjectLabel)} beberapa kali muncul (${p.hitCount} kali). Mungkin keduanya berkaitan. Bagaimana menurutmu?`,
  helpful_coping: (p) =>
    `${start(p.subjectLabel)} kamu tandai membantu ${p.hitCount} dari ${p.count} kali. Mungkin ini salah satu hal yang cocok buatmu, walau tidak harus selalu berhasil.`,
};

const KIND_QUESTIONS: [PatternKind, (label: string) => string][] = [
  ['low_mood_context', (l) => `Apa yang biasanya terjadi saat ${mid(l)} terasa berat?`],
  ['low_mood_experience', (l) => `Apa yang biasanya kamu butuhkan saat merasa ${mid(l)}?`],
  ['helpful_coping', (l) => `Kalau kamu mau, ingat-ingat lagi: kapan terakhir ${mid(l)} terasa membantu?`],
];

const GENERAL_QUESTIONS = [
  'Dari minggu ini, momen apa yang paling ingin kamu ingat?',
  'Kalau ada, hal kecil apa yang bisa membuat harimu terasa sedikit lebih ringan?',
];

const MAX_QUESTIONS = 3;

export function localInsightText(summary: PatternSummary): {
  text: string;
  patternTexts: Record<string, string>;
  questions: string[];
} {
  const patternTexts: Record<string, string> = {};
  for (const p of summary.patterns) {
    patternTexts[p.key] =
      (p.previouslyRejected ? REJECTED_PREFIX : '') + PATTERN_TEMPLATES[p.kind](p);
  }

  let text: string;
  if (summary.patterns.length > 0) {
    text = `Ini beberapa hal yang MOJI perhatikan dari ${summary.entryCount} catatanmu.`;
  } else if (summary.enoughData) {
    text = `Dari ${summary.entryCount} catatanmu, belum ada pola yang menonjol, dan itu tidak apa-apa. Catatanmu tetap berarti.`;
  } else {
    text = NOT_ENOUGH_DATA_TEXT;
  }

  const questions: string[] = [];
  for (const [kind, make] of KIND_QUESTIONS) {
    const p = summary.patterns.find((x) => x.kind === kind);
    if (p) questions.push(make(p.subjectLabel));
  }
  for (const q of GENERAL_QUESTIONS) {
    if (questions.length >= 2) break;
    questions.push(q);
  }

  return { text, patternTexts, questions: questions.slice(0, MAX_QUESTIONS) };
}
