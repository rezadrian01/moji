# Task 21: Polaku, Insight & refleksi

Dibangun: `InsightSection` (insight terbaru, `PatternFeedback` per pola, pertanyaan reflektif opsional, kolom refleksi, tombol "Lihat polaku" on-demand dengan teks "MOJI sedang melihat catatanmu…", `NOT_ENOUGH_DATA_TEXT`, daftar "Insight sebelumnya"), `InsightView` (dipakai ulang oleh `insight/[id]`), `PatternFeedback` (3 radio), `useWeeklyInsightOnForeground` (mount + AppState active, guard ref, error ditelan). `useAiAllowed` dari `features/app`.

TDD: RED = PatternFeedback suite "Cannot find module './PatternFeedback'", useWeeklyInsight gagal (0 insight), InsightSection suite gagal dijalankan. GREEN = `npm test -- src/features/insights`: 4 suite, 19 test lulus.

Hasil: suite penuh 32/32 (295 test), typecheck dan lint bersih.

Concern: test mock `expo-router` (router + SplashScreen) di InsightSection.test; navigasi ke insight/[id] tidak diuji end-to-end.
