# Panduan Setup MOJI

Panduan ini berurutan dari nol sampai APK siap dibagikan ke responden. Langkah 1–4 cukup untuk mencoba aplikasi di HP **tanpa AI**. Mode demo lokal (di bawah) menyalakan AI lewat server di laptop. Langkah 5–9 menyalakan AI lewat GCP. Langkah 10–12 untuk membuat APK, mengirim update, dan rilis.

## Gambaran komponen

```
HP Android
└─ app/          Aplikasi Expo (React Native). Semua catatan tersimpan di HP (SQLite).
      │  HTTPS + header X-Moji-Invite (hanya kalau AI aktif)
      ▼
GCP
├─ functions/    Satu Cloud Run function "api": /health, /analyzeEntry, /writeInsight
├─ Firestore     Hanya kode undangan + hitungan pemakaian (tidak ada isi catatan)
└─ Vertex AI     Gemini
```

| Folder / file | Isi |
|---|---|
| `app/` | Aplikasi Expo SDK 58 |
| `functions/` | Backend. Detail teknis ada di `functions/README.md` |
| `contract/fixtures/` | Contoh request/response API, dipakai test kedua sisi |
| `docs/release-checklist.md` | Checklist wajib sebelum APK dibagikan |
| `docs/safety-phrases.md` | Daftar frasa safety check lokal dan sumbernya |

---

## Mode demo lokal (dipakai untuk demo)

Keputusan tim 31 Okt 2026: demo memakai HP Android lewat USB atau emulator, backend berjalan di laptop, AI tetap Gemini lewat Vertex AI, dan kode undangan disimpan di file lokal. Tidak ada Cloud Run dan tidak ada Firestore.

```
HP Android / emulator
      │  http://localhost:8080  (lewat adb reverse)
      ▼
Laptop: functions/ (npm run dev:server)
├─ data/invites.json   kode undangan + hitungan pemakaian
└─ Vertex AI (Gemini)  dengan kredensial ADC akun gcloud kamu
```

**Prasyarat:** Android Studio dengan emulator, **atau** HP Android dengan USB debugging aktif; `adb` ada di PATH (`adb devices` menampilkan perangkatmu); `gcloud` terpasang; langkah 1 dan 2 di bawah sudah dikerjakan.

1. **Login ADC** (sekali, ulangi kalau kredensial kedaluwarsa):

   ```bash
   gcloud auth application-default login
   gcloud auth application-default set-quota-project <PROJECT_ID>
   ```

   Pastikan Vertex AI API aktif di project itu (langkah 5.2).

2. **Isi `.env` backend.** Salin `functions/.env.example` menjadi `functions/.env`, lalu isi `GOOGLE_CLOUD_PROJECT` dengan project ID kamu dan `MOJI_MODEL` dengan nama model Gemini (langkah 5.5). Sisanya boleh dibiarkan. `.env` dan `data/` sudah di-ignore git.

3. **Buat kode undangan** (tersimpan di `functions/data/invites.json`):

   ```bash
   cd functions
   npm run invites -- create 10 --prefix R
   ```

4. **Jalankan server** (build lalu dengarkan di `localhost:8080`; biarkan terminal ini terbuka):

   ```bash
   npm run dev:server
   ```

5. **Sambungkan HP atau emulator ke server laptop.** Ulangi setiap HP dicabut-pasang atau emulator di-restart:

   ```bash
   adb reverse tcp:8080 tcp:8080
   ```

6. **Arahkan app ke server.** Isi `app/.env.local`:

   ```
   EXPO_PUBLIC_API_URL=http://localhost:8080
   ```

7. **Jalankan app** dengan salah satu cara: Expo Go (`cd app && npx expo start`), development build (`npx expo run:android`), atau instal APK preview. APK preview membawa izin HTTP cleartext (`expo-build-properties`), jadi bisa memanggil `http://localhost`. Karena `EXPO_PUBLIC_*` dibaca saat build, untuk APK preview isi `EXPO_PUBLIC_API_URL=http://localhost:8080` di environment EAS `preview` sebelum build.

8. **Cek backend** dari laptop. Harusnya `{"valid":true}`:

   ```bash
   curl -H "X-Moji-Invite: MOJI-R01-XXXX" http://localhost:8080/health
   ```

Di aplikasi buka **Pengaturan → Bantuan AI**, pilih **Aktifkan**, lalu masukkan salah satu kode. Perintah `npm run invites -- list` dan `revoke <kode>` bekerja sama seperti biasa terhadap file itu.

