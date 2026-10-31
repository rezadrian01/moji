// Satu teks per hari dalam seminggu (scheduler.ts menggilir sesuai hari).
export const DAILY_MESSAGES: string[] = [
  'Gimana harimu? Kalau mau, ceritain ke MOJI.',
  'Ada waktu sebentar buat cek perasaanmu?',
  'MOJI di sini kalau kamu mau mencatat.',
  'Satu tap aja cukup buat mencatat mood hari ini.',
  'Kalau lagi sempat, gimana perasaanmu sekarang?',
  'Hai, MOJI cuma mau menyapa. Mau mencatat sebentar?',
  'Apa pun rasanya hari ini, boleh dicatat di MOJI.',
];

export const WEEKLY_NUDGE: { title: string; body: string } = {
  title: 'Ringkasan minggu lalu',
  body: 'Ringkasan minggu lalu bisa kamu lihat kalau mau.',
};
