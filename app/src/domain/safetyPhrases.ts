// Daftar frasa safety check lokal. Dokumentasi: docs/safety-phrases.md.
// Frasa ditulis dalam bentuk ternormalisasi (lihat normalizeText di safety.ts):
// huruf kecil, tanpa tanda baca, slang sudah dibakukan ("mau" TIDAK dipetakan).

/** Peta slang per kata (setelah lowercase, hapus tanda baca, dan collapse huruf berulang). */
export const SLANG_MAP: Readonly<Record<string, string>> = {
  gak: 'tidak',
  ga: 'tidak',
  gk: 'tidak',
  nggak: 'tidak',
  ngga: 'tidak',
  enggak: 'tidak',
  tdk: 'tidak',
  pengen: 'ingin',
  pgn: 'ingin',
  pingin: 'ingin',
  mo: 'ingin',
  aja: 'saja',
  aj: 'saja',
  udh: 'sudah',
  udah: 'sudah',
  lg: 'lagi',
  bgt: 'banget',
  org: 'orang',
  gw: 'aku',
  gue: 'aku',
  aku: 'aku',
};

export const URGENT_PHRASES: readonly string[] = [
  'bunuh diri',
  'ingin mati',
  'mau mati',
  'mending mati',
  'lebih baik mati',
  'ingin mati saja',
  'mengakhiri hidup',
  'akhiri hidup',
  'tidak ingin hidup',
  'tidak mau hidup lagi',
  'menyakiti diri',
  'nyakitin diri',
  'melukai diri',
  'self harm',
  'sayat tangan',
  'gantung diri',
  'minum obat banyak',
  'overdosis',
  'lompat dari',
  'kys',
  'suicide',
];

export const CONCERN_PHRASES: readonly string[] = [
  'tidak kuat lagi',
  'capek hidup',
  'lelah hidup',
  'putus asa',
  'tidak ada harapan',
  'tidak ada gunanya',
  'aku tidak berguna',
  'jadi beban',
  'beban buat semua orang',
  'ingin menghilang',
  'ingin hilang saja',
  'tidak ada yang peduli',
  'sendirian banget',
  'hancur banget',
];
