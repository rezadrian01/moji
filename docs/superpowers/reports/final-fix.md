# Final fix wave (review seluruh branch MOJI MVP)

Brief: `.superpowers/sdd/2026-10-31-moji-mvp/final-fix-brief.md`. Semua butir 1–9 dikerjakan dengan TDD: test ditulis dulu, dilihat gagal karena alasan yang benar, baru implementasi.

## Ringkasan per butir

### 1. Celah frasa safety lokal
- `safetyPhrases.ts`: slang baru `ngilang` -> `hilang` dan `buat` -> `untuk`. Frasa urgent baru: keinginan untuk tidak ada ("andai/seandainya/mending/lebih baik aku tidak ada", "kalau aku tidak ada (pasti) lebih baik", "lebih baik tanpa aku"), "tidak pernah lahir/dilahirkan", "tidak bangun lagi" (+ "tidak usah/mau bangun lagi"), "tidak ada alasan (lagi) untuk hidup", "akhiri/mengakhiri semuanya/semua ini", "ingin/mau semua(nya) berakhir", "ingin/mau pergi (untuk) selamanya", "surat perpisahan". Frasa concern baru: "ingin udahan", "mau udahan". "pengen ngilang" kena lewat frasa "ingin hilang" yang sudah ada, setelah slang `ngilang` dipetakan.
- Frasa disimpan dalam bentuk ternormalisasi. Test baru `phrase lists` memeriksa `normalizeText(p) === p` untuk setiap frasa. Tiga frasa lama diperbaiki karena tidak lolos: `cutting` -> `cuting`, `tidak sanggup lagi` -> `tidak sangup lagi`, `beban buat semua orang` -> `beban untuk semua orang`.
- "aku tidak ada" dan "semuanya berakhir" hanya memicu kalau ada kata keinginan sebelumnya. Jadi "aku ga ada waktu hari ini" dan "libur semester akhirnya berakhir" tetap `none`, dan ini ikut dites. Kasus netral dari brief juga tetap `none`.
- `docs/safety-phrases.md` diperbarui: peta slang, daftar frasa, aturan bentuk ternormalisasi, dan false positive yang diterima ("tidak bangun lagi" sengaja luas; "surat perpisahan" juga cocok untuk surat sekolah atau kantor).
- RED: `npx jest src/domain/safety.test.ts` -> `Tests: 15 failed, 145 passed`. Yang gagal: 12 kalimat brief bernilai `none`, test slang, serta frasa `cutting` dan `tidak sanggup lagi`. GREEN: `Tests: 192 passed`.

### 2. Catatan panjang kehilangan cek AI
- `functions/src/contract.ts`: batas `text` dinaikkan dari 5000 ke 20000. Batas body functions-framework jauh di atas ukuran ini.
- `postSave.ts`: ada `MAX_ANALYZE_TEXT_LENGTH = 20000`, dan `buildAnalyzeRequest` mempertahankan bagian akhir teks. Kalau potongan dimulai dari separuh pasangan surrogate (emoji), separuh itu dibuang. Safety lokal tetap memeriksa seluruh catatan.
- RED functions: `vitest run src/router.test.ts src/contract.test.ts` -> `2 failed | 26 passed`. Teks 20000 karakter ditolak; router mengembalikan 400 untuk 20000. GREEN: `132 passed`.
- RED app: `postSave.test.ts` -> `2 failed` (keep-end, emoji). GREEN: `26 passed`.

### 3. `useAiAllowed` reject kalau SecureStore gagal
- `getInviteCode()` dibungkus try/catch dan mengembalikan `false`.
- Test: hook resolve `false`. Insight on-demand (`InsightSection`) dan insight mingguan (`useWeeklyInsightOnForeground`) tetap dibuat dengan `source: 'local'` saat AI aktif tetapi SecureStore melempar error.
- RED: `3 failed, 24 passed`. GREEN: `27 passed`.

### 4. Pending safety turun dari urgent ke concern
- Upsert `addPendingSafety` sekarang memakai `CASE WHEN pending_safety.level = 'urgent' THEN 'urgent' ELSE excluded.level END`.
- RED: `never downgrades: urgent then concern...` gagal (`Received concern`). GREEN: `19 passed`.

### 5. Kode undangan tidak valid saat dipakai
- `AppSettings.aiCodeProblem: 'invalid' | 'revoked' | null`, default `null` di `DEFAULT_SETTINGS`.
- `features/ai/inviteProblem.ts` berisi `noteInviteProblem(db, reason)` (401 -> `invalid`, 403 -> `revoked`, alasan lain diabaikan) dan `INVITE_PROBLEM_TEXT`. Fungsi ini dipanggil dari `postSave.runAi` (analyzeEntry) dan `insights/generate.ts` (writeInsight). `aiEnabled` dan `aiConsentAt` tidak disentuh.
- `settings/ai` menampilkan satu kalimat biasa: "Kode undanganmu sudah tidak aktif. MOJI tetap jalan tanpa AI. Kamu bisa memasukkan kode baru kapan saja." Untuk kode tidak valid: "Kode undanganmu belum cocok. MOJI tetap jalan tanpa AI. Kamu bisa memasukkan kode baru kapan saja." Penanda dihapus di `onValid`, setelah `InviteCodeForm` menyimpan kode valid.
- RED: `8 failed, 41 passed` (postSave 3, generate 2, AiSettings 3), plus error typecheck karena field belum ada. GREEN: `55 passed`.

