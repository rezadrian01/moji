import { describe, expect, it } from 'vitest';
import { CLINICAL_TERMS, filterSuggestions, insightPassesGuardrails } from './guardrails.js';
import type { AnalyzeEntryRequest, WriteInsightResponse } from '../contract.js';

const req: AnalyzeEntryRequest = {
  text: 't',
  mood: 3,
  options: {
    contexts: [{ id: 'akademik', label: 'Akademik' }],
    experiences: [{ id: 'exp.panik', label: 'Panik' }, { id: 'exp.lelah', label: 'Lelah' }],
    copings: [{ id: 'cop.napas', label: 'Napas' }],
  },
};

describe('filterSuggestions', () => {
  it('drops ids that were not offered and removes duplicates', () => {
    const out = filterSuggestions(
      {
        contexts: ['akademik', 'akademik', 'akademik.palsu', 'finansial'] as any,
        experiences: ['exp.panik', 'exp.panik', 'exp.ngarang', 'exp.lelah'],
        copings: ['cop.napas', 'cop.lain'],
      },
      req,
    );
    expect(out).toEqual({
      contexts: ['akademik'],
      experiences: ['exp.panik', 'exp.lelah'],
      copings: ['cop.napas'],
    });
  });

  it('does not accept an experience id in the coping list', () => {
    const out = filterSuggestions({ contexts: [], experiences: [], copings: ['exp.panik'] }, req);
    expect(out.copings).toEqual([]);
  });
});

describe('CLINICAL_TERMS', () => {
  it.each(['Depresi', 'gangguan kecemasan', 'bipolar', 'diagnosis', 'PTSD', 'skizofrenia'])('matches %s', (w) => {
    expect(CLINICAL_TERMS.test(w)).toBe(true);
  });
  it('does not match everyday words', () => {
    expect(CLINICAL_TERMS.test('kamu sedang sedih dan lelah')).toBe(false);
  });
  it('is stateless across repeated calls', () => {
    expect(CLINICAL_TERMS.test('depresi')).toBe(true);
    expect(CLINICAL_TERMS.test('depresi')).toBe(true);
  });
});

const good: WriteInsightResponse = {
  text: 'Sepertinya tugas kuliah sering muncul bersama hari-hari yang berat.',
  patternTexts: { p1: 'Sepertinya akademik sering muncul ketika moodmu rendah.' },
  questions: ['Menurutmu, apa yang paling membebani pekan ini?'],
};

describe('substring clinical + pressure rules (fix round 1)', () => {
  it.each([
    'kamu mengalami kecemasan',
    'depresinya terlihat',
    'mungkin diagnosa',
    'terasa traumatis',
    'kamu perlu istirahat',
    'sebaiknya tidur lebih awal',
    'ada hari bolong',
    'kamu wajib cerita',
    'ini gejala',
    'dia menderita',
    'jangan lupa mencatat',
    'belum mencatat sejak Senin',
    'beberapa hari terlewat',
    'streak kamu',
  ])('rejects %s in any field', (bad) => {
    expect(insightPassesGuardrails({ ...good, text: bad }, ['p1'])).toBe(false);
    expect(insightPassesGuardrails({ ...good, patternTexts: { p1: bad } }, ['p1'])).toBe(false);
    expect(insightPassesGuardrails({ ...good, questions: [bad] }, ['p1'])).toBe(false);
  });

  it('accepts a clean warm insight', () => {
    expect(
      insightPassesGuardrails(
        {
          text: 'Sepertinya pekan ini terasa cukup berat buatmu. Bisa jadi ada beberapa hal yang menumpuk.',
          patternTexts: { p1: 'Kamu pernah bilang pola ini kurang pas, jadi anggap ini dugaan saja.' },
          questions: ['Hal kecil apa yang terasa sedikit meringankan akhir-akhir ini?'],
        },
        ['p1'],
      ),
    ).toBe(true);
  });
});

describe('insightPassesGuardrails', () => {
  it('accepts clean output', () => {
    expect(insightPassesGuardrails(good, ['p1'])).toBe(true);
  });
  it('rejects extra pattern key', () => {
    expect(insightPassesGuardrails({ ...good, patternTexts: { ...good.patternTexts, p2: 'x' } }, ['p1'])).toBe(false);
  });
  it('rejects missing pattern key', () => {
    expect(insightPassesGuardrails(good, ['p1', 'p2'])).toBe(false);
  });
  it('rejects clinical term in text, pattern text or question', () => {
    expect(insightPassesGuardrails({ ...good, text: 'Kamu mungkin depresi.' }, ['p1'])).toBe(false);
    expect(insightPassesGuardrails({ ...good, patternTexts: { p1: 'Ini gejala depresi' } }, ['p1'])).toBe(false);
    expect(insightPassesGuardrails({ ...good, questions: ['Apakah ada diagnosis?'] }, ['p1'])).toBe(false);
  });
  it('rejects 0 and 4 questions', () => {
    expect(insightPassesGuardrails({ ...good, questions: [] }, ['p1'])).toBe(false);
    expect(insightPassesGuardrails({ ...good, questions: ['a', 'b', 'c', 'd'] }, ['p1'])).toBe(false);
  });
  it('rejects "kamu harus" in any casing, in any field', () => {
    expect(insightPassesGuardrails({ ...good, text: 'Kamu  Harus istirahat.' }, ['p1'])).toBe(false);
    expect(insightPassesGuardrails({ ...good, questions: ['kamu harus apa?'] }, ['p1'])).toBe(false);
  });
  it('rejects empty or whitespace text', () => {
    expect(insightPassesGuardrails({ ...good, text: '' }, ['p1'])).toBe(false);
    expect(insightPassesGuardrails({ ...good, text: '  \n ' }, ['p1'])).toBe(false);
  });
  it('rejects empty or whitespace questions and pattern texts', () => {
    expect(insightPassesGuardrails({ ...good, questions: ['  '] }, ['p1'])).toBe(false);
    expect(insightPassesGuardrails({ ...good, patternTexts: { p1: ' ' } }, ['p1'])).toBe(false);
  });
});
