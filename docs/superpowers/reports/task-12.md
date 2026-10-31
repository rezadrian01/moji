# Task 12: Tema & komponen UI dasar

## Dibangun
`app/src/theme/{tokens.ts,ThemeProvider.tsx}`, `app/src/ui/{Text,Button,Chip,MoodFace,MoodPicker,Sheet,Screen}.tsx`, `app/src/ui/motion.ts`, signature sesuai brief. Palet brief dipakai apa adanya (semua lolos tes kontras, hue mood di luar 340-20). Token tambahan (tidak ada di brief): surfaceAlt, border, focus per tema.

## TDD
- RED: `npx jest src/theme src/ui` -> 6 suite FAIL, "Cannot find module './tokens'" (modul belum ada).
- GREEN: 11 suite lulus; full run 49 tests passed. `tsc --noEmit` dan `expo lint` bersih.

## Catatan / concern
- `react-native-reanimated/mock` global di jest.setup.ts gagal dimuat (`loadUnpackersWithCode` undefined, runtime worklets tidak ada di Jest) begitu ada file yang meng-import reanimated. Tes `motion.test.tsx` menimpa dengan stub kecil (FadeIn, Easing, useReducedMotion). Task lain yang meng-import reanimated akan kena hal yang sama; jest.setup.ts (file bersama) tidak saya ubah.
- Tambahan tes di luar brief: primary di atas bg >= 4.5 (teks tombol quiet), kontras pada surface, disabled Button.
- Sheet: label aksesibilitas ada pada panel, backdrop tombol "Tutup".
