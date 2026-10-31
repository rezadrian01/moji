# MOJI: panduan kerja untuk Claude dan subagent

MOJI adalah aplikasi jurnal dan mood tracker yang ramah kesehatan mental. Platformnya Android, dibangun dengan Expo, dan AI-nya memakai Gemini di Vertex AI lewat backend `functions/`.

- **Spec (sumber kebenaran):** `docs/superpowers/specs/2026-10-31-moji-design.md`
- **Plan implementasi:** `docs/superpowers/plans/` (MVP sudah selesai seluruhnya)
- **Cara menjalankan:** `./run-demo.sh` di root proyek, panduannya di `docs/RUNNING.md`. Setup lengkap ada di `docs/SETUP.md`.

## Status deployment saat ini: mode demo lokal

Keputusan tim 31 Okt 2026:
- Demo lewat emulator Android Studio atau HP USB.
- Backend dijalankan di laptop (`npm run dev:server` di `functions/`, port 8080), dan HP/emulator mengaksesnya lewat `adb reverse tcp:8080 tcp:8080`.
- Vertex AI diakses dengan ADC developer. Project: `general-projects-510902`, model `gemini-3.5-flash`.
- Kode undangan disimpan di file `functions/data/invites.json` (`MOJI_STORE=file`).
- APK release dibangun lokal dengan `npx expo run:android --variant release`. EAS dan Cloud Run tetap tersedia sebagai opsi (lihat `docs/SETUP.md` bagian D dan E).
- Izin HTTP cleartext Android aktif hanya demi `http://localhost`. Tinjau ulang sebelum ada server online.

## Struktur repo

| Folder | Isi |
|---|---|
| `app/` | Aplikasi Expo SDK 58 (TypeScript, expo-router). Route ada di `app/src/app/`, kode lain di `app/src/`. **Baca `app/AGENTS.md` sebelum menyentuh API Expo/RN.** `app/android/` dihasilkan prebuild (di-ignore). |
| `functions/` | Backend Node 24 + TypeScript (functions-framework): router `/health`, `/analyzeEntry`, `/writeInsight`, klien Gemini/Vertex, guardrail, kode undangan (`file` atau `firestore`), eval prompt (`eval/`). |
| `functions/src/admin/` | CLI kode undangan (`npm run invites -- create/list/revoke` di `functions/`). |
| `contract/fixtures/` | Contoh request/response API yang diuji di kedua sisi. |
| `docs/` | `RUNNING.md`, `SETUP.md`, `release-checklist.md`, `safety-phrases.md`, `manual/` (PDF manual dan katalog UI). |
| `docs/superpowers/` | Spec, plan, laporan task. |

Rahasia dan data lokal yang **tidak pernah di-commit**: `functions/.env`, `functions/data/`, `app/.env.local`, `.run/`.

## Perintah

Dari `app/`:

```bash
npm test -- <path-atau-pola>   # test terfokus
npm test                       # seluruh suite
npm run typecheck
npm run lint
npx expo install <pkg>         # SELALU dipakai untuk dependency, bukan npm install <pkg>
```

Dari `functions/`:

```bash
npm test                       # vitest (tidak pernah memanggil Vertex sungguhan)
npm run typecheck
npm run eval                   # eval prompt ke Vertex sungguhan; wajib 32/32 setelah mengubah prompt/model
```

## Aturan wajib

1. **TDD.** Tulis test yang gagal dulu (RED), lalu implementasi minimal (GREEN), lalu refactor. Bukti RED dan GREEN dicatat di laporan task.
2. **Spec menang.** Kalau plan bertentangan dengan spec, spec yang berlaku. Laporkan konfliknya; jangan diam-diam memilih.
3. **Privasi.** Teks jurnal tidak pernah disimpan di server dan tidak pernah di-log. Tidak boleh ada rahasia atau API key di dalam aplikasi.
4. **Bahasa produk.** Teks UI dalam Bahasa Indonesia, menyapa dengan "kamu", nada hangat, tidak menghakimi, tidak mendiagnosis. Ikuti spec §8 dan §7.3.
5. **Selesai berarti:** test terfokus dan seluruh suite hijau, `typecheck` dan `lint` bersih, lalu di-commit.
6. **Safety lokal dan prompt:** setiap perubahan di `app/src/domain/safety*.ts` atau `functions/src/ai/prompts.ts` harus diikuti `npm run eval` (32/32) dan memperbarui `docs/safety-phrases.md`.

## Alur pengembangan: TDD + subagent paralel

Proyek ini **sengaja mengizinkan beberapa implementer berjalan paralel**. Ini berbeda dari default superpowers:subagent-driven-development, yang melarang implementer paralel. Paralel aman karena setiap implementer bekerja di **git worktree terpisah** dan file yang disentuh tiap task tidak saling tumpang tindih.

Aturan untuk controller (sesi utama):

1. **Plan menandai tiap task** dengan `Files:` (file yang boleh disentuh) dan `Depends on:` (task prasyarat). Task dalam satu *batch* paralel tidak boleh berbagi file.
2. **Perubahan dependency (`package.json`/lockfile), konfigurasi bersama (`app.json`, `tsconfig.json`), dan tipe atau skema bersama dikerjakan di task serial tersendiri** sebelum batch paralel dimulai.
3. **Dispatch satu batch dalam satu pesan.** Pilih agent sesuai area:
   - `moji-app-implementer` untuk `app/`;
   - `moji-functions-implementer` untuk `functions/` dan `scripts/`.

   Keduanya berjalan di worktree sendiri (`isolation: worktree`). Tentukan `model` secara eksplisit.
4. **Setiap task yang selesai di-review oleh `moji-task-reviewer`** (kesesuaian spec + kualitas + bukti TDD). Task yang menyentuh UI, teks, notifikasi, insight, atau prompt AI juga di-review oleh `moji-wellbeing-reviewer`. Review dari beberapa task boleh berjalan paralel.
5. **Temuan review:** lanjutkan implementer yang sama lewat SendMessage di worktree-nya. Jangan buat implementer baru kecuali sudah eskalasi.
6. **Worktree agent bercabang dari `main`**, bukan dari HEAD sesi. Jadi task yang bergantung pada batch sebelumnya baru boleh di-dispatch setelah batch itu di-merge ke `main`.
7. **Merge ke `main` dilakukan serial oleh controller,** satu branch task per giliran. Setelah tiap merge, jalankan seluruh suite + typecheck + lint. Kalau merah, perbaiki sebelum merge berikutnya.
8. Laporan task ditulis ke `docs/superpowers/reports/<task-id>.md`.
