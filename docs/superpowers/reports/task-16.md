# Task 16: Pipeline setelah simpan (safety + AI)

## Yang dibangun
`app/src/features/entry/postSave.ts`:

- `buildAnalyzeRequest(entry)` mengembalikan `null` kalau note kosong atau hanya whitespace. Kalau tidak, isinya `{ text (trim), mood, options }`. `options.contexts` level kategori (`ContextCategory` id + label), `experiences` = semua tag `EXPERIENCES` (flatten), `copings` = `COPINGS`.
- `runPostSave(entry, deps)`:
  1. **Lokal, di-await:** `level = maxRisk(checkLocalSafety(note), isWorsening(listEntries 7 hari terakhir, now, settings.lastWorseningPromptAt) ? 'concern' : 'none')`. Level dibandingkan dengan `safetyShownLevel` yang **dibaca ulang dari DB** (fallback ke entry yang dioper kalau baris sudah tidak ada). Kalau lebih tinggi: `showSupport(level, id)` lalu `updateEntry({ safetyShownLevel })`. Kalau pola memburuk ikut aktif saat sheet tampil, `updateSettings({ lastWorseningPromptAt: toLocalIso(now) })` juga dijalankan.
  2. **AI di latar:** hanya kalau request ada dan `aiAllowed()`. `aiTask` dibungkus try/catch dan tidak pernah reject. Hasil `ok: false` atau throw (misalnya SecureStore) diabaikan tanpa pesan. Saat respons `ok`:
     - `getEntry` ulang; kalau catatan sudah dihapus, berhenti.
     - `aiAllowed()` ulang; kalau AI sudah mati, berhenti (saran dan risiko tidak disimpan).
     - Kalau `note` belum berubah sejak request: `pendingSuggestions` diisi id yang **ditawarkan** dan **belum ada** di catatan (konteks per kategori, pengalaman/coping per tag), tanpa duplikat. Kalau tidak ada yang tersisa, nilainya `null`. Kalau `updateEntry` mengembalikan `null` (catatan terhapus), berhenti.
     - Kalau `note` sudah diedit: saran basi dibuang, tapi risiko tetap dihitung (lebih aman terlalu sensitif).
     - Kalau `riskLevel` lebih tinggi dari `safetyShownLevel` terbaru: saat `isAppActive()` (dicek ketika respons datang) → `showSupport` lalu update `safetyShownLevel`. Kalau tidak aktif → `addPendingSafety`, lalu cek ulang catatannya. Kalau catatan terhapus tepat di sela itu, baris `pending_safety`-nya dihapus supaya tidak ada penanda yatim.

## Bukti TDD
RED 1 (modul belum ada): `npm test -- src/features/entry/postSave.test.ts`
```
Cannot find module './postSave' from 'src/features/entry/postSave.test.ts'
Test Suites: 1 failed, 1 total
```
RED 2 (stub dengan signature saja, mengembalikan null/'none'):
```
● runPostSave: local safety › shows urgent support right away, before the AI task settles, and stores the level
    Expected: "urgent"  Received: "none"
● runPostSave: AI task › stores pending safety without a sheet when AI raises the risk while the app is in background
    Expected: {"entryId": "...", "level": "concern"}  Received: null
● runPostSave: AI task › stores only suggestions not already on the entry
    Expected: {"contexts": ["finansial"], "copings": ["coping.menulis"], "experiences": ["fisik.lelah"]}  Received: null
... (14 failed, 8 passed, 22 total)
```
Ke-8 test yang lulus pada stub adalah test negatif/guard. Setelah GREEN, masing-masing dibuktikan lewat **mutasi**: guard dihapus, lalu test terkait harus gagal.
```
hapus recheck aiAllowed()                 -> ● when AI gets disabled before the response: nothing is stored
pakai entry.safetyShownLevel (bukan DB)   -> ● compares against the level currently stored, not the possibly stale entry passed in
hapus filter id yang ditawarkan           -> ● drops suggested ids that were not offered ...
hapus trim() di buildAnalyzeRequest       -> ● returns null for an entry without text or with only whitespace
hapus aiAllowed() di awal                 -> ● does not call the AI when AI is not allowed
hapus cek note berubah                    -> ● when the note was edited before the response: stale suggestions are dropped ...
hapus updateSettings lastWorseningPromptAt -> ● worsening pattern › shows concern support and records lastWorseningPromptAt
hapus `if (!fresh) return`                -> lolos (akses fresh.note throw dan tertangkap try/catch; guard tetap wajib untuk tsc)
```
RED 3 (race hapus-saat-insert pending, cleanup dimatikan sementara):
```
● runPostSave: AI task › when the entry is deleted right as pending safety is written: no orphan pending safety
    Received: {"entryId": "72d4f23d-...", "level": "urgent"}
Tests: 1 failed, 22 passed, 23 total
```
GREEN:
```
npm test -- src/features/entry/postSave.test.ts
Tests:       23 passed, 23 total
```

