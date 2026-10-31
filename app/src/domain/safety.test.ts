import type { Entry, Mood } from './types';
import { checkLocalSafety, isWorsening, maxRisk, normalizeText, WORSENING_RULE } from './safety';

describe('normalizeText', () => {
  it('lowercases, strips punctuation/emoji, collapses repeats and maps slang', () => {
    expect(normalizeText('Pengen  MATIII aja!! 😭')).toBe('ingin mati saja');
    expect(normalizeText('gk kuat lg...')).toBe('tidak kuat lagi');
  });

  it('keeps doubled letters in normal words', () => {
    expect(normalizeText('kopi pagi dan aamiin')).toBe('kopi pagi dan aamiin');
  });

  it('maps first-person slang to aku', () => {
    expect(normalizeText('gw gue Aku')).toBe('aku aku aku');
  });
});

describe('checkLocalSafety', () => {
  it.each([
    ['pengen matiii aja', 'urgent'],
    ['Mau  mati  rasanya 😭', 'urgent'],
    ['BUNUH DIRI', 'urgent'],
    ['aku pgn bunuh-diri', 'urgent'],
    ['pengen nyakitin diri', 'urgent'],
    ['gw udh gak mau hidup lagi', 'urgent'],
    ['gk kuat lg...', 'concern'],
    ['aku tdk berguna', 'concern'],
    ['hancur bgt rasanya', 'concern'],
    ['lampu kos mati lagi', 'none'],
    ['mati lampu seharian', 'none'],
    ['deadline bikin capek', 'none'],
    ['kuat banget hari ini', 'none'],
    ['', 'none'],
  ])('%s -> %s', (text, expected) => {
    expect(checkLocalSafety(text)).toBe(expected);
  });

  it('returns none for null', () => {
    expect(checkLocalSafety(null)).toBe('none');
  });

  it('returns urgent when urgent and concern phrases are mixed', () => {
    expect(checkLocalSafety('putus asa, pengen mati aja')).toBe('urgent');
  });

  it('matches whole words only', () => {
    expect(checkLocalSafety('kematian kucingku bikin sedih')).toBe('none');
  });
});

describe('maxRisk', () => {
  it('returns the higher level', () => {
    expect(maxRisk('none', 'concern')).toBe('concern');
    expect(maxRisk('urgent', 'concern')).toBe('urgent');
    expect(maxRisk('none', 'none')).toBe('none');
  });
});

const NOW = new Date('2026-11-10T12:00:00+07:00');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();
const entry = (mood: Mood, ageHours: number): Entry => ({
  id: `e${ageHours}-${mood}`,
  createdAt: hoursAgo(ageHours),
  updatedAt: hoursAgo(ageHours),
  mood,
  note: null,
  contexts: [],
  experiences: [],
  copings: [],
  aiSuggested: [],
  pendingSuggestions: null,
  safetyShownLevel: 'none',
});
const sixDays = (): Entry[] => [
  entry(1, 2),
  entry(1, 24),
  entry(1, 48),
  entry(2, 72),
  entry(1, 96),
  entry(1, 120),
  entry(3, 144),
];

describe('isWorsening', () => {
  it('exposes the rule constants', () => {
    expect(WORSENING_RULE).toEqual({ window: 7, minLowest: 5, withinDays: 7, cooldownHours: 72 });
  });
  it('true: 5 of last 7 are mood 1 within 6 days', () => {
    expect(isWorsening(sixDays(), NOW, null)).toBe(true);
  });
  it('false: 7th entry is 8 days old', () => {
    const r = sixDays();
    r[6] = entry(3, 8 * 24);
    expect(isWorsening(r, NOW, null)).toBe(false);
  });
  it('false: only 4 are mood 1', () => {
    const r = sixDays();
    r[0] = entry(2, 2);
    expect(isWorsening(r, NOW, null)).toBe(false);
  });
  it('false: prompted 10 hours ago', () => {
    expect(isWorsening(sixDays(), NOW, hoursAgo(10))).toBe(false);
  });
  it('true: prompted 80 hours ago', () => {
    expect(isWorsening(sixDays(), NOW, hoursAgo(80))).toBe(true);
  });
  it('false: fewer than 5 entries', () => {
    expect(isWorsening([entry(1, 1), entry(1, 2), entry(1, 3), entry(1, 4)], NOW, null)).toBe(false);
  });
  it('false: empty', () => {
    expect(isWorsening([], NOW, null)).toBe(false);
  });
  it('only looks at the 7 latest entries', () => {
    const r = [
      entry(3, 1), entry(3, 2), entry(1, 3), entry(1, 4), entry(1, 5),
      entry(1, 6), entry(3, 7), entry(1, 8), entry(1, 9),
    ];
    expect(isWorsening(r, NOW, null)).toBe(false);
  });
});
