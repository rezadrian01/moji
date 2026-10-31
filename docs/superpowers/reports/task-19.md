# Task 19: Jaring pengaman (support sheet, halaman bantuan, kontak)

## Yang dibangun

- **`helpContacts.ts`**
  - `NATIONAL_SERVICES`: SEJIWA `119,8` dan Darurat `112`, keduanya `verified:false`. Ada TODO rilis yang meminta tim memverifikasi nomor, lalu mencatat tanggal dan sumbernya.
  - `contactLinks(c)` menghasilkan tiga jenis tautan:
    - `tel:` hanya berisi angka, `+` di depan, dan koma sebagai jeda ekstensi.
    - `https://wa.me/628…` hanya untuk nomor HP Indonesia. `08xx`, `+62`, dan `62` dinormalisasi. Nomor kantor seperti `021…` dan nomor layanan pendek tidak diberi WhatsApp.
    - `web` hanya untuk http/https. Kalau skema tidak ada, `https://` ditambahkan. Skema lain ditolak, misalnya `javascript:` dan `file:`.
  - Helper `displayPhone` mengubah `119,8` menjadi `119 ext 8`.
  - Helper `hasReachableContact`: kontak yang hanya punya nama dianggap belum diisi.
- **`SupportSheet.tsx`**
  - `SupportContent` dipakai bersama oleh sheet dan `/help`. `SupportSheet` memakai `Sheet` dengan `hideCloseButton`, isinya bisa di-scroll, dan tombol "Aku baik-baik saja sekarang" selalu terlihat di bawah.
  - Urutan untuk `urgent`: kontak pribadi, lalu layanan nasional sebagai tombol primer besar, lalu konseling kampus.
  - Urutan untuk `concern`: kontak pribadi, lalu konseling kampus, lalu layanan nasional sebagai tautan biasa (`role=link`, tinggi minimal 48).
  - Kalau kampus kosong, muncul "Tambahkan kontak konseling kampus". Kalau kampus sudah diisi tapi kontak pribadi kosong, muncul "Tambahkan kontak orang terpercaya".
  - Ada catatan "MOJI bukan layanan darurat."
  - Selama nomor belum terverifikasi, muncul catatan kecil "Nomor layanan bisa berubah sewaktu-waktu." Nomornya tetap ditampilkan, tapi tidak disajikan sebagai fakta pasti.
  - Kalau `openURL` gagal, kegagalannya diabaikan dan nomornya tetap terlihat di label.
- **`SafetyProvider` / `useSafety`**
  - Signature stub Task 14 tidak berubah, dan `show` stabil (`useCallback`).
  - Kalau `show()` dipanggil saat sheet terbuka, tingkat yang lebih tinggi yang dipakai. `urgent` tidak pernah turun menjadi `concern`, sedangkan `concern` bisa naik menjadi `urgent`.
  - Tombol tambah kontak menutup sheet, lalu menjalankan `router.push('/settings/contacts')`.
- **`usePendingSafetyOnForeground`**
  - Berjalan saat mount dan setiap kali `AppState` berubah menjadi `active`. Pertama `takePendingSafety`, lalu `show(level, entryId)`.
  - Setelah itu `safetyShownLevel` di catatan dinaikkan (hanya kalau lebih tinggi) tanpa mengubah `updatedAt`, supaya edit berikutnya tidak memunculkan sheet lagi (Review Focus 5). Error diabaikan tanpa pesan.
- **`/help`**: judul "Butuh bantuan?" dan selalu dalam bentuk lengkap (tata letak `urgent`, tanpa tombol tutup). Animasi masuk memakai `useCalmMotion`.
- **`/settings/contacts`**
  - Form konseling kampus (nama, nomor, tautan) dan orang terpercaya (nama, nomor). Semua opsional, nilainya di-trim, dan kontak yang semua kolomnya kosong disimpan sebagai `null`. Tombol "Simpan" menampilkan "Kontak tersimpan." (live region).
  - Kalau gagal menyimpan, muncul pesan lembut dan isian tidak hilang.
  - Kalau settings gagal dibaca, form kosong **tidak** ditampilkan, karena menyimpannya bisa menghapus kontak yang sudah ada.

