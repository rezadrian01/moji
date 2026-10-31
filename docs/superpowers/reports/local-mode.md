# Laporan: mode demo lokal

## Yang dibangun
- `functions/src/invites/fileStore.ts`: `FileInviteStore` (satu file JSON `{invites, usage}`, tulis atomik temp+rename, operasi diserialkan lewat antrian promise, file belum ada = kosong, folder induk dibuat otomatis).
- `functions/src/invites/createStore.ts`: `createInviteStore(env)`; `MOJI_STORE=file` (default, `MOJI_INVITES_FILE` default `data/invites.json`), `firestore`, selain itu error jelas. `index.ts` dan CLI `admin/invites.ts` memakainya.
- `functions/.env.example`, `.gitignore` dan `.gcloudignore` (`.env`, `data/`), script `dev:server` (tsc lalu `node --env-file-if-exists=.env` menjalankan functions-framework CLI, target `api`), `invites` dan `eval` memuat `.env` yang sama.
- `app`: `expo-build-properties` (~58.0.11) dengan `android.usesCleartextTraffic: true` (nama opsi dicek di dokumentasi SDK 58).
- Dokumen: SETUP.md (bagian demo lokal, Cloud Run jadi opsional, troubleshooting), spec (bagian di §4), release-checklist, functions/README.

## Bukti TDD
- RED functions: `storeContract.test.ts` dan `createStore.test.ts` gagal karena `./fileStore.js` / `./createStore.js` belum ada ("Test Files 2 failed | 2 passed"). GREEN setelah implementasi: 4 file, 34 test lulus.
- RED deploy config: 4 test baru di `deploy.test.ts` gagal (`.env.example` tidak ada, ignore, script, createInviteStore). GREEN: seluruh suite 159 test lulus.
- RED app: `releaseConfig.test.ts` "Expected: true, Received: undefined" untuk `usesCleartextTraffic`. GREEN setelah plugin ditambah: 667 test lulus.
- Kontrak perilaku yang sama dijalankan ke `MemoryInviteStore` dan `FileInviteStore` (`describe.each`); persistensi lintas instance; 50 consume paralel = hitungan tepat 50 dan JSON valid; batas dihormati saat paralel.

## Hasil
- functions: `npm test` 159 lulus, `npm run typecheck` dan `npm run build` bersih.
- app: `npm test` 667 lulus (58 suite), typecheck, lint, `npx expo-doctor` 20/20.
- Smoke manual: `npm run dev:server` dengan `.env` sementara, `curl -H "X-Moji-Invite: <kode>" /health` menjawab `{"valid":true}`; tanpa header 401.

## Log
Store file tidak melakukan logging sama sekali; test log yang ada tetap lulus. Kode dan teks asli tidak masuk log.

## Concern
- Store file hanya aman untuk satu proses (sesuai brief).
- Panggilan Vertex sungguhan (ADC) tidak diuji di sini; smoke hanya `/health`.
- `EXPO_PUBLIC_API_URL` dibaca saat build, jadi APK preview perlu env EAS `preview` berisi `http://localhost:8080` (dicatat di SETUP).
- `npm ci` di app memberi peringatan install-scripts (unrs-resolver), bukan kegagalan.

## Follow-up: build lokal tanpa EAS
Hanya dokumen. SETUP.md "Mode demo lokal" langkah 7 sekarang `npx expo run:android --variant release` (prasyarat ANDROID_HOME/JAVA_HOME, lokasi APK, `adb install -r`, catatan debug keystore, `app/android` generated). Bagian 10-11 dipindah di bawah judul "Opsional: build lewat EAS" (isi tetap). Checklist demo lokal memuat perintah build lokal. Tidak ada perubahan kode; test tidak dijalankan ulang.
