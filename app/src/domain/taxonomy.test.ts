import { CONTEXTS, COPINGS, EXPERIENCES, MOOD_LABELS, labelForTag } from './taxonomy';

const allIds = [
  ...CONTEXTS.flatMap((c) => [c.id, ...c.subTags.map((s) => s.id)]),
  ...EXPERIENCES.flatMap((e) => e.tags.map((t) => t.id)),
  ...COPINGS.map((c) => c.id),
];
const allLabels = [
  ...Object.values(MOOD_LABELS),
  ...CONTEXTS.flatMap((c) => [c.label, ...c.subTags.map((s) => s.label)]),
  ...EXPERIENCES.flatMap((e) => [e.label, ...e.tags.map((t) => t.label)]),
  ...COPINGS.map((c) => c.label),
];

describe('taxonomy', () => {
  it('has 6 contexts and 4 experience dimensions', () => {
    expect(CONTEXTS).toHaveLength(6);
    expect(EXPERIENCES).toHaveLength(4);
  });

  it('has unique ids', () => {
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('uses the id formats from the spec', () => {
    for (const c of CONTEXTS) for (const s of c.subTags) expect(s.id.startsWith(`${c.id}.`)).toBe(true);
    for (const e of EXPERIENCES) for (const t of e.tags) expect(t.id.startsWith(`${e.dimension}.`)).toBe(true);
    for (const c of COPINGS) expect(c.id.startsWith('coping.')).toBe(true);
  });

  it('has the mood labels', () => {
    expect(MOOD_LABELS).toEqual({ 1: 'Sangat berat', 2: 'Kurang baik', 3: 'Biasa', 4: 'Baik', 5: 'Sangat baik' });
  });

  it('has the expected counts of tags', () => {
    expect(CONTEXTS.map((c) => c.subTags.length)).toEqual([5, 5, 3, 3, 3, 3]);
    expect(EXPERIENCES.map((e) => e.tags.length)).toEqual([8, 6, 5, 4]);
    expect(COPINGS).toHaveLength(11);
  });

  it('labelForTag resolves taxonomy ids and custom tags', () => {
    expect(labelForTag('akademik.deadline')).toBe('deadline');
    expect(labelForTag('akademik')).toBe('Akademik');
    expect(labelForTag('coping.dengar-musik')).toBe('dengar musik');
    expect(labelForTag('custom:Magang')).toBe('Magang');
  });

  it('has no judgmental words in labels', () => {
    for (const label of allLabels) expect(label).not.toMatch(/buruk|salah|gagal/i);
  });
});
