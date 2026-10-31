# Cara Menjalankan MOJI

Panduan cepat untuk menjalankan MOJI di laptop untuk demo, di emulator Android Studio atau HP Android lewat USB. Panduan lengkap dari nol (termasuk opsi Cloud Run/EAS) ada di [`SETUP.md`](SETUP.md).

```
HP / emulator ──(adb reverse :8080)──► laptop: server MOJI (port 8080) ──► Gemini di Vertex AI
     aplikasi MOJI (APK release)              kode undangan di functions/data/
```

---

## Cara tercepat: satu perintah

Dari folder root proyek:

```bash
./run-demo.sh
```

Skrip ini otomatis:
1. mengecek prasyarat (Node, Android SDK, `functions/.env`, kredensial Google);
2. memasang dependency kalau `node_modules` belum ada;
3. menyalakan **server lokal** di `http://localhost:8080` (log di `.run/server.log`);
4. menyalakan **emulator** (AVD pertama yang ada), kecuali sudah ada device yang tersambung;
5. menjalankan `adb reverse tcp:8080 tcp:8080`, supaya aplikasi di HP/emulator bisa memanggil server di laptop;
6. **build APK release** kalau belum ada (pertama kali ±10–15 menit), lalu memasangnya;
7. membuka aplikasi MOJI.

Tekan **Ctrl+C** untuk berhenti. Server lokal ikut dimatikan, sedangkan emulator tetap menyala.

| Opsi | Kegunaan |
|---|---|
| `./run-demo.sh --rebuild` | Build ulang APK. Pakai setelah ada perubahan kode di `app/`. |
| `./run-demo.sh --no-emulator` | Pakai HP yang tersambung USB. Jangan nyalakan emulator. |
| `./run-demo.sh --avd NAMA` | Pilih emulator tertentu. Lihat daftarnya dengan `~/Android/Sdk/emulator/emulator -list-avds`. |
| `./run-demo.sh --stop` | Matikan server lokal yang dijalankan skrip ini dari terminal lain. |
| `./run-demo.sh --help` | Tampilkan bantuan. |

---

## Persiapan sekali saja

