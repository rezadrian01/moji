# Checklist rilis MOJI (build preview untuk responden)

Centang setiap butir sebelum membagikan APK. Semua langkah di bawah dikerjakan manusia; tidak ada yang otomatis.

## Checklist demo lokal

Untuk demo di laptop (HP lewat USB atau emulator). Detail langkah ada di `docs/SETUP.md`, bagian "Mode demo lokal".

- [ ] `functions/.env` terisi (`GOOGLE_CLOUD_PROJECT`, `MOJI_MODEL`).
- [ ] ADC aktif: `gcloud auth application-default login` dan `set-quota-project <PROJECT_ID>`.
- [ ] Evaluasi prompt lolos: `npm run eval` di `functions/`.
- [ ] Kode undangan dibuat: `npm run invites -- create 10 --prefix R`.
- [ ] `npm run dev:server` berjalan.
- [ ] `adb reverse tcp:8080 tcp:8080` sudah dijalankan (ulangi setelah HP dicabut-pasang atau emulator di-restart).
- [ ] `app/.env.local` berisi `EXPO_PUBLIC_API_URL=http://localhost:8080` (`EXPO_PUBLIC_DEV_TOOLS=0` untuk build responden), lalu app dibangun dan dipasang: `cd app && npx expo run:android --variant release` (emulator `Medium_Phone_API_37.0` atau HP USB).
- [ ] `curl -H "X-Moji-Invite: <kode>" http://localhost:8080/health` menjawab `{"valid":true}`.

---

Checklist di bawah untuk rilis APK ke responden.

## 1. Verifikasi konten keselamatan

- [ ] **Nomor layanan nasional di `app/src/features/safety/helpContacts.ts`** (spec §6.9). Cek tiap nomor (SEJIWA `119,8`, Darurat `112`, dan lainnya) ke sumber resmi. Ubah `verified: true`, lalu tulis tanggal verifikasi dan sumbernya di komentar file itu.
- [ ] **Sumber WHO di `docs/safety-phrases.md`.** Judul dan tahun dokumen WHO yang dikutip ditulis dari ingatan. Buka tiap sumber, cocokkan judul, tahun, dan isinya, lalu perbaiki daftar kalau berbeda.
- [ ] **Di HP Android sungguhan**, dari support sheet: tautan `tel:119,8` (jeda koma) menekan nomor dan menunggu jeda sebelum ekstensi, dan tautan `https://wa.me/...` terbuka benar di WhatsApp. Coba juga saat WhatsApp tidak terpasang.

## 2. Backend (GCP)

- [ ] Firestore (mode Native) sudah dibuat.
- [ ] Service account function punya role yang tercantum di `functions/README.md` (bagian "IAM service account"), tidak lebih.
- [ ] **Budget alert** terpasang (Billing, Budgets & alerts) dengan ambang mis. 50%, 90%, 100% dan notifikasi email. Lihat `functions/README.md`.
- [ ] Deploy function sesuai `functions/README.md` (bagian "Deploy").
- [ ] `curl` ke `/health` dengan header `X-Moji-Invite: <kode uji>` mengembalikan sukses. Tanpa header atau dengan kode salah harus ditolak.
- [ ] Buat kode undangan dari folder `functions/`: `npm run invites -- create 20` (tambahkan `--prefix R` bila perlu). Sesuaikan jumlah dengan jumlah responden.
- [ ] **Simpan pemetaan label ke responden di luar repo** (mis. di penyimpan pribadi). Jangan commit CSV keluaran atau pemetaannya.
- [ ] Isi `EXPO_PUBLIC_API_URL` di environment EAS (`eas env:create`, lingkungan `preview`). Ini satu-satunya konfigurasi klien; tidak ada rahasia di APK.

## 3. Kualitas AI

- [ ] Jalankan `npm run eval` (di folder tempat skrip eval berada) dan pastikan lolos.

## 4. Konfigurasi EAS Update

- [ ] Login `eas login`, lalu dari `app/` jalankan `eas update:configure` sekali. Perintah ini menambah `updates.url` dan `extra.eas.projectId` ke `app.json`. Commit hasilnya sebelum build pertama.
- [ ] `runtimeVersion` memakai policy `appVersion`. **Naikkan `version` di `app.json` setiap kali ada perubahan kode native atau dependency native**; update OTA hanya diterima build dengan versi yang sama.
- [ ] Profil `preview` di `eas.json` memakai channel `preview` dan environment EAS `preview`; profil `development` memakai environment `development`.
- [ ] `versionCode` Android dikelola EAS (`cli.appVersionSource: "remote"`, `autoIncrement: true` di profil `preview`), jadi setiap build preview mendapat `versionCode` lebih tinggi. Opsional: `eas build:version:set` untuk menentukan nilai awal secara manual.
- [ ] Update JS saja dikirim dengan `eas update --channel preview --message "<pesan>" --environment preview`.

## 5. Uji manual di HP Android (spec §10)

- [ ] Offline: catatan tersimpan tanpa jaringan.
- [ ] AI mati: aplikasi tetap berfungsi dengan fallback lokal.
- [ ] Kode salah: pesan jelas dan tidak menghakimi.
- [ ] Limit tercapai: pesan jelas, catatan tetap tersimpan.
- [ ] Reduce motion aktif: animasi dikurangi.
- [ ] Font terbesar: tata letak tetap terbaca, tidak terpotong.
- [ ] Mode gelap: kontras dan warna benar.
- [ ] Update APK tidak menghapus data: pasang build N, isi catatan, lalu pasang build N+1 (`versionCode` lebih tinggi, otomatis dari `autoIncrement`) di atasnya; data harus tetap ada.

## 6. Build

- [ ] `EXPO_PUBLIC_DEV_TOOLS` **tidak aktif** di build untuk responden (periksa environment EAS profil `preview`).
- [ ] `npm test`, `npm run typecheck`, `npm run lint` bersih di `app/`; `npx expo-doctor` bersih.
- [ ] `eas build --profile preview --platform android`.
- [ ] **Keystore dikelola EAS. Jangan dihapus atau diganti**; keystore berbeda membuat Android menolak update di atas data lama. Package tetap `com.moji.journal`.
