import {
  FORBIDDEN_WORDS,
  NOT_ENOUGH_DATA_TEXT,
  PRESSURE_WORDS,
  localInsightText,
} from './insightText';
import type { Pattern, PatternSummary } from './types';

const ctx: Pattern = {
  key: 'low_mood_context:akademik',
  kind: 'low_mood_context',
  subject: 'akademik',
  subjectLabel: 'Akademik',
  count: 6,
  hitCount: 4,
  rate: 4 / 6,
  baselineRate: 0.3,
  previouslyRejected: false,
};
const exp: Pattern = {
  key: 'low_mood_experience:lelah',
  kind: 'low_mood_experience',
  subject: 'lelah',
  subjectLabel: 'lelah',
  count: 5,
  hitCount: 3,
  rate: 0.6,
  baselineRate: 0.3,
  previouslyRejected: false,
};
const coping: Pattern = {
  key: 'helpful_coping:jalan',
  kind: 'helpful_coping',
  subject: 'jalan',
  subjectLabel: 'Jalan kaki',
  count: 5,
  hitCount: 4,
  rate: 0.8,
  baselineRate: 0,
  previouslyRejected: false,
};

function summary(patterns: Pattern[], enoughData = true): PatternSummary {
  return {
    periodStart: '2026-10-05',
    periodEnd: '2026-10-11',
    entryCount: 9,
    moodDistribution: { 1: 1, 2: 3, 3: 2, 4: 2, 5: 1 },
    patterns,
    enoughData,
  };
}

describe('localInsightText', () => {
  it('writes the verbatim template with correct numbers for each pattern kind', () => {
    const r = localInsightText(summary([ctx, exp, coping]));
    expect(r.text).toBe('Ini beberapa hal yang MOJI perhatikan dari 9 catatanmu.');
    expect(r.patternTexts[ctx.key]).toBe(
      'Dari 6 catatan yang menyebut akademik, 4 di antaranya mood-mu sedang rendah. Mungkin akademik ikut berperan di sini, tapi kamu yang paling tahu. Apakah ini terasa sesuai?',
    );
    expect(r.patternTexts[exp.key]).toBe(
      'Di catatan saat mood-mu rendah, lelah beberapa kali muncul (3 kali). Mungkin keduanya berkaitan. Bagaimana menurutmu?',
    );
    expect(r.patternTexts[coping.key]).toBe(
      'Jalan kaki kamu tandai membantu 4 dari 5 kali. Mungkin ini salah satu hal yang cocok buatmu, walau tidak harus selalu berhasil.',
    );
  });

  it('prefixes previously rejected patterns', () => {
    const r = localInsightText(summary([{ ...ctx, previouslyRejected: true }]));
    expect(
      r.patternTexts[ctx.key].startsWith(
        'Sebelumnya kamu merasa pola ini kurang pas. Kalau menurutmu masih begitu, tidak apa-apa. Ini yang MOJI lihat sekarang: Dari 6',
      ),
    ).toBe(true);
  });

  it('returns 1-3 unique questions in kind order, then general', () => {
    const r = localInsightText(summary([coping, ctx, exp]));
    expect(r.questions).toEqual([
      'Apa yang biasanya terjadi saat akademik terasa berat?',
      'Apa yang biasanya kamu butuhkan saat merasa lelah?',
      'Kalau kamu mau, ingat-ingat lagi: kapan terakhir jalan kaki terasa membantu?',
    ]);
    const one = localInsightText(summary([coping]));
    expect(one.questions).toEqual([
      'Kalau kamu mau, ingat-ingat lagi: kapan terakhir jalan kaki terasa membantu?',
      'Dari minggu ini, momen apa yang paling ingin kamu ingat?',
    ]);
    for (const q of [r.questions, one.questions]) expect(new Set(q).size).toBe(q.length);
  });

  it('handles enough data but no patterns', () => {
    const r = localInsightText(summary([]));
    expect(r.text).toBe('Dari 9 catatanmu, belum ada pola yang menonjol, dan itu tidak apa-apa. Catatanmu tetap berarti.');
    expect(r.patternTexts).toEqual({});
    expect(r.questions).toEqual([
      'Dari minggu ini, momen apa yang paling ingin kamu ingat?',
      'Kalau ada, hal kecil apa yang bisa membuat harimu terasa sedikit lebih ringan?',
    ]);
  });

  it('uses the not-enough-data text when data is insufficient', () => {
    expect(NOT_ENOUGH_DATA_TEXT).toBe(
      'MOJI masih mengenal polamu. Coba cek lagi setelah beberapa catatan lagi, ya.',
    );
    const r = localInsightText(summary([], false));
    expect(r.text).toBe(NOT_ENOUGH_DATA_TEXT);
    expect(r.questions.length).toBeGreaterThanOrEqual(1);
  });

  it('never emits forbidden or directive wording', () => {
    const outputs = [
      localInsightText(summary([ctx, exp, coping])),
      localInsightText(summary([{ ...ctx, previouslyRejected: true }])),
      localInsightText(summary([])),
      localInsightText(summary([], false)),
    ];
    for (const o of outputs) {
      const all = [o.text, ...Object.values(o.patternTexts), ...o.questions].join(' ');
      expect(all).not.toMatch(FORBIDDEN_WORDS);
      expect(all).not.toMatch(PRESSURE_WORDS);
      expect(all.toLowerCase()).not.toContain('kamu harus');
    }
    expect(NOT_ENOUGH_DATA_TEXT).not.toMatch(FORBIDDEN_WORDS);
  });

  it('FORBIDDEN_WORDS matches clinical terms', () => {
    expect('kamu mengalami depresi').toMatch(FORBIDDEN_WORDS);
    expect('Gangguan tidur').toMatch(FORBIDDEN_WORDS);
    expect('kamu mengalami kecemasan').toMatch(FORBIDDEN_WORDS);
  });

  it('FORBIDDEN_WORDS covers the extended clinical list as substrings', () => {
    for (const w of ['trauma', 'klinis', 'ADHD', 'mengidap', 'gejala', 'sakit jiwa', 'psikiater']) {
      expect(w).toMatch(FORBIDDEN_WORDS);
    }
  });

  it('PRESSURE_WORDS matches pressuring phrases', () => {
    for (const w of ['kamu harus', 'Kamu perlu', 'seharusnya', 'sebaiknya', 'jangan lupa', 'streak', 'hari bolong', 'belum mencatat', 'terlewat']) {
      expect(w).toMatch(PRESSURE_WORDS);
    }
    expect('Mungkin ini cocok buatmu').not.toMatch(PRESSURE_WORDS);
  });
});
