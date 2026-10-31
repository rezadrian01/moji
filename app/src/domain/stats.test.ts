/**
 * @jest-environment ./src/domain/jakartaEnvironment.js
 */
import { computeStats, describeStats, rangeStart } from './stats';
import type { CopingHelped, Entry, Mood } from './types';

const NOW = new Date('2026-11-10T12:00:00+07:00');

function entry(over: Partial<Entry> & { mood: Mood; createdAt: string }): Entry {
  return {
    id: over.createdAt,
    updatedAt: over.createdAt,
    note: null,
    contexts: [],
    experiences: [],
    copings: [],
    aiSuggested: [],
    pendingSuggestions: null,
    safetyShownLevel: 'none',
    ...over,
  };
}
const ctx = (category: 'akademik' | 'media' | 'finansial') => ({ category, subTag: null });
const cop = (tag: string, helped: CopingHelped) => ({ tag, helped });

describe('rangeStart', () => {
  it('all -> null', () => expect(rangeStart('all', NOW)).toBeNull());
  it('7d -> local midnight 6 days before today', () => {
    expect(rangeStart('7d', NOW)!.getTime()).toBe(new Date('2026-11-04T00:00:00+07:00').getTime());
  });
  it('30d -> local midnight 29 days before today', () => {
    expect(rangeStart('30d', NOW)!.getTime()).toBe(new Date('2026-10-12T00:00:00+07:00').getTime());
  });
});

