import type { Entry, Mood } from './types';
import { checkLocalSafety, isWorsening, maxRisk, normalizeText, WORSENING_RULE } from './safety';
import { CONCERN_PHRASES, URGENT_PHRASES } from './safetyPhrases';

describe('normalizeText', () => {
  it('lowercases, strips punctuation/emoji, collapses repeats and maps slang', () => {
    expect(normalizeText('Pengen  MATIII aja!! 😭')).toBe('ingin mati saja');
    expect(normalizeText('gk kuat lg...')).toBe('tidak kuat lagi');
  });

  it('collapses doubled letters consistently (phrases get the same treatment)', () => {
    expect(normalizeText('kopi pagi dan aamiin')).toBe('kopi pagi dan amin');
  });

  it('maps first-person slang to aku', () => {
    expect(normalizeText('gw gue Aku')).toBe('aku aku aku');
  });

  it('maps ngilang to hilang and buat to untuk', () => {
    expect(normalizeText('pengen ngilang')).toBe('ingin hilang');
    expect(normalizeText('alasan buat hidup')).toBe('alasan untuk hidup');
  });
});

describe('phrase lists', () => {
  it.each([...URGENT_PHRASES, ...CONCERN_PHRASES])('"%s" is stored in normalized form', (p) => {
    expect(normalizeText(p)).toBe(p);
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
    // R5: runs of >= 2 identical letters
    ['pengen matii aja', 'urgent'],
    ['bunuh dirii', 'urgent'],
    ['pengenn mati', 'urgent'],
    // R8: proximity death wishes
    ['mending gue mati', 'urgent'],
    ['lebih baik aku mati', 'urgent'],
    ['pengen cepet mati', 'urgent'],
    ['mau aku mati aja', 'urgent'],
    ['kapan ya aku mati', 'urgent'],
    ['mati lampu lagi', 'none'],
    ['mau mati gaya', 'none'],
    // slang additions
    ['gak ada yg peduli', 'concern'],
    ['gada yang sayang sama aq', 'concern'],
    ['ngga sanggup lagi', 'concern'],
    ['ndak kuat lg', 'concern'],
    ['capek banget idup', 'concern'],
    ['pengen ilang', 'concern'],
    // new urgent phrases
    ['bundir', 'urgent'],
    ['selfharm', 'urgent'],
    ['suisid', 'urgent'],
    ['pengen tidur selamanya', 'urgent'],
    ['dunia lebih baik tanpa gue', 'urgent'],
    ['nyilet lagi', 'urgent'],
    ['sayat nadi', 'urgent'],
    ['mau terjun dari jembatan', 'urgent'],
    ['minum baygon', 'urgent'],
    ['tidak ingin bangun lagi', 'urgent'],
    ['mati saja', 'urgent'],
    // new concern phrases
    ['tidak sanggup lagi', 'concern'],
    ['pengen nyerah', 'concern'],
    ['benci diri sendiri', 'concern'],
    ['males idup', 'concern'],
    ['tidak ada yang butuh gue', 'concern'],
    ['merepotkan semua orang', 'concern'],
    // final review: wishing not to exist / not to live / not to wake up
    ['andai gue ga ada', 'urgent'],
    ['mending aku ga ada', 'urgent'],
    ['kalau aku ga ada pasti lebih baik', 'urgent'],
    ['lebih baik aku tidak pernah lahir', 'urgent'],
    ['pengen tidur dan ga bangun lagi', 'urgent'],
    ['gak ada alasan buat hidup', 'urgent'],
    ['aku mau akhiri semuanya', 'urgent'],
    ['pengen semuanya berakhir', 'urgent'],
    ['pengen pergi selamanya', 'urgent'],
    ['nulis surat perpisahan', 'urgent'],
    ['pengen udahan', 'concern'],
    ['pengen ngilang', 'concern'],
    ['aku ga ada waktu hari ini', 'none'],
    ['libur semester akhirnya berakhir', 'none'],
    // eval-fix: the four failing eval texts
    ['capek bgt hidup gini, mending gue ilang aja selamanya, gk ada yg bakal nyariin juga', 'urgent'],
    ['gk sanggup lg sm semuanya, kadang pengen tidur trs gak bangun lagi', 'urgent'],
    ['rasanya mati rasa, gak sedih gak seneng, kosong aja udah beberapa minggu', 'concern'],
    ['aku wis ra kuat urip, kabeh kok tambah abot', 'urgent'],
    // eval-fix: new urgent phrases
    ['pengen hilang selamanya', 'urgent'],
    ['mending ilang selamanya', 'urgent'],
    ['pengen pergi selamanya dari sini', 'urgent'],
    ['gk ada yg bakal nyariin', 'urgent'],
    ['gak ada yang bakal kehilangan aku', 'urgent'],
    ['aku ora kuat urip', 'urgent'],
    ['aku wis ora kuat', 'urgent'],
    ['wis ora betah urip', 'urgent'],
    ['pengin mati wae', 'urgent'],
    ['abdi hoyong maot', 'urgent'],
    ['abdi teu kuat hirup', 'urgent'],
    ['kalo gue gak ada pasti lebih baik', 'urgent'],
    // eval-fix: new concern phrases
    ['hampa banget akhir-akhir ini', 'concern'],
    ['aku gak merasakan apa apa', 'concern'],
    ['rasanya kosong terus', 'concern'],
    ['mati rasa', 'concern'],
    // eval-fix: everyday texts stay none
    ['kosong jadwal hari ini', 'none'],
    ['kantong kosong tanggal tua', 'none'],
    ['rasanya enak banget', 'none'],
    // accepted false positive: documented in docs/safety-phrases.md
    ['hp mati rasa baterainya', 'concern'],
    // accepted false positives (conservative, see docs/safety-phrases.md)
    ['mau mati lampu', 'urgent'],
    ['aku tidak mau mati', 'urgent'],
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
  it('true: 5 mood-1 entries in last 5 days plus 2 older entries', () => {
    const r = [entry(1, 2), entry(1, 24), entry(1, 48), entry(1, 72), entry(1, 96), entry(3, 9 * 24), entry(3, 10 * 24)];
    expect(isWorsening(r, NOW, null)).toBe(true);
  });
  it('false: entries older than 7 days do not count', () => {
    const r = [entry(1, 2), entry(1, 24), entry(1, 48), entry(1, 72), entry(1, 8 * 24), entry(1, 9 * 24)];
    expect(isWorsening(r, NOW, null)).toBe(false);
  });
  it('treats an unparseable lastPromptAt as no previous prompt', () => {
    expect(isWorsening(sixDays(), NOW, 'bukan-tanggal')).toBe(true);
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
