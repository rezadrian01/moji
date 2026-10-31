# Task 24: Pengaturan, privasi & data, pengingat

Dibangun: daftar Pengaturan, settings/privacy (disimpan/dikirim, ekspor JSON via share sheet, hapus dua langkah),
settings/reminders (toggle + chip jam 05:00-23:00, toggle mingguan + chip hari), features/data/exportData.ts, resetApp.ts.

TDD: RED untuk data = "Cannot find module './resetApp'" / "'./exportData'"; RED untuk layar = 13 gagal terhadap placeholder.
GREEN: 13 test layar + 5 test data lulus. Suite penuh 304 lulus, typecheck dan lint bersih.

File test layar ditaruh di src/features/settings/ (bukan src/app/) agar expo-router tidak menganggapnya route.
expo-file-system memakai API baru (File, Paths.cache); mock lokal di exportData.test.ts.

Concern: pemilih jam berupa chip per jam penuh (tanpa menit), bukan DateTimePicker native. Jika izin notifikasi ditolak,
pengingat tidak dinyalakan dan muncul pesan lembut. Paragraf izin AI ditulis sendiri di privacy.tsx (konsolidasi di Task 25).

## Fix round 1

RED (`npx jest src/features/data src/features/settings`): 5 gagal sebelum perbaikan.
- exportData.ts: `await file.write(...)`. Test: write tertunda, shareAsync baru terpanggil sesudahnya; write gagal -> reject dan tidak membagikan. Privacy: ekspor gagal menampilkan pesan lembut.
- resetApp.ts: `Promise.allSettled([cancelAllReminders(), setInviteCode(null)])` lalu `wipeAll` terakhir. Test: cancel gagal ditoleransi, urutan, wipe gagal -> reject.
- privacy.tsx: wipe berhasil -> selalu router.replace('/onboarding'); gagal -> sheet ditutup, tampil "Belum berhasil menghapus. Kamu bisa coba lagi.", tanpa pindah halaman.
- reminders.tsx: try/catch dengan pesan "Belum berhasil menyimpan..."; jam tersimpan di luar daftar (mis. 07:30) jadi chip terpilih.

GREEN: `npm test` -> 34 suites, 313 tests lulus; typecheck dan lint bersih.