describe('computeStats', () => {
  it('handles empty data', () => {
    const s = computeStats([], 'all', NOW);
    expect(s.entryCount).toBe(0);
    expect(s.dailyAverages).toEqual([]);
    expect(s.moodDistribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    expect(s.contextFrequency).toEqual([]);
  });

  it('averages per local date; two entries same day -> count 2; ascending', () => {
    const s = computeStats(
      [
        entry({ mood: 4, createdAt: '2026-11-09T08:00:00+07:00' }),
        entry({ mood: 2, createdAt: '2026-11-08T23:30:00+07:00' }),
        entry({ mood: 2, createdAt: '2026-11-09T00:30:00+07:00' }),
      ],
      'all',
      NOW,
    );
    expect(s.dailyAverages).toEqual([
      { date: '2026-11-08', average: 2, count: 1 },
      { date: '2026-11-09', average: 3, count: 2 },
    ]);
  });

  it('7d excludes the entry on the 8th day, includes the 7th', () => {
    const entries = [
      entry({ mood: 3, createdAt: '2026-11-03T23:59:00+07:00' }),
      entry({ mood: 3, createdAt: '2026-11-04T00:00:00+07:00' }),
    ];
    expect(computeStats(entries, '7d', NOW).entryCount).toBe(1);
    expect(computeStats(entries, 'all', NOW).entryCount).toBe(2);
  });

  it('counts mood distribution', () => {
    const s = computeStats(
      [
        entry({ mood: 2, createdAt: '2026-11-09T08:00:00+07:00' }),
        entry({ mood: 2, createdAt: '2026-11-08T08:00:00+07:00' }),
        entry({ mood: 5, createdAt: '2026-11-07T08:00:00+07:00' }),
      ],
      'all',
      NOW,
    );
    expect(s.moodDistribution).toEqual({ 1: 0, 2: 2, 3: 0, 4: 0, 5: 1 });
  });

  it('orders contextFrequency descending, omits zero, and moodByContext only for present contexts', () => {
    const s = computeStats(
      [
        entry({ mood: 2, createdAt: '2026-11-09T08:00:00+07:00', contexts: [ctx('media')] }),
        entry({ mood: 4, createdAt: '2026-11-08T08:00:00+07:00', contexts: [ctx('akademik'), ctx('media')] }),
        entry({ mood: 5, createdAt: '2026-11-07T08:00:00+07:00', contexts: [ctx('media')] }),
      ],
      'all',
      NOW,
    );
    expect(s.contextFrequency).toEqual([
      { category: 'media', label: 'Media & hiburan', count: 3 },
      { category: 'akademik', label: 'Akademik', count: 1 },
    ]);
    expect(s.moodByContext.map((m) => m.category).sort()).toEqual(['akademik', 'media']);
    const media = s.moodByContext.find((m) => m.category === 'media')!;
    expect(media.count).toBe(3);
    expect(media.average).toBeCloseTo(11 / 3);
  });

  it('counts a context once per entry even if repeated via subtags', () => {
    const s = computeStats(
      [
        entry({
          mood: 3,
          createdAt: '2026-11-09T08:00:00+07:00',
          contexts: [
            { category: 'akademik', subTag: 'akademik.ujian' },
            { category: 'akademik', subTag: 'akademik.tugas' },
          ],
        }),
      ],
      'all',
      NOW,
    );
    expect(s.contextFrequency).toEqual([{ category: 'akademik', label: 'Akademik', count: 1 }]);
  });

  it('helpfulCopings ignores belum_tahu, sorted by helped/rated', () => {
    const s = computeStats(
      [
        entry({
          mood: 3,
          createdAt: '2026-11-09T08:00:00+07:00',
          copings: [cop('coping.menulis', 'ya'), cop('coping.olahraga', 'tidak'), cop('coping.dengar-musik', 'belum_tahu')],
        }),
        entry({
          mood: 3,
          createdAt: '2026-11-08T08:00:00+07:00',
          copings: [cop('coping.menulis', 'belum_tahu'), cop('coping.olahraga', 'ya'), cop('coping.makan-enak', 'ya')],
        }),
      ],
      'all',
      NOW,
    );
    expect(s.helpfulCopings).toEqual([
      { tag: 'coping.makan-enak', label: 'makan enak', helped: 1, rated: 1 },
      { tag: 'coping.menulis', label: 'menulis', helped: 1, rated: 1 },
      { tag: 'coping.olahraga', label: 'olahraga', helped: 1, rated: 2 },
    ]);
  });

  it("counts 'sedikit' as helpful and rated; 'tidak' only as rated", () => {
    const s = computeStats(
      [
        entry({ mood: 3, createdAt: '2026-11-09T08:00:00+07:00', copings: [cop('coping.menulis', 'sedikit')] }),
        entry({ mood: 3, createdAt: '2026-11-08T08:00:00+07:00', copings: [cop('coping.menulis', 'ya')] }),
        entry({ mood: 3, createdAt: '2026-11-07T08:00:00+07:00', copings: [cop('coping.menulis', 'tidak')] }),
      ],
      'all',
      NOW,
    );
    expect(s.helpfulCopings).toEqual([{ tag: 'coping.menulis', label: 'menulis', helped: 2, rated: 3 }]);
    expect(describeStats(s)).toContain('Kamu menandai menulis membantu 2 dari 3 kali.');
  });

  it('excludes entries dated after now', () => {
    const s = computeStats(
      [
        entry({ mood: 3, createdAt: '2026-11-09T08:00:00+07:00' }),
        entry({ mood: 3, createdAt: '2026-11-11T08:00:00+07:00' }),
      ],
      'all',
      NOW,
    );
    expect(s.entryCount).toBe(1);
  });

  it('frequentExperiences returns at most 3 per dimension, by count', () => {
    const tags = ['emosi.sedih', 'emosi.cemas', 'emosi.marah', 'emosi.lega'];
    const entries = tags.flatMap((t, i) =>
      Array.from({ length: 4 - i }, (_, j) =>
        entry({
          mood: 3,
          createdAt: `2026-11-0${i + 1}T0${j + 1}:00:00+07:00`,
          experiences: [{ dimension: 'emosi' as const, tag: t }],
        }),
      ),
    );
    const s = computeStats(entries, 'all', NOW);
    expect(s.frequentExperiences.emosi).toEqual([
      { tag: 'emosi.sedih', label: 'sedih', count: 4 },
      { tag: 'emosi.cemas', label: 'cemas', count: 3 },
      { tag: 'emosi.marah', label: 'marah', count: 2 },
    ]);
    expect(s.frequentExperiences.fisik).toEqual([]);
  });
});

describe('describeStats', () => {
  it('returns [] for empty data', () => {
    expect(describeStats(computeStats([], 'all', NOW))).toEqual([]);
  });

  it('uses neutral copy', () => {
    const s = computeStats(
      [
        entry({ mood: 2, createdAt: '2026-11-09T08:00:00+07:00', contexts: [ctx('akademik')] }),
        entry({ mood: 2, createdAt: '2026-11-08T08:00:00+07:00', contexts: [ctx('akademik')] }),
        entry({
          mood: 2,
          createdAt: '2026-11-07T08:00:00+07:00',
          contexts: [ctx('akademik')],
          copings: [cop('coping.menulis', 'ya')],
        }),
      ],
      'all',
      NOW,
    );
    const lines = describeStats(s);
    expect(lines).toContain('Ada 3 catatan dengan mood Kurang baik.');
    expect(lines).toContain('Konteks yang paling sering kamu catat: Akademik (3 kali).');
    for (const l of lines) expect(l).not.toMatch(/memburuk|membaik|skor|%/);
  });
});