Catatan: uji di rumah responden membutuhkan server yang online, yaitu Cloud Run di bagian berikutnya. Server laptop hanya terjangkau lewat USB/emulator.

Untuk memakai Firestore lagi (misalnya di Cloud Run), set `MOJI_STORE=firestore`. Nilai bawaannya `file`.

---

## 1. Prasyarat

**Software di laptop:**
- Node.js **24** atau lebih baru, beserta npm.
- Git.
- [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install), untuk langkah 5 ke atas.
- EAS CLI, untuk langkah 10 ke atas. Tidak perlu diinstal global; jalankan lewat `npx eas-cli@latest <perintah>`.

**HP dan akun:**
- HP Android dengan aplikasi **Expo Go** dari Play Store, atau emulator Android.
- Akun **Google Cloud** dengan billing aktif, untuk AI.
- Akun **Expo** (expo.dev), untuk build APK.

## 2. Clone dan install

```bash
git clone https://github.com/rezadrian01/moji.git
cd moji

cd app && npm install && cd ..
cd functions && npm install && cd ..
```

Untuk menambah library ke app, selalu pakai `npx expo install <paket>` (bukan `npm install <paket>`), supaya versinya cocok dengan SDK 58.

## 3. Menjalankan aplikasi di HP (tanpa AI)

```bash
cd app
cp .env.example .env.local     # biarkan EXPO_PUBLIC_API_URL kosong dulu
npx expo start
```

Scan QR code dengan Expo Go. Laptop dan HP harus berada di Wi-Fi yang sama; kalau tidak bisa, coba `npx expo start --tunnel`.

Hal yang perlu diketahui:
- Tanpa `EXPO_PUBLIC_API_URL`, aplikasi berjalan penuh dalam **mode lokal**. Mencatat, timeline, statistik, insight dari templat lokal, safety check lokal, dan pengingat semuanya jalan. Yang tidak ada hanya kalimat insight dari Gemini, saran kategori, dan deteksi risiko AI.
- **Alat tim (data contoh):** dalam mode development, buka **Pengaturan → Alat tim (data contoh)**. Di sana ada tombol "Isi data contoh" (21 hari catatan palsu), "Buat insight mingguan sekarang", dan "Hapus semua data". Gunanya mencoba insight tanpa menunggu seminggu.
- Kalau ada fitur native yang tidak jalan di Expo Go (misalnya notifikasi), pakai **development build**. Caranya ada di langkah 10.4.

## 4. Menjalankan test

```bash
cd app
npm test            # Jest
npm run typecheck
npm run lint

cd ../functions
npm test            # Vitest
npm run typecheck
```

Semuanya harus hijau sebelum commit. Aturan kerja (TDD, agent paralel) ada di `CLAUDE.md`.

---

## 5. Opsional: deploy ke Cloud Run (kalau nanti ada uji di rumah)

Bagian 5–7 hanya perlu kalau backend harus online. Untuk demo lokal lewati sampai langkah 8.

### 5.0 Setup GCP (sekali saja)

Ganti `<PROJECT_ID>` dengan ID project GCP kalian.

### 5.1 Login dan pilih project

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>
```

### 5.2 Aktifkan API yang dibutuhkan

```bash
gcloud services enable \
  cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com aiplatform.googleapis.com firestore.googleapis.com
```

### 5.3 Buat Firestore (mode Native)

```bash
gcloud firestore databases create --location=asia-southeast2 --type=firestore-native
```

Firestore hanya menyimpan koleksi `invites` (kode undangan) dan `usage` (hitungan per hari).

### 5.4 Buat service account untuk function

```bash
gcloud iam service-accounts create moji-api --display-name="MOJI API"

SA=moji-api@<PROJECT_ID>.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding <PROJECT_ID> --member="serviceAccount:$SA" --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding <PROJECT_ID> --member="serviceAccount:$SA" --role="roles/datastore.user"
```

Cukup dua role itu, jangan tambah yang lain.

### 5.5 Pilih model Gemini

Buka **Vertex AI → Model Garden** di Cloud Console dan pilih model **Gemini Flash** terbaru yang tersedia. Catat nama modelnya; nanti dipakai sebagai `MOJI_MODEL`. Lokasi default Vertex di kode adalah `global`.

### 5.6 Pasang budget alert

Buka Cloud Console, lalu **Billing → Budgets & alerts → Create budget**:
- pilih project MOJI;
- isi batas bulanan;
- pasang ambang 50%, 90%, dan 100% dengan notifikasi email.

Batas harian di function (`MOJI_GLOBAL_LIMIT`) tetap menjadi pengaman utama. Budget alert hanya untuk pemberitahuan.

### 5.7 Matikan logging prompt di Vertex

Pastikan logging request/response Vertex AI tidak aktif di project. Function sendiri tidak pernah menyimpan atau me-log isi catatan.

## 6. Deploy backend

```bash
cd functions
gcloud functions deploy api \
  --gen2 --runtime=nodejs24 \
  --region=asia-southeast2 \
  --source=. --entry-point=api \
  --trigger-http --allow-unauthenticated \
  --service-account=moji-api@<PROJECT_ID>.iam.gserviceaccount.com \
  --set-env-vars MOJI_MODEL=<NAMA_MODEL>,MOJI_VERTEX_LOCATION=global,MOJI_PER_CODE_LIMIT=50,MOJI_GLOBAL_LIMIT=1000
