# Task 12b report

## Dibangun
- jest.setup.ts: mock `react-native-worklets` (`react-native-worklets/src/mock`, sesuai docs worklets), mock `react-native-reanimated/src/initializers.native` (initializer native memanggil JSReanimated.setCSSEventHandler yang melempar di Jest; resolver resmi butuh perubahan package.json, jadi tidak dipakai), mock `react-native-reanimated/mock`, mock `expo-crypto` (randomUUID), dan `SchedulableTriggerInputTypes` di mock expo-notifications (nilai dari Notifications.types.d.ts: calendar, daily, weekly, monthly, yearly, date, timeInterval).
- Sheet: label tidak lagi `accessible={false}`, container modal, tombol "Tutup" terlihat (Button quiet, `closeLabel`, `hideCloseButton`), animationType 'none' saat reduce motion, selain itu 'fade'.
- Chip: teks "disarankan" (caption, muted) untuk chip suggested yang belum selected.
- insightText: FORBIDDEN_WORDS baru, PRESSURE_WORDS, copy baru, label huruf kecil di tengah kalimat.
- Bersih-bersih: stub reanimated lokal di motion.test.tsx dan mock expo-crypto per-file dihapus.

## Bukti TDD
RED: setup.test.ts gagal `Cannot read properties of undefined (reading 'loadUnpackersWithCode')`, lalu `setCSSEventHandler is not available in JSReanimated`; randomUUID undefined; SchedulableTriggerInputTypes undefined (reading 'DAILY'). Sheet/Chip/insightText: 4 + 7 test gagal sebelum implementasi.
GREEN: 21 suite, 223 test lulus; typecheck dan lint bersih.

## Concern
Mock path `react-native-reanimated/src/initializers.native` bergantung pada struktur internal Reanimated 4.7.1; kalau versi naik, tinjau ulang (alternatif: `resolver` di jest config).
