# Task 24: Pengaturan, privasi & data, pengingat

Dibangun: daftar Pengaturan, settings/privacy (disimpan/dikirim, ekspor JSON via share sheet, hapus dua langkah),
settings/reminders (toggle + chip jam 05:00-23:00, toggle mingguan + chip hari), features/data/exportData.ts, resetApp.ts.

TDD: RED untuk data = "Cannot find module './resetApp'" / "'./exportData'"; RED untuk layar = 13 gagal terhadap placeholder.
GREEN: 13 test layar + 5 test data lulus. Suite penuh 304 lulus, typecheck dan lint bersih.

File test layar ditaruh di src/features/settings/ (bukan src/app/) agar expo-router tidak menganggapnya route.
expo-file-system memakai API baru (File, Paths.cache); mock lokal di exportData.test.ts.

Concern: pemilih jam berupa chip per jam penuh (tanpa menit), bukan DateTimePicker native. Jika izin notifikasi ditolak,
pengingat tidak dinyalakan dan muncul pesan lembut. Paragraf izin AI ditulis sendiri di privacy.tsx (konsolidasi di Task 25).
