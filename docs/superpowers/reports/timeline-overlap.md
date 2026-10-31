# timeline-overlap

## Penyebab
Di `TimelineScreen`, baris chip filter baru dirender setelah data async termuat (`entries.length > 0`), sementara `TimelineList` membungkus grup dengan `Animated.View entering={FadeIn}`. Di screenshot, judul "Sabtu, 31 Okt" berada tepat di posisi baris chip (y ~357px = posisi list kalau chip belum ada), jadi view ber-entering tertinggal di frame lama saat sibling di atasnya bertambah tinggi. Itu juga sumber bentuk "hantu" antar kartu. Dengan 49 entri, konten melewati layar dan layout dihitung ulang sehingga tidak terlihat. Bukan sticky header (tidak memakai SectionList) dan bukan posisi absolut/margin negatif. Ini analisis dari kode dan screenshot; tidak direproduksi di emulator.

## Perbaikan
`TimelineList.tsx`: pembungkus grup diganti `View` biasa tanpa `entering` (empty state tetap fade-in). Tidak ada perubahan perilaku lain; reduce motion tetap dihormati.

## TDD
- RED: `npm test -- src/features/timeline/TimelineList` -> gagal: `Expected substring: not "entering"`, output JSON memuat `"entering":{}` pada View grup.
- GREEN: setelah perbaikan, seluruh suite 58 suite / 734 test lulus.

## Hasil
`npm test` hijau, `npm run typecheck` bersih, `npm run lint` bersih.

## Concern
Perbaikan belum diverifikasi ulang di emulator; mohon cek ulang skenario 2 entri + chip "Akademik".
