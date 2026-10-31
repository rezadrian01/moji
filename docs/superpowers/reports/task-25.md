# Task 25: Alat tim (data contoh) & konsolidasi

## Dibangun
- `features/dev/seed.ts`: `seedSampleData(db, now, rand)` membuat 21 hari catatan (1-2 per hari, total 21 + 4 per minggu penuh). Satu catatan biasa tiap hari (mood 3-5, tanpa akademik); Sen/Rab/Jum ada catatan akademik mood 1-2; Kamis akademik mood 4. Minggu lalu: akademik 3/4 rendah (0,75) vs dasar ~0,27, lolos `PATTERN_RULES`. Waktu catatan dijepit ke `now` (tidak ada catatan di masa depan).
- `app/dev/seed.tsx`: Redirect ke `/` kalau `!DEV_TOOLS_ENABLED`; tombol "Isi data contoh", "Buat insight mingguan sekarang", "Hapus semua data" (dengan konfirmasi).
- `app/settings/privacy.tsx`: dua paragraf AI diganti `AiConsentText` (dengan satu kalimat pengantar "Tidak ada yang dikirim kalau Bantuan AI mati.").

## Bukti TDD
- RED: `npm test -- src/features/dev` gagal "Cannot find module './seed'"; screen/privacy test: 5 failed, 6 passed (placeholder + teks lama).
- GREEN: 29/29 pada dev + settings; seluruh suite 53 suite, 426 tes lulus.

## Hasil
test hijau, typecheck bersih, lint bersih (setelah memperbaiki satu warning require).

## Concern
Tes seed memakai tiga nilai `now` (Rabu, Minggu 23:00, Senin 00:30 WIB). Tombol insight memakai `defaultAiClient` hanya kalau AI diizinkan; selain itu teks lokal.
