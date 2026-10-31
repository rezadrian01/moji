import type { Pattern, PatternKind, PatternSummary } from './types';

export const NOT_ENOUGH_DATA_TEXT =
  'MOJI masih mengenal polamu. Coba cek lagi setelah beberapa catatan lagi, ya.';

export const FORBIDDEN_WORDS =
  /depresi|gangguan|diagnos|bipolar|anxiety disorder|skizo|penyakit mental|kamu mengalami kecemasan/i;

const REJECTED_PREFIX =
  'Kamu pernah bilang pola ini kurang sesuai, tapi catatanmu masih menunjukkannya. ';

const PATTERN_TEMPLATES: Record<PatternKind, (p: Pattern) => string> = {
  low_mood_context: (p) =>
    `Dari ${p.count} catatan yang menyebut ${p.subjectLabel}, ${p.hitCount} di antaranya mood-mu sedang rendah. Sepertinya ${p.subjectLabel} cukup berpengaruh ke perasaanmu, apakah ini sesuai dengan yang kamu alami?`,
  low_mood_experience: (p) =>
    `Saat mood-mu rendah, kamu cukup sering mencatat ${p.subjectLabel} (${p.hitCount} kali). Mungkin keduanya saling berkaitan, bagaimana menurutmu?`,
  helpful_coping: (p) =>
    `${p.subjectLabel} kamu tandai membantu ${p.hitCount} dari ${p.count} kali. Sepertinya ini salah satu hal yang cocok buatmu.`,
};

const KIND_QUESTIONS: [PatternKind, (label: string) => string][] = [
  ['low_mood_context', (l) => `Apa yang biasanya terjadi saat ${l} terasa berat?`],
  ['low_mood_experience', (l) => `Apa yang biasanya kamu butuhkan saat merasa ${l}?`],
  ['helpful_coping', (l) => `Kapan terakhir kali ${l} membantumu?`],
];

const GENERAL_QUESTIONS = [
  'Dari minggu ini, momen apa yang paling ingin kamu ingat?',
  'Apa satu hal kecil yang bisa membuat besok sedikit lebih ringan?',
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
    text = `Dari ${summary.entryCount} catatanmu, belum ada pola yang menonjol. Itu juga wajar, kok.`;
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
