# Panduan Setup MOJI

Panduan lengkap dari nol. Kalau hanya ingin menjalankan demo, cukup baca [`RUNNING.md`](RUNNING.md).

| Bagian | Untuk apa | Wajib? |
|---|---|---|
| [A. Dasar](#a-dasar) | Prasyarat, clone, menjalankan tanpa AI, test | Ya |
| [B. Mode demo lokal](#b-mode-demo-lokal-dipakai-sekarang) | Server di laptop, AI lewat Vertex, HP via USB/emulator | Ya, untuk demo |
| [C. Evaluasi prompt](#c-evaluasi-prompt) | Memastikan AI aman sebelum dipakai | Ya, sebelum demo/rilis |
| [D. Backend online di Cloud Run](#d-opsional-backend-online-di-cloud-run) | Kalau aplikasi dipakai di luar laptop (uji di rumah) | Opsional |
| [E. Build &amp; update lewat EAS](#e-opsional-build-dan-update-lewat-eas) | Build APK di cloud dan update OTA | Opsional |
| [F. Sebelum membagikan APK](#f-sebelum-membagikan-apk-ke-responden) | Checklist keselamatan dan rilis | Ya, sebelum dibagikan |

## Gambaran komponen

```
HP Android / emulator
└─ app/          Aplikasi Expo (React Native). Semua catatan tersimpan di HP (SQLite).
      │  HTTP + header X-Moji-Invite (hanya kalau AI aktif)
      ▼
Backend (functions/)   /health, /analyzeEntry, /writeInsight
├─ Kode undangan       file lokal (mode demo) atau Firestore (Cloud Run)
└─ Vertex AI           Gemini
```

| Folder / file | Isi |
|---|---|
| `app/` | Aplikasi Expo SDK 58 |
| `functions/` | Backend. Detail teknis di `functions/README.md` |
| `contract/fixtures/` | Contoh request/response API, dipakai test kedua sisi |
| `run-demo.sh` | Menjalankan seluruh demo dengan satu perintah |
| `docs/release-checklist.md` | Checklist sebelum demo atau sebelum APK dibagikan |
| `docs/safety-phrases.md` | Daftar frasa safety check lokal dan sumbernya |

---

## A. Dasar

### A1. Prasyarat

**Software di laptop:**
- Node.js **24** atau lebih baru, beserta npm.
- Git.
- **Android Studio** dengan Android SDK. `ANDROID_HOME` mengarah ke folder SDK, biasanya `~/Android/Sdk`.
- [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install), untuk AI.
- (Opsional) EAS CLI, hanya untuk bagian E. Tidak perlu diinstal global; jalankan lewat `npx eas-cli@latest <perintah>`.

**Device dan akun:**
- Emulator Android dari Android Studio → Device Manager, **atau** HP Android dengan USB debugging aktif.
- Akun **Google Cloud** dengan billing aktif dan Vertex AI API menyala, untuk AI.
- (Opsional) Akun **Expo** (expo.dev), hanya untuk bagian E.

### A2. Clone dan install

```bash
git clone https://github.com/rezadrian01/moji.git
cd moji

cd app && npm install && cd ..
cd functions && npm install && cd ..
```

Untuk menambah library ke app, selalu pakai `npx expo install <paket>` (bukan `npm install <paket>`), supaya versinya cocok dengan SDK 58.

### A3. Menjalankan aplikasi tanpa AI (Expo Go)

```bash
cd app
cp .env.example .env.local     # biarkan EXPO_PUBLIC_API_URL kosong
npx expo start
```

Scan QR code dengan Expo Go. Laptop dan HP harus berada di Wi-Fi yang sama; kalau tidak bisa, coba `npx expo start --tunnel`.

- Tanpa `EXPO_PUBLIC_API_URL`, aplikasi berjalan penuh dalam **mode lokal**. Mencatat, timeline, statistik, insight dari templat lokal, safety check lokal, dan pengingat semuanya jalan. Yang tidak ada hanya kalimat insight dari Gemini, saran kategori, dan deteksi risiko AI.
- **Alat tim (data contoh):** dalam mode development, buka **Pengaturan → Alat tim (data contoh)**. Isinya tombol "Isi data contoh" (±21 hari catatan palsu), "Buat insight mingguan sekarang", dan "Hapus semua data".
- Kalau ada fitur native yang tidak jalan di Expo Go (misalnya notifikasi), pakai build lokal di bagian B atau development build di bagian E.

### A4. Menjalankan test

```bash
cd app && npm test && npm run typecheck && npm run lint
cd ../functions && npm test && npm run typecheck
```

Semuanya harus hijau sebelum commit. Aturan kerja (TDD, agent paralel) ada di `CLAUDE.md`.

---

## B. Mode demo lokal (dipakai sekarang)

Keputusan tim 31 Okt 2026:
- demo memakai HP Android lewat USB atau emulator;
- backend berjalan di laptop;
- AI tetap Gemini lewat Vertex AI, memakai kredensial gcloud kamu (ADC);
- kode undangan disimpan di file lokal.

Tidak ada Cloud Run dan tidak ada Firestore.

```
HP Android / emulator
      │  http://localhost:8080  (lewat adb reverse)
      ▼
Laptop: functions/ (npm run dev:server)
├─ data/invites.json   kode undangan + hitungan pemakaian
└─ Vertex AI (Gemini)  dengan kredensial ADC akun gcloud kamu
```

> **Cara cepat:** setelah langkah B1–B3 di bawah selesai, cukup jalankan `./run-demo.sh` dari root proyek. Skrip itu mengerjakan B4–B7 otomatis. Lihat [`RUNNING.md`](RUNNING.md).

### B1. Login ADC (sekali, ulangi kalau kredensial kedaluwarsa)

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project <PROJECT_ID>
```

Pastikan Vertex AI API aktif di project itu: `gcloud services enable aiplatform.googleapis.com --project=<PROJECT_ID>`. Project tim saat ini adalah `general-projects-510902`, dengan budget alert Rp150.000/bulan.

### B2. Isi `functions/.env`

```bash
cp functions/.env.example functions/.env
```

Isi minimal `GOOGLE_CLOUD_PROJECT=<PROJECT_ID>` dan `MOJI_MODEL=<nama model>`, misalnya `gemini-3.5-flash`. Pilih Gemini Flash terbaru yang tersedia di Vertex AI → Model Garden. Variabel lain sudah punya default yang benar, termasuk `MOJI_STORE=file`. `.env` dan `data/` sudah di-ignore git.

### B3. Buat kode undangan

```bash
cd functions
npm run invites -- create 10 --prefix R
```

Kode tersimpan di `functions/data/invites.json`. Penjelasan lengkap (prefix, list, revoke, batas harian) ada di [`RUNNING.md` → Persiapan langkah 4](RUNNING.md#4-buat-kode-undangan).

### B4. Jalankan server

Server melakukan build dulu, lalu mendengarkan di `localhost:8080`. Biarkan terminal ini terbuka.

```bash
cd functions
npm run dev:server
```

### B5. Sambungkan HP atau emulator ke server laptop

Nyalakan emulator yang kamu buat di Android Studio (lihat daftarnya dengan `$ANDROID_HOME/emulator/emulator -list-avds`), atau colok HP dengan USB debugging sampai `adb devices` menampilkannya. Lalu:

```bash
adb reverse tcp:8080 tcp:8080
```

Ulangi setiap HP dicabut-pasang atau emulator di-restart.

### B6. Arahkan app ke server

Isi `app/.env.local`:

```
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_DEV_TOOLS=1
```

Nilai `EXPO_PUBLIC_*` dibaca **saat build**. `EXPO_PUBLIC_DEV_TOOLS=1` memunculkan menu Alat tim; isi `0` untuk build yang dipegang responden.

### B7. Build dan pasang app secara lokal (tanpa EAS)

```bash
cd app
npx expo run:android --variant release
```

- Prasyarat build: `ANDROID_HOME` terisi, dan Java dari Android Studio (JBR). Kalau Gradle menolak versi JDK, arahkan `JAVA_HOME` ke JDK 17 atau 21.
- APK hasil build ada di `app/android/app/build/outputs/apk/release/`. Pasang ke HP lain dengan `adb install -r <file.apk>`.
- `app/android/` dihasilkan otomatis dan di-ignore git. Jangan diedit manual; `npx expo prebuild --clean` membuatnya ulang.
- APK release lokal ditandatangani dengan debug keystore bawaan template Expo. Cukup untuk demo. Kalau ingin memperbarui di tempat tanpa kehilangan data, build dari laptop (keystore) yang sama.
- **Izin HTTP cleartext:** aplikasi diizinkan memakai HTTP biasa (lewat plugin `expo-build-properties` di `app.json`) supaya bisa memanggil `http://localhost:8080`. Ini aman **hanya untuk demo lokal**, karena lalu lintasnya tidak keluar dari kabel USB/emulator. Kalau aplikasi nanti memanggil server online (bagian D), server itu harus HTTPS, dan izin cleartext sebaiknya dimatikan. Lihat bagian F.

### B8. Cek semuanya

```bash
curl -H "X-Moji-Invite: MOJI-R01-XXXX" http://localhost:8080/health   # harusnya {"valid":true}
```

Di aplikasi buka **Pengaturan → Bantuan AI** (atau onboarding langkah 3), pilih **Aktifkan**, lalu masukkan salah satu kode.

Catatan: server laptop hanya terjangkau lewat USB/emulator. Kalau responden memakai aplikasi di rumah masing-masing, backend harus online (bagian D).

---

## C. Evaluasi prompt

Wajib dijalankan sebelum demo atau rilis, dan setiap kali prompt atau model diganti.

```bash
cd functions
npm run eval        # memuat functions/.env; butuh ADC (B1)
```

- Perintah ini memanggil Gemini sungguhan dengan 32 catatan contoh: kasus berisiko (termasuk bahasa gaul dan bahasa daerah), kasus netral, dan kasus insight.
- Kasus berisiko diulang 3 kali, dan semuanya harus lolos.
- Exit code 1 berarti ada yang gagal. **Jangan dipakai sebelum lolos 32/32.**

---

## D. Opsional: backend online di Cloud Run

Hanya perlu kalau aplikasi dipakai di luar laptop, misalnya responden memakai MOJI di rumah selama studi. Untuk demo lokal, lewati bagian ini. Ganti `<PROJECT_ID>` dengan ID project GCP kalian.

### D1. Login dan pilih project

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>
```

### D2. Aktifkan API yang dibutuhkan

```bash
gcloud services enable \
  cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com aiplatform.googleapis.com firestore.googleapis.com
```

### D3. Buat Firestore (mode Native)

```bash
gcloud firestore databases create --location=asia-southeast2 --type=firestore-native
```

Firestore hanya menyimpan koleksi `invites` (kode undangan) dan `usage` (hitungan per hari).

### D4. Buat service account untuk function

```bash
gcloud iam service-accounts create moji-api --display-name="MOJI API"

SA=moji-api@<PROJECT_ID>.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding <PROJECT_ID> --member="serviceAccount:$SA" --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding <PROJECT_ID> --member="serviceAccount:$SA" --role="roles/datastore.user"
```

Cukup dua role itu, jangan tambah yang lain.

### D5. Budget alert dan logging

- Pasang budget alert: Cloud Console → **Billing → Budgets &amp; alerts → Create budget**. Pilih project, isi batas bulanan, ambang 50%/90%/100% dengan email. Batas harian di function (`MOJI_GLOBAL_LIMIT`) tetap menjadi pengaman utama.
- Pastikan logging request/response Vertex AI tidak aktif di project. Function sendiri tidak pernah menyimpan atau me-log isi catatan.

### D6. Deploy

```bash
cd functions
gcloud functions deploy api \
  --gen2 --runtime=nodejs24 \
  --region=asia-southeast2 \
  --source=. --entry-point=api \
  --trigger-http --allow-unauthenticated \
  --service-account=moji-api@<PROJECT_ID>.iam.gserviceaccount.com \
  --set-env-vars MOJI_STORE=firestore,MOJI_MODEL=<NAMA_MODEL>,MOJI_VERTEX_LOCATION=global,MOJI_PER_CODE_LIMIT=50,MOJI_GLOBAL_LIMIT=1000
```

- **`MOJI_STORE=firestore` wajib di Cloud Run.** Defaultnya `file`, dan file di Cloud Run hilang setiap instance di-restart.
- TypeScript otomatis dikompilasi di Cloud Build lewat script `gcp-build`.
- `--allow-unauthenticated` aman karena setiap request dijaga kode undangan.
- Simpan **URL hasil deploy** (HTTPS). URL itu menjadi `EXPO_PUBLIC_API_URL` di app.

| Env | Wajib | Default | Keterangan |
|---|---|---|---|
| `MOJI_STORE` | ya, di Cloud Run | `file` | `firestore` untuk Cloud Run |
| `MOJI_MODEL` | ya | – | Nama model Gemini |
| `MOJI_VERTEX_LOCATION` | tidak | `global` | Lokasi Vertex AI |
| `MOJI_PER_CODE_LIMIT` | tidak | `50` | Request per kode per hari (WIB) |
| `MOJI_GLOBAL_LIMIT` | tidak | `1000` | Request semua kode per hari (WIB) |
| `GOOGLE_CLOUD_PROJECT` | otomatis | – | Diisi otomatis oleh Cloud Run |

### D7. Kode undangan di Firestore

Kode untuk Cloud Run dibuat di Firestore, bukan di file lokal. Jalankan dari laptop dengan ADC aktif:

```bash
cd functions
MOJI_STORE=firestore npm run invites -- create 20 --prefix R
MOJI_STORE=firestore npm run invites -- list
MOJI_STORE=firestore npm run invites -- revoke MOJI-R07-XXXX
```

Cek backend setelah deploy:

```bash
MOJI_STORE=firestore npm run invites -- create 1 --prefix T      # kode uji
curl -i -H "X-Moji-Invite: MOJI-T01-XXXX" "<URL_FUNCTION>/health"
# 200 {"valid":true}; tanpa header atau kode salah: 401; kode dicabut: 403
MOJI_STORE=firestore npm run invites -- revoke MOJI-T01-XXXX
```

### D8. Hubungkan app ke backend online

Isi `EXPO_PUBLIC_API_URL=<URL_FUNCTION>` di `app/.env.local` (build lokal), atau di environment EAS (bagian E2), lalu build ulang. `EXPO_PUBLIC_*` ikut masuk ke dalam APK, jadi isinya bukan rahasia. Memang tidak ada rahasia apa pun di app.

---

## E. Opsional: build dan update lewat EAS

Hanya dipakai kalau APK dibangun di cloud EAS (bukan lokal seperti B7), atau kalau butuh update OTA selama studi. Jalankan semua perintah dari folder `app/`.

### E1. Login dan hubungkan project (sekali)

```bash
npx eas-cli@latest login
npx eas-cli@latest init                 # membuat project di expo.dev
npx eas-cli@latest update:configure     # menambah updates.url & projectId ke app.json
```

Commit perubahan `app.json` yang dihasilkan sebelum build pertama.

### E2. Isi environment EAS

```bash
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_API_URL --value <URL_FUNCTION> --visibility plaintext
```

Jangan isi `EXPO_PUBLIC_DEV_TOOLS` (atau isi `0`) di environment `preview`, karena alat tim tidak boleh muncul di HP responden. Untuk build tim, `EXPO_PUBLIC_DEV_TOOLS=1` boleh diisi di environment `development`.

### E3. Build APK untuk responden

```bash
npx eas-cli@latest build --profile preview --platform android
```

- Hasilnya APK yang bisa diunduh dari link expo.dev. Responden perlu mengizinkan "instal dari sumber tidak dikenal".
- `versionCode` naik otomatis setiap kali build.
- **Keystore dikelola EAS. Jangan dihapus atau diganti**, karena keystore yang berbeda membuat update tidak bisa dipasang di atas data lama. Package tetap `com.moji.journal`.

### E4. Development build (untuk tim)

```bash
npx eas-cli@latest build --profile development --platform android
```

Instal hasilnya di HP tim, lalu jalankan `npx expo start` seperti biasa.

### E5. Update selama studi berjalan

| Jenis perubahan | Caranya |
|---|---|
| Hanya kode JS/TS (bug, teks, tampilan) | **OTA update**, tanpa instal ulang: `npx eas-cli@latest update --channel preview --environment preview --message "perbaiki ..."` |
| Menambah atau mengubah library native, atau `app.json` | Naikkan `version` di `app.json`, build APK baru (E3), lalu bagikan lagi. Data responden aman selama keystore dan package sama. |
| Backend (prompt, limit, model) | Deploy ulang (D6), lalu `npm run eval` (C) |

`runtimeVersion` memakai policy `appVersion`. OTA hanya diterima build dengan `version` yang sama, jadi `version` wajib dinaikkan setiap ada perubahan native.

---

## F. Sebelum membagikan APK ke responden

Ikuti **[`release-checklist.md`](release-checklist.md)** sampai semua butir tercentang. Yang paling penting:
1. **Verifikasi nomor SEJIWA (119 ext 8) dan 112** di `app/src/features/safety/helpContacts.ts` ke sumber resmi, lalu ubah `verified: true`.
2. Cek judul sumber WHO di `docs/safety-phrases.md`.
3. Coba tombol telepon dan WhatsApp di support sheet dari HP sungguhan.
4. Pastikan `npm run eval` lolos 32/32.
5. Uji manual: offline, AI mati, kode salah, font terbesar, mode gelap, reduce motion, dan update APK di atas data lama.
6. Pastikan alat tim **tidak** muncul (`EXPO_PUBLIC_DEV_TOOLS=0`).
7. Kalau backend online (bagian D): pastikan URL-nya HTTPS, lalu tinjau ulang izin HTTP cleartext di `app.json` (plugin `expo-build-properties`). Matikan izin itu kalau aplikasi tidak lagi memanggil `http://localhost`.

---

## Troubleshooting

| Gejala | Kemungkinan penyebab |
|---|---|
| Onboarding selalu bilang "Koneksi lagi bermasalah" | `EXPO_PUBLIC_API_URL` kosong/salah (ingat: dibaca saat build), server mati, atau `adb reverse` hilang. Cek dengan `curl …/health`. |
| "Kodenya belum cocok" | Kode salah ketik atau belum dibuat di store yang dipakai (file vs Firestore). Cek dengan `npm run invites -- list`. |
| "Kode undanganmu sudah tidak aktif" | Kode dicabut (`revoke`). Buat kode baru untuk orang itu. |
| Fitur AI berhenti di siang/sore hari | Batas harian tercapai (`MOJI_PER_CODE_LIMIT` / `MOJI_GLOBAL_LIMIT`). Aplikasi otomatis kembali ke mode lokal. Hitungan reset pukul 00:00 WIB. |
| HP atau emulator tidak bisa konek ke server | Jalankan ulang `adb reverse tcp:8080 tcp:8080`, pastikan `npm run dev:server` masih jalan, lalu cek `curl http://localhost:8080/health` dari laptop. |
| Error kredensial Vertex (500, atau kredensial tidak ditemukan) | Ulangi B1, lalu pastikan `GOOGLE_CLOUD_PROJECT` dan `MOJI_MODEL` di `functions/.env` terisi. |
| Kode undangan hilang setelah deploy Cloud Run | `MOJI_STORE=firestore` belum diset di `--set-env-vars` (D6). |
| Deploy gagal saat build | Pastikan `typescript` dan `@types/node` masih ada di `devDependencies` `functions/`, dan `.gcloudignore` tidak mengecualikan `src/`. |
| Build Android gagal karena versi Java | Arahkan `JAVA_HOME` ke JDK 17/21, atau ke JBR bawaan Android Studio. |
| Notifikasi tidak muncul di Expo Go | Pakai build lokal (B7) atau development build (E4), dan pastikan izin notifikasi di HP aktif. |
| Update OTA tidak diterima | `version` di `app.json` build berbeda dengan update, atau channel bukan `preview`. |