```

- TypeScript otomatis dikompilasi di Cloud Build lewat script `gcp-build`.
- `--allow-unauthenticated` aman karena setiap request dijaga oleh kode undangan.
- Simpan **URL hasil deploy**. URL itu menjadi `EXPO_PUBLIC_API_URL` di app.

Environment variable function:

| Nama | Wajib | Default | Keterangan |
|---|---|---|---|
| `MOJI_MODEL` | ya | – | Nama model Gemini |
| `MOJI_VERTEX_LOCATION` | tidak | `global` | Lokasi Vertex AI |
| `MOJI_PER_CODE_LIMIT` | tidak | `50` | Request per kode per hari (WIB) |
| `MOJI_GLOBAL_LIMIT` | tidak | `1000` | Request semua kode per hari (WIB) |
| `GOOGLE_CLOUD_PROJECT` | otomatis | – | Diisi otomatis oleh Cloud Run |

## 7. Kode undangan

Perintah dijalankan dari laptop dan butuh kredensial lokal:

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=<PROJECT_ID>

cd functions
npm run invites -- create 20 --prefix R    # mencetak CSV "label,code"
npm run invites -- list
npm run invites -- revoke MOJI-R07-K3F9    # cabut satu kode
```

- Satu kode untuk satu responden. Kirim ke responden lewat chat pribadi.
- **Jangan commit** CSV hasil perintah di atas atau catatan "label R07 = nama siapa". Simpan di luar repo.

### Cek backend setelah deploy

```bash
npm run invites -- create 1 --prefix T      # kode uji
curl -i -H "X-Moji-Invite: MOJI-T01-XXXX" "<URL_FUNCTION>/health"
# Harusnya 200 {"valid":true}. Tanpa header atau kode salah: 401. Kode dicabut: 403.
npm run invites -- revoke MOJI-T01-XXXX     # cabut lagi kode uji
```