Lakukan bagian ini sekali di laptop baru. Kalau sudah pernah, lewati ke [Cara tercepat](#cara-tercepat-satu-perintah).

### 1. Software
- **Node.js 24+** dan npm.
- **Android Studio** beserta Android SDK. `ANDROID_HOME` mengarah ke folder SDK (biasanya `~/Android/Sdk`).
- Minimal satu **emulator (AVD)** dari Android Studio → Device Manager, **atau** HP Android dengan **USB debugging** aktif.
- **Google Cloud CLI (`gcloud`)**, untuk fitur AI.

### 2. Login Google untuk AI (Vertex)

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project <PROJECT_ID>
```

Project yang dipakai tim saat ini: `general-projects-510902`, dengan Vertex AI aktif dan budget alert Rp150.000/bulan.

### 3. Isi `functions/.env`

```bash
cp functions/.env.example functions/.env
```

Lalu isi minimal:

```
MOJI_MODEL=gemini-3.5-flash
GOOGLE_CLOUD_PROJECT=<PROJECT_ID>
```

Variabel lain sudah punya nilai default yang benar.

### 4. Buat kode undangan

```bash
cd functions
npm install                                   # kalau belum
npm run invites -- create 10 --prefix R       # 10 kode responden, dicetak sebagai CSV
npm run invites -- create 1 --prefix T        # 1 kode uji untuk tim
npm run invites -- list
```

Contoh keluaran `create`:

```
label,code
R01,MOJI-R01-TFHV
R02,MOJI-R02-8KQM
```

**Arti opsi dan perilakunya:**
- **Angka** adalah jumlah kode yang dibuat.
- **`--prefix`** adalah huruf penanda kelompok (default `R`). Contohnya `R` untuk responden dan `T` untuk tim atau uji.
- Nomor urut **melanjutkan** kode yang sudah ada, jadi menjalankan `create` lagi tidak membuat kode yang bentrok.
- Kode tersimpan di `functions/data/invites.json`. File ini di-gitignore dan **tidak pernah di-commit**.
- Server membaca ulang file itu di setiap request, jadi kode baru **langsung bisa dipakai tanpa restart server**.
- Untuk mode demo lokal (`MOJI_STORE=file`) **tidak perlu login Google**. Cukup `functions/.env` yang sudah terisi.

**Perintah lain:**

```bash
npm run invites -- list                    # semua kode, status aktif, dan pemakaian hari ini
npm run invites -- revoke MOJI-R12-XXXX    # nonaktifkan satu kode (bocor / tidak dipakai)
```

Kode yang dicabut langsung ditolak server. Pemakainya melihat pesan "Kode undanganmu sudah tidak aktif", dan aplikasi tetap jalan tanpa AI.

**Aturan dan tips:**
- Satu kode untuk satu orang.
- Batas pemakaian AI: **50 request per kode per hari** dan **1.000 request per hari untuk semua kode**. Hitungan reset pukul 00:00 WIB. Batas ini bisa diubah lewat `MOJI_PER_CODE_LIMIT` dan `MOJI_GLOBAL_LIMIT` di `functions/.env`.
- Simpan daftar "kode → siapa" **di luar repo**, misalnya langsung ke file pribadi:
  ```bash
  npm run invites -- create 5 --prefix R >> ~/moji-private/kode-responden.csv
  ```

### 5. (Opsional) `app/.env.local`

Kalau file ini belum ada, `run-demo.sh` membuatnya otomatis:

```
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_DEV_TOOLS=1      # 1 = menu "Alat tim (data contoh)" tampil; isi 0 untuk build responden
```

Nilainya dibaca **saat build**. Kalau diubah, jalankan `./run-demo.sh --rebuild`.

---

## Menjalankan manual (tanpa skrip)

Pakai cara ini kalau ingin mengontrol tiap langkah. Gunakan beberapa terminal.

```bash
# Terminal 1: server lokal
cd functions
npm run dev:server                 # http://localhost:8080

# Terminal 2: emulator (atau colokkan HP via USB)
~/Android/Sdk/emulator/emulator -avd Medium_Phone_API_37.0

# Terminal 3: hubungkan device ke laptop, lalu build & pasang aplikasi
adb reverse tcp:8080 tcp:8080      # ulangi setiap HP dicabut-pasang / emulator di-restart
cd app
npx expo run:android --variant release
```

Cek server dengan kode uji:

```bash
curl -H "X-Moji-Invite: MOJI-T11-XXXX" http://localhost:8080/health
# {"valid":true} artinya server dan kode beres
```

### Mode pengembangan (hot reload)
Untuk mengubah tampilan sambil melihat hasilnya langsung, tanpa build release:

```bash
cd app
npx expo run:android      # build debug sekali, lalu Metro jalan dengan hot reload
```

---

## Setelah aplikasi terbuka (alur demo)
1. **Onboarding:** Lanjut → Lanjut → *Aktifkan* AI → masukkan kode undangan → *Cek kode* → (opsional) pengingat → *Mulai*.
2. **Beranda:** ketuk mood → *Simpan* → *Ceritain lebih* untuk menambah konteks, perasaan, coping, dan tulisan.
3. **Saran AI** muncul beberapa detik kemudian di halaman catatan.
4. Untuk menunjukkan **insight** dan **statistik** tanpa menunggu seminggu, buka **Pengaturan → Alat tim (data contoh)** → *Isi data contoh* → *Buat insight mingguan sekarang*, lalu buka tab **Polaku**.
5. Untuk mengulang dari awal: **Pengaturan → Privasi & data → Hapus semua data** (ketik `HAPUS`).

Penjelasan lengkap tiap layar ada di `docs/manual/MOJI-Manual-Book.pdf` dan `docs/manual/MOJI-Katalog-UI.pdf`.

---

## Menjalankan test

```bash
cd app && npm test && npm run typecheck && npm run lint
cd functions && npm test && npm run typecheck
cd functions && npm run eval      # evaluasi prompt ke Vertex sungguhan (butuh ADC); target 32/32 lolos
```

---

## Troubleshooting

| Gejala | Solusi |
|---|---|
| `functions/.env belum ada` | Ikuti [Persiapan langkah 3](#3-isi-functionsenv). |
| "Kredensial Google (ADC) belum aktif" | `gcloud auth application-default login`. Aplikasi tetap jalan, tapi tanpa AI. |
| Onboarding: "Koneksi lagi bermasalah" | Server mati atau `adb reverse` hilang. Jalankan ulang `./run-demo.sh` atau `adb reverse tcp:8080 tcp:8080`. |
| "Kodenya belum cocok" | Kode salah atau belum dibuat. Cek dengan `cd functions && npm run invites -- list`. |
| AI tidak memberi saran / insight memakai kalimat lokal | Cek `.run/server.log`. Biasanya ADC kedaluwarsa (login ulang) atau `MOJI_MODEL` salah. |
| Port 8080 sudah dipakai program lain | Matikan program itu, atau ubah `PORT` di `functions/.env` **dan** `EXPO_PUBLIC_API_URL` di `app/.env.local`, lalu `--rebuild`. |
| Build gagal karena versi Java | Arahkan `JAVA_HOME` ke JDK 17/21, atau ke JBR bawaan Android Studio. Lihat `.run/build.log`. |
| Perubahan kode tidak muncul di aplikasi | Jalankan `./run-demo.sh --rebuild`. |
| Emulator tidak muncul | Buat AVD di Android Studio → Device Manager, atau pilih AVD lain dengan `--avd NAMA`. |