## Bukti TDD

Perintah: `npm test -- <path>` dari `app/`.

| Perilaku | RED | GREEN |
|---|---|---|
| helpContacts | `Cannot find module './helpContacts'` (Test Suites: 1 failed) | 10 passed |
| SupportSheet | modul belum ada, lalu kerangka kosong: `Tests: 16 failed, 16 total` (mis. `Unable to find an element with text: Kamu nggak harus menghadapinya sendirian…`) | 16 passed |
| SafetyProvider + foreground | stub: `Tests: 9 failed, 3 passed` (3 yang lulus adalah invarian: tidak tampil sebelum diminta, `show` stabil, tidak ada pending) | 12 passed |
| /help | placeholder: `Tests: 5 failed, 1 passed` (yang lulus: tidak ada tombol tutup) | 6 passed |
| contacts | placeholder: `Tests: 5 failed, 5 total`; tambahan gagal-baca: `1 failed` (`Unable to find … Kontak belum bisa dibuka`) | 7 passed |

Mutation check:
- Penjaga "jangan turunkan tingkat" diganti dengan selalu menimpa. Hasilnya `never downgrades an open urgent sheet to concern` gagal, lalu kode dikembalikan.
- Cabang `setStatus('failed')` diganti `'idle'`. Hasilnya `says so gently when saving fails` gagal, lalu kode dikembalikan. Test ini ditulis setelah cabangnya ada, jadi mutation check inilah bukti RED-nya.

## File

- Diubah: `app/src/features/safety/SafetyProvider.tsx`, `app/src/features/safety/usePendingSafety.ts`, `app/src/app/help.tsx`, `app/src/app/settings/contacts.tsx`
- Dibuat: `app/src/features/safety/SupportSheet.tsx`, `app/src/features/safety/helpContacts.ts`
- Test: `app/src/features/safety/{SupportSheet,SafetyProvider,help,contacts}.test.tsx`, `app/src/features/safety/helpContacts.test.ts`

## Hasil

- `npm test`: 34 suites, 337 tests lulus, tanpa warning atau console noise.
- `npm run typecheck`: bersih.
- `npm run lint`: bersih.

## Concern

1. **Lokasi test route.** `help.test.tsx` dan `contacts.test.tsx` ditaruh di `src/features/safety/`, bukan di `src/app/`. Semua file `.tsx` di `src/app/` ikut di-bundle sebagai route (regex `EXPO_ROUTER_CTX_IGNORE` hanya mengecualikan `+api` dan `+html`).
2. **Signature `contactLinks`.** Parameternya `Partial<Contact>`, bukan `Contact`, supaya contoh di brief (`contactLinks({phone:'0812-3456-789'})`) lolos typecheck. Ini tetap kompatibel dengan pemanggil yang mengirim `Contact` penuh.
3. **Backdrop Sheet.** Backdrop masih berupa tombol a11y berlabel "Tutup" (milik `ui/Sheet.tsx`, di luar daftar file). Labelnya berbeda dari "Aku baik-baik saja sekarang" (test memastikan hanya ada satu kontrol berlabel itu), tapi tetap menjadi kontrol kedua untuk menutup sheet. Kalau mau, backdrop bisa dibuat `accessible={false}` di task yang memiliki `Sheet`.
4. **Arti "bentuk lengkap" di `/help`.** Saya tafsirkan sebagai tata letak `urgent`: layanan nasional sebagai tombol besar, dan konseling kampus setelahnya.
5. **Pending untuk catatan yang sudah dihapus.** Sheet tetap ditampilkan karena lebih aman condong ke dukungan. Dalam praktik kasus ini tidak terjadi, karena `deleteEntry` dan postSave sudah membersihkan pending.
6. **Nomor layanan nasional.** Tim tetap wajib memverifikasi nomornya sebelum rilis (checklist plan).
7. **Dokumentasi API.** `Linking.openURL(url): Promise<true>` dicek dari `expo-linking@58.0.15` yang terpasang (`build/Linking.d.ts`), tidak dari dokumentasi web.