## Cakupan test (`postSave.test.ts`, sql.js in-memori, `@jest-environment node`, mock `expo-crypto` per file)
- Teks kosong/whitespace → request null; isi options (konteks level kategori).
- "pengen mati aja" → `showSupport('urgent')` dan `safetyShownLevel` tersimpan **sebelum** AI (deferred) selesai.
- Tanpa teks → AI tidak dipanggil, `aiTask` null; AI tidak diizinkan → AI tidak dipanggil.
- Review Focus 5: edit teks concern saat level sudah concern → tanpa sheet; teks urgent → sheet.
- Level dibandingkan dengan nilai di DB, bukan objek entry yang basi.
- Pola memburuk → `showSupport('concern')` + `lastWorseningPromptAt` = now. Cooldown 72 jam dan di bawah ambang → tidak ada apa-apa.
- AI concern setelah lokal urgent → tidak ada sheet kedua dan tidak ada pending.
- AI menaikkan risiko saat aktif → sheet + level tersimpan. Saat latar → `pending_safety`, tanpa sheet. Status aktif dibaca saat respons datang.
- Saran hanya id baru. Id yang tidak ditawarkan dibuang, dan kalau tidak ada yang tersisa, `null`.
- Review Focus 2: catatan dihapus sebelum respons → tanpa pending, tanpa error. Dihapus tepat setelah insert pending → tanpa penanda yatim. AI dimatikan sebelum respons → tidak ada yang disimpan. Note diedit sebelum respons → saran basi dibuang, risiko tetap.
- AI `timeout`, `network`, dan throw → catatan tidak berubah, `aiTask` resolve tanpa error.

## File
- Create `app/src/features/entry/postSave.ts`
- Create `app/src/features/entry/postSave.test.ts`
- Create `docs/superpowers/reports/task-16.md`

## Hasil verifikasi
- `npm test`: 22 suite, 235 test lulus.
- `npm run typecheck`: bersih.
- `npm run lint`: bersih.

## Concern
1. **Cleanup pending yatim memakai SQL langsung** (`DELETE FROM pending_safety WHERE entry_id = ?`) di `postSave.ts`, karena `pendingSafetyRepo` belum punya fungsi hapus per entry dan file itu di luar daftar `Files:`. Kalau ingin rapi, nanti bisa dipindah ke `removePendingSafety(db, entryId)` di repo.
2. **Saran basi saat edit:** kalau `note` berubah sebelum respons, saran dibuang tapi risiko tetap dipakai. Ini tafsiran saya atas Review Focus 2 ("diedit"), dengan sikap §6.9 bahwa terlalu sensitif lebih aman.
3. **Id saran yang tidak ditawarkan disaring juga di klien** (selain guardrail server Task 11/13), supaya chip tidak menampilkan id mentah.
4. **`lastWorseningPromptAt` hanya diset kalau sheet benar-benar tampil.** Contohnya, kalau catatan sudah berlevel concern, tidak ada prompt baru dan cooldown tidak dimulai.
5. **Error DB di langkah lokal tidak ditangkap** (dilempar ke pemanggil). Pemanggil (Task 17) sebaiknya tidak memblokir navigasi kalau `runPostSave` gagal, karena catatan sudah tersimpan.
6. Penulisan `pendingSuggestions`/`safetyShownLevel` oleh pipeline ikut memperbarui `updatedAt`, sesuai perilaku `updateEntry`.