### 6. Variasi teks pengingat harian
- Pengingat harian sekarang berupa 7 trigger `WEEKLY` (weekday expo 1–7, 1 = Minggu, sesuai dokumentasi SDK 58), masing-masing dengan teks dari `DAILY_MESSAGES[(iso-1) % n]`. `DAILY_MESSAGES` ditambah 2 kalimat hangat sehingga ada 7 teks berbeda. Cancel tetap dijalankan sekali sebelum semua penjadwalan.
- Test: 7 jadwal, semua weekday 1–7, jam 20:30, 7 teks berbeda, tanpa `FORBIDDEN_WORDS`, `PRESSURE_WORDS`, atau copy rasa bersalah, dan cancel dipanggil sebelum setiap penjadwalan. `RemindersScreen.test` disesuaikan ke `type: 'weekly'`.
- RED: `3 failed` (scheduler 2, messages 1). GREEN: `19 passed`.

### 7. Back stack setelah "Hapus semua data"
- `router.dismissAll()` tersedia di expo-router SDK 58 (`InternalRouter.dismissAll`, dicek di tipe yang terpasang dan dokumentasi v58). Sekarang dipanggil sebelum `router.replace('/onboarding')`, dijaga `router.canDismiss()` supaya tidak ada aksi POP_TO_TOP yang tidak tertangani.
- Test: `dismissAll` dipanggil sebelum `replace` (`invocationCallOrder`), dan tidak dipanggil kalau `canDismiss()` false.
- RED: `1 failed`. GREEN: `9 passed`.

### 8. `app/eas.json`
- `environment: "development"` / `"preview"` per profil.
- `cli.appVersionSource: "remote"` dan `autoIncrement: true` di profil `preview`. Di Android, nilai `true` menaikkan `versionCode` (dokumentasi eas.json dan app-versions). Dengan sumber remote, EAS menyimpan dan menaikkan versinya tanpa perlu commit balik.
- `docs/release-checklist.md` bagian 4 dan uji N/N+1 diperbarui.
- RED `releaseConfig.test.ts`: `2 failed`. GREEN: `6 passed`.

### 9. Quick win support sheet
- Saat urgent, SEJIWA menjadi tombol primer dan 112 tombol sekunder (urutan `NATIONAL_SERVICES` = prioritas).
- Deskripsi 112: "Kalau kamu butuh bantuan segera".
- Kalau `Linking.openURL` gagal untuk tautan `tel:`, muncul "Belum bisa membuka teleponnya. Nomornya ada di atas, ya." (live region polite) di bawah bagian tempat tombol itu ditekan.
- "MOJI bukan layanan darurat." di sheet dipindah ke luar ScrollView, tepat di atas tombol tutup, sebagai teks body normal. Di `/help`, `SupportContent` tetap menampilkannya, sekarang juga sebagai teks normal.
- RED: `5 failed` (variant, deskripsi, pesan gagal, posisi disclaimer, helpContacts). GREEN: `55 passed`.

## File yang diubah
- app: `src/domain/{safetyPhrases.ts,safety.test.ts,types.ts}`, `src/features/entry/{postSave.ts,postSave.test.ts}`, `src/features/app/{useAiAllowed.ts,useAiAllowed.test.tsx}`, `src/features/insights/{generate.ts,generate.test.ts,InsightSection.test.tsx,useWeeklyInsight.test.tsx}`, `src/db/{pendingSafetyRepo.ts,repos.test.ts}`, `src/features/ai/{inviteProblem.ts (baru),AiSettings.test.tsx}`, `src/app/settings/{ai.tsx,privacy.tsx}`, `src/features/reminders/{scheduler.ts,scheduler.test.ts,messages.ts,messages.test.ts}`, `src/features/settings/{PrivacyScreen.test.tsx,RemindersScreen.test.tsx}`, `src/features/safety/{SupportSheet.tsx,SupportSheet.test.tsx,helpContacts.ts,helpContacts.test.ts}`, `eas.json`, `src/__tests__/releaseConfig.test.ts`
- functions: `src/contract.ts`, `src/contract.test.ts`, `src/router.test.ts`
- docs: `docs/safety-phrases.md`, `docs/release-checklist.md`, laporan ini

## Hasil akhir
- app `npx jest`: 58 suites, 666 tests passed, 0 console.warn/error. `npm run typecheck` bersih. `npm run lint` bersih.
- functions `npm test`: 12 files, 132 tests passed. `npm run typecheck` bersih. Tidak ada skrip lint di `functions/`.

## Concern
- Butir 5, `health`: `checkInvite` hanya dipanggil dengan kode *calon* di `InviteCodeForm`. Penolakannya sudah tampil sebagai pesan di form, dan kode tersimpan tidak berubah. Karena itu penolakan ini sengaja tidak mengisi `aiCodeProblem`; mengisinya akan menampilkan "kode belum cocok" padahal kode lama masih berlaku. Penanda juga tidak dihapus otomatis saat request berikutnya sukses; penanda hanya hilang saat kode valid baru disimpan, sesuai brief.
- Butir 9: pesan gagal hanya untuk tautan `tel:`, karena kalimatnya menyebut "telepon". Kegagalan WhatsApp atau situs tetap diam seperti sebelumnya.
- Butir 1: "tidak bangun lagi" dan "surat perpisahan" sengaja luas (prinsip konservatif) dan didokumentasikan sebagai false positive yang diterima. Frasa ditulis dalam bentuk ter-collapse ("cuting", "sangup"); test menjaga konsistensinya.
- Butir 8: `appVersionSource: "remote"` mengubah cara versi dikelola. Build pertama mengambil nilai awal di EAS; `eas build:version:set` opsional.