## 8. Evaluasi prompt (wajib sebelum rilis)

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=<PROJECT_ID> MOJI_MODEL=<NAMA_MODEL>
cd functions
npm run eval
```

- Perintah ini memanggil Gemini sungguhan dengan 32 catatan contoh: kasus berisiko, kasus netral, dan kasus insight.
- Kasus berisiko diulang 3 kali, dan semuanya harus lolos.
- Exit code 1 berarti ada yang gagal. **Jangan rilis sebelum lolos.** Ulangi setiap kali prompt atau model diganti.

## 9. Menghubungkan app ke backend

**Saat development (Expo Go):** isi `app/.env.local`, lalu restart `npx expo start`.

```
EXPO_PUBLIC_API_URL=<URL_FUNCTION>
EXPO_PUBLIC_DEV_TOOLS=1
```

Setelah itu di aplikasi buka **Pengaturan → Bantuan AI** (atau onboarding langkah 3), pilih **Aktifkan**, lalu masukkan kode undangan.

**Menjalankan backend lokal:** lihat bagian "Mode demo lokal" di atas (`npm run dev:server` dan `adb reverse`).

`EXPO_PUBLIC_*` ikut masuk ke dalam APK, jadi isinya bukan rahasia. Memang tidak ada rahasia apa pun di app.

---

## 10. Build APK dengan EAS

Jalankan semua perintah dari folder `app/`.

### 10.1 Login dan hubungkan project (sekali)

```bash
npx eas-cli@latest login
npx eas-cli@latest init                 # membuat project di expo.dev
npx eas-cli@latest update:configure     # menambah updates.url & projectId ke app.json
```

Commit perubahan `app.json` yang dihasilkan sebelum build pertama.

### 10.2 Isi environment EAS

```bash
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_API_URL --value <URL_FUNCTION> --visibility plaintext
# EXPO_PUBLIC_DEV_TOOLS jangan diisi (atau isi 0) di environment preview: alat tim tidak boleh muncul di HP responden
```

Untuk build development tim, `EXPO_PUBLIC_DEV_TOOLS=1` boleh diisi di environment `development`.

### 10.3 Build APK untuk responden

```bash
npx eas-cli@latest build --profile preview --platform android
```

- Hasilnya file **APK** yang bisa diunduh dari link expo.dev. Kirim link itu ke responden.
- Responden perlu mengizinkan "instal dari sumber tidak dikenal".
- `versionCode` naik otomatis setiap kali build.
- **Keystore dikelola EAS. Jangan dihapus atau diganti**, karena keystore yang berbeda membuat update tidak bisa dipasang di atas data lama.
- Package tetap `com.moji.journal`.

### 10.4 Development build (opsional, untuk tim)

```bash
npx eas-cli@latest build --profile development --platform android
```

Instal hasilnya di HP tim, lalu jalankan `npx expo start` seperti biasa. Development build mendukung semua modul native.

## 11. Update selama studi berjalan

| Jenis perubahan | Caranya |
|---|---|
| Hanya kode JS/TS (bug, teks, tampilan) | **OTA update**, tanpa instal ulang: `npx eas-cli@latest update --channel preview --environment preview --message "perbaiki ..."` |
| Menambah atau mengubah library native, atau `app.json` | Naikkan `version` di `app.json`, lalu build APK baru (langkah 10.3) dan bagikan lagi. Data responden tetap aman selama keystore dan package sama. |
| Backend (prompt, limit, model) | Deploy ulang function (langkah 6), lalu `npm run eval` (langkah 8) |

`runtimeVersion` memakai policy `appVersion`. OTA hanya diterima build dengan `version` yang sama. Itulah alasan `version` wajib dinaikkan setiap ada perubahan native.

## 12. Sebelum membagikan APK

Ikuti **`docs/release-checklist.md`** sampai semua butir tercentang. Yang paling penting:
1. **Verifikasi nomor SEJIWA (119 ext 8) dan 112** di `app/src/features/safety/helpContacts.ts` ke sumber resmi, lalu ubah `verified: true`.
2. Cek judul sumber WHO di `docs/safety-phrases.md`.
3. Coba tombol telepon dan WhatsApp di support sheet dari HP sungguhan.
4. Pastikan `npm run eval` lolos.
5. Uji manual: offline, AI mati, kode salah, font terbesar, mode gelap, reduce motion, dan update APK di atas data lama.
6. Pastikan alat tim **tidak** muncul di build responden.

---

## Troubleshooting singkat

| Gejala | Kemungkinan penyebab |
|---|---|
| Onboarding selalu bilang "Koneksi lagi bermasalah" | `EXPO_PUBLIC_API_URL` kosong atau salah, atau function belum di-deploy. Cek dengan `curl …/health`. |
| "Kodenya belum cocok" | Kode salah ketik atau belum dibuat. Cek dengan `npm run invites -- list`. |
| "Kode undanganmu sudah tidak aktif" | Kode dicabut (`revoke`). Buat kode baru untuk responden itu. |
| Fitur AI berhenti di siang/sore hari | Batas harian tercapai (`MOJI_PER_CODE_LIMIT` / `MOJI_GLOBAL_LIMIT`). Aplikasi otomatis kembali ke mode lokal. Hitungan reset pukul 00:00 WIB. |
| HP atau emulator tidak bisa konek ke server | Jalankan ulang `adb reverse tcp:8080 tcp:8080` (hilang saat HP dicabut-pasang atau emulator di-restart), pastikan `npm run dev:server` masih jalan, lalu cek `curl http://localhost:8080/health` dari laptop. |
| Error kredensial Vertex (500, atau server melaporkan kredensial tidak ditemukan) | Ulangi `gcloud auth application-default login` dan `gcloud auth application-default set-quota-project <PROJECT_ID>`, lalu pastikan `GOOGLE_CLOUD_PROJECT` dan `MOJI_MODEL` di `functions/.env` terisi. |
| Deploy gagal saat build | Pastikan `typescript` dan `@types/node` masih ada di `devDependencies` `functions/`, dan `.gcloudignore` tidak mengecualikan `src/`. |
| Notifikasi tidak muncul di Expo Go | Pakai development build (langkah 10.4) dan pastikan izin notifikasi di HP aktif. |
| Update OTA tidak diterima | `version` di `app.json` build berbeda dengan update, atau channel bukan `preview`. |
