# Task 18: Beranda & alur mencatat

## Yang dibangun

- **Beranda** (`app/src/app/(tabs)/index.tsx`): sapaan sesuai jam lokal (<11 "Selamat pagi", <15 "Selamat siang", <18 "Selamat sore", selain itu "Selamat malam"), judul "Gimana perasaanmu sekarang?", `MoodPicker` yang langsung membuka `entry/new?mood=N`, kartu "Insight terbaru" (`latestInsight`, hanya kalau ada, membuka `/insight/[id]`), dan tombol "Butuh bantuan?" ke `/help` (1 tap). Animasi masuk memakai `useCalmMotion`.
- **`entry/new`** (`app/src/app/entry/new.tsx`), dengan tiga tahap:
  1. *pick*: mood (terisi dari `?mood=`), "Waktu: sekarang · Ubah" (`EntryTimeField`), dan "Simpan" yang nonaktif sampai mood dipilih.
  2. *saved*: "Simpan" → `createEntry` → `runPostSave(...)` dipanggil **tanpa di-await sama sekali**, dengan `.catch(() => {})`. Jadi langkah LOCAL yang throw (error DB) maupun `aiTask` tidak pernah menahan layar. Layar lalu berganti ke "Tersimpan. Mau cerita lebih?" dengan tombol "Ceritain lebih" dan "Nanti saja" (`router.back()`, atau `replace('/')` kalau tidak ada riwayat).
  3. *details*: `EntryDetailsForm` → "Simpan detail" → `updateEntry` → `runPostSave` lagi → `router.replace('/entry/[id]')`. Di sana chip saran AI muncul begitu hasilnya datang (spec §6.5).
  - Deps `runPostSave`: `showSupport = useSafety().show`, `aiAllowed = useAiAllowed()`, `ai = defaultAiClient()` (di-memo), `isAppActive = AppState.currentState === 'active'`, `now = new Date()`.
  - Kalau `createEntry`/`updateEntry` gagal, muncul pesan tenang "Catatanmu belum tersimpan. Coba sekali lagi, ya." Tidak ada crash.
- **Draft** (`app/src/features/entry/draft.ts`): `useDraft()` → `{ draft, loaded, save, clear }`. `save` menulis ke `saveDraft` dengan debounce 500ms. Draft yang masih tertunda langsung ditulis saat unmount (aplikasi tertutup di tengah jalan). `clear` membatalkan tulisan yang tertunda lalu menghapus draft. `loaded` adalah tambahan di luar interface brief, supaya layar tidak menimpa draft lama sebelum selesai dibaca.
  - Tahap *pick*: draft = `{ mood, createdAt? }`, dan dihapus setelah "Simpan".
  - Tahap *details*: draft = `{ mood, createdAt, note, contexts, experiences, copings }` dari catatan yang sudah tersimpan (hanya kalau ada isi). Saat `entry/new` dibuka lagi, catatan itu dicari berdasarkan `createdAt` + `mood`, lalu layar **melanjutkan tahap details untuk catatan yang sama** (tidak membuat duplikat), dengan teks "Ceritamu tadi belum selesai. Ini lanjutannya, kalau kamu mau." Kalau catatannya sudah dihapus, detailnya ikut dibawa ke catatan baru. Draft dihapus setelah "Simpan detail" atau "Nanti saja".
- **`EntryDetailsForm`** (`app/src/features/entry/EntryDetailsForm.tsx`): empat bagian yang bisa dilipat (Konteks, Perasaan & badan, Coping, Tulisan bebas). Semuanya terlipat, kecuali bagian yang sudah berisi. Header bagian menampilkan "N dipilih".
  - Konteks: kategori → sub-tag. `{subTag: null}` hanya ada selama kategori belum punya sub-tag.
  - "+ Tambah sendiri" (label a11y "Tambah sendiri di <bagian>") menyimpan `custom:<label>` yang sudah di-trim. Label kosong diabaikan tanpa pesan.
  - Coping: tiap coping menanyakan "Apakah ini membantu?" lewat radio "Ya" / "Sedikit" / "Tidak" / "Belum tahu" (`ya|sedikit|tidak|belum_tahu`), dengan default `belum_tahu`.
  - Tulisan bebas: teks kosong menjadi `null`. `createdAt` diteruskan apa adanya.
  - File yang sama juga mengekspor `EntryTimeField` dan `formatEntryTime` ("Kamis, 29 Okt 2026 · 21.15", waktu lokal). `EntryTimeField` memakai `@react-native-community/datetimepicker` 9.2.1 (sudah ada di package.json, docs SDK 58 dicek) dengan API komponen: `mode="date"` (`maximumDate` = sekarang), lalu `mode="time"` (`is24Hour`), lewat `onValueChange` / `onDismiss`. `onChange` yang deprecated tidak dipakai. Hasil di masa depan di-clamp ke sekarang.
- **`SuggestionChips`** (`app/src/features/entry/SuggestionChips.tsx`): `pendingSuggestions` tampil sebagai `Chip suggested` ("disarankan"). Kalau tidak ada saran, komponen mengembalikan `null`. Pengguna boleh memilih sebagian chip. "Pakai" mengirim yang dipilih, atau semuanya kalau tidak ada yang dipilih. "Abaikan" memanggil `onDismiss`. Ekspor murni `applySuggestions(entry, s)` menghasilkan patch: tag ditambahkan tanpa duplikat (pengalaman di luar taksonomi dibuang, coping baru `belum_tahu`), id yang benar-benar baru masuk ke `aiSuggested`, dan `pendingSuggestions: null`.
- **`entry/[id]`** (`app/src/app/entry/[id].tsx`):
  - menampilkan mood, waktu, konteks, perasaan, coping (beserta jawabannya), catatan, dan `SuggestionChips` ("Pakai" → `updateEntry(applySuggestions)`, "Abaikan" → `pendingSuggestions: null`);
  - "Ubah" membuka mode edit: `MoodPicker` + `EntryTimeField` + `EntryDetailsForm` → "Simpan perubahan" → `updateEntry` + `runPostSave` (tidak di-await, di-catch), atau "Batal";
  - "Hapus" membuka `Sheet` (label a11y "Konfirmasi hapus catatan") berisi "Hapus catatan ini? Catatan yang dihapus tidak bisa dikembalikan." dengan tombol "Batal" (utama, aman) dan "Hapus";
  - catatan yang tidak ada → "Catatan ini sudah tidak ada." + "Kembali".

## Bukti TDD

Semua perintah dijalankan dari `app/`.

**draft**: RED, `npx jest src/features/entry/draft`:
```
Cannot find module './draft' from 'src/features/entry/draft.test.ts'
Test Suites: 1 failed, 1 total
```
GREEN: `Tests: 5 passed, 5 total`

**SuggestionChips**: RED, `npx jest src/features/entry/SuggestionChips`:
```
FAIL src/features/entry/SuggestionChips.test.tsx
    Cannot find module './SuggestionChips' from 'src/features/entry/SuggestionChips.test.tsx'
```
Run pertama setelah implementasi gagal 1 dari 8. Ekspektasi test-nya yang salah (tag yang sudah ditulis pengguna sendiri tidak boleh dihitung sebagai saran AI), jadi test-nya yang diperbaiki. GREEN: `Tests: 8 passed, 8 total`

**EntryDetailsForm**: RED: `Cannot find module './EntryDetailsForm'`. Setelah implementasi, 3 test gagal karena API test (RNTL v14 memakai `toBeExpanded`/`toBeCollapsed`, dan teks bersarang perlu regex). Implementasinya tidak diubah. GREEN: `Tests: 17 passed, 17 total`

**EntryFlow** (layar asli + `renderRouter`): RED terhadap placeholder:
```
Tests:       30 failed, 1 passed, 31 total
  Unable to find an element with role: radio, name: Biasa   (x5)
  Unable to find an element with role: radio, name: Kurang baik   (x4)
  Unable to find an element with role: button, name: Hapus   (x2)
  Unable to find an element with text: Catatan ini sudah tidak ada.
  ...
```
(Satu-satunya yang lulus adalah "Butuh bantuan?", yang sudah ada di placeholder Task 14.)

Setelah implementasi, 12 test gagal:
- *Sapaan pukul 02:00*: ekspektasi test-nya salah. Aturan brief `<11` → "Selamat pagi" berlaku harfiah, jadi kasusnya diganti dengan batas 05:00/23:59 (lihat concern).
- *Kebocoran antar-test*: setiap test yang diakhiri `waitFor(async () => …)` membuat update React di test berikutnya tidak pernah di-flush. Dibuktikan dengan instrumentasi sementara: `onPress` terpanggil, tetapi tidak ada render ulang. Penyebabnya, loop fake-timer `waitFor` masih berada di dalam `act` saat ekspektasi async selesai. Perbaikannya ada di test saja: helper `eventually()` yang mem-poll DB lewat `act(advanceTimersByTimeAsync)`. Kode produksi tidak diubah.

GREEN: `Tests: 32 passed, 32 total`

**Mutation check** (dikembalikan setelahnya):
- Menghapus flush saat unmount di `draft.ts` → `useDraft › writes a pending draft right away when unmounted` FAIL.
- Menghapus `.catch` pada `runPostSave` di `new.tsx` → `moves to the saved state even if the post-save safety step fails` FAIL ("db sibuk").

## File yang diubah

- Modify: `app/src/app/(tabs)/index.tsx`, `app/src/app/entry/new.tsx`, `app/src/app/entry/[id].tsx`
- Create: `app/src/features/entry/EntryDetailsForm.tsx`, `SuggestionChips.tsx`, `draft.ts`
- Test: `app/src/features/entry/EntryFlow.test.tsx`, `EntryDetailsForm.test.tsx`, `SuggestionChips.test.tsx`, `draft.test.ts`
- Laporan: `docs/superpowers/reports/task-18.md`

## Hasil

- `npm test`: **33 suites, 348 tests passed**
- `npm run typecheck`: bersih
- `npm run lint`: bersih

## Concern

1. **Sapaan dini hari.** Aturan brief diikuti harfiah, jadi pukul 00:00 sampai 10:59 menampilkan "Selamat pagi" (pukul 02:00 juga "pagi"). Kalau tim ingin "Selamat malam" sampai sekitar 04:00, ini perubahan satu baris di `greeting()`.
2. **Draft yang dilanjutkan lebih diutamakan daripada `?mood=`.** Kalau ada detail yang belum selesai untuk catatan yang sudah tersimpan, membuka `entry/new` (termasuk lewat tap mood di Beranda) melanjutkan detail itu dulu. Mood yang di-tap diabaikan; pengguna bisa memilih "Nanti saja" untuk membuang draft. Alternatifnya kartu "Lanjutkan ceritamu" di Beranda, tapi itu di luar brief.
3. **"Nanti saja" di tahap details membuang teks yang sudah diketik tanpa konfirmasi** (itu pilihan eksplisit pengguna). Tombol kembali di header justru menyimpan draft.
4. **`usePostSave()` (sekitar 15 baris) terduplikasi** di `entry/new.tsx` dan `entry/[id].tsx`, karena daftar Files tidak menyediakan modul hook bersama dan route file tidak boleh dijadikan modul impor. Kandidat untuk dipindah ke `features/entry/` nanti.
5. **Mode edit di `entry/[id]` tidak memakai draft.** `useDraft` bertipe `Partial<NewEntry>` dan tidak membawa id, jadi draft hanya dipakai untuk catatan baru.
6. **`useDraft` menambah field `loaded`** di luar signature brief. Perubahannya kompatibel ke belakang.
7. **Pola test untuk task lain:** di file yang memakai `renderRouter` (fake timers), hindari mengakhiri test dengan `waitFor(async () => …)`, karena update React di test berikutnya bisa tidak ter-flush tanpa pesan apa pun. Lihat helper `eventually()` di `EntryFlow.test.tsx`.

## Fix round 1

Temuan code review dan wellbeing review soal logika draft, dengan aturan controller **R11**: teks jurnal yang sudah diketik tidak pernah dibuang diam-diam, dan mood yang di-tap di Beranda selalu disimpan.

### Perubahan

1. **`entry/new?mood=N` selalu memulai catatan baru** di tahap pick, dengan mood N sudah terpilih dan waktu = sekarang. `createdAt` dari draft lama tidak pernah ikut terbawa. Kalau ada draft detail sisa yang catatannya masih ada, detailnya disimpan dulu ke catatan itu lewat `updateEntry` + `runPostSave`, lalu draft dihapus, tanpa prompt. Layar "Tersimpan" kemudian menampilkan "Ceritamu yang sebelumnya sudah tersimpan." Dibuka tanpa `?mood=`, draft detail untuk catatan yang masih ada tetap dilanjutkan, seperti sebelumnya.
2. **"Nanti saja" di tahap detail** menyimpan detail yang sudah diisi ke catatannya, menghapus draft, lalu keluar. Kalau belum ada yang diisi, langsung keluar.
3. **Draft menyimpan `entryId`** (`EntryDraft = Partial<NewEntry> & { entryId?: string }`). Format JSON-nya kompatibel ke belakang, dan pencocokan lewat `createdAt` + mood tidak dipakai lagi.
   - Menghapus catatan di `entry/[id]` memanggil `clearDraftFor(db, id)`, yang hanya menghapus draft milik catatan itu.
   - Draft detail yang catatannya sudah tidak ada tidak ditempelkan ke catatan baru. Setelah "Simpan", catatan baru dibuat dengan mood saja, lalu tahap detail menampilkan teks itu dengan baris "Tulisanmu sebelumnya masih ada di sini." Pada saat itu draft sudah ditautkan ke id catatan baru.
4. **Guard double-tap** (`useRef` in-flight) untuk "Simpan", "Simpan detail", dan "Nanti saja" (detail) di `entry/new`, serta "Simpan perubahan" di `entry/[id]`. Tap mood di Beranda juga di-guard, dan guard-nya di-reset lewat `useFocusEffect`.
5. **Sapaan:** 0–3 "Hai", 4–10 "Selamat pagi", 11–14 "Selamat siang", 15–17 "Selamat sore", 18–23 "Selamat malam".
6. **`entry/[id]`:**
   - kalau hapus gagal: "Catatannya belum terhapus. Coba sekali lagi, ya.";
   - sheet hapus berjudul "Hapus catatan ini?" dengan isi "Catatan yang dihapus tidak bisa dikembalikan." serta tombol "Batal" (utama) dan "Hapus";
   - mode edit: "Batal" atau kembali (header/back, lewat `usePreventRemove` dari expo-router) dengan perubahan yang belum disimpan memunculkan "Simpan perubahan?" dengan pilihan "Simpan" / "Buang";
   - kalau `updateEntry` mengembalikan `null` (catatan terhapus di tempat lain), layar menampilkan "Catatan ini sudah tidak ada.".
7. `HELPED_TEXT.belum_tahu` → "(belum tahu)". Duplikasi `usePostSave` dipindahkan ke `app/src/features/entry/usePostSave.ts`. Hook ini tetap tidak meng-await `runPostSave` dan tetap meng-catch error di langkah lokal.

### Bukti TDD

RED, `npx jest src/features/entry/draft src/features/entry/EntryFlow` (setelah test baru ditulis, sebelum implementasi):
```
TypeError: (0 , _draft.clearDraftFor) is not a function
● Beranda › at 00:00 WIB says "Hai" / at 03:59 WIB says "Hai"
● Beranda › opens only one new entry when a mood is tapped twice quickly
    Expected: "/"   Received: "/entry/new"
● entry/new › double-tapping "Simpan" saves exactly one entry
    Expected length: 1   Received length: 2
● ... a mood tapped on Beranda starts a new entry; the leftover story goes into its own entry first
    Unable to find an element with role: radio, name: Sangat berat
● ... "Nanti saja" on the details stage keeps what was typed
    Expected: "tadi sempat nulis"   Received: null
● entry/[id] › deleting an entry also clears the detail draft linked to it
    Received: {"entryId": "5eafa1de-...", "mood": 2, "note": "draft lama", ...}
Tests:       20 failed, 41 passed, 61 total
```
Beberapa test baru langsung lulus karena menjaga perilaku yang sudah benar: pulihkan mood/waktu tanpa `?mood=`, "Nanti saja" tanpa isi, draft milik catatan lain tetap ada, round-trip `entryId`, dan "Batal" tanpa perubahan.

Catatan teknik test: double-tap disimulasikan dengan dua `fireEvent.press` di dalam **satu** `act`, sehingga kedua handler jalan sebelum React render ulang. `Promise.all` atas dua `fireEvent` di level atas membuat dua `act` tumpang tindih, dan itu meracuni test-test berikutnya.

GREEN:
```
npx jest src/features/entry → Tests: 109 passed, 109 total
```

### Hasil

- `npm test`: **33 suites, 372 tests passed**
- `npm run typecheck`: bersih
- `npm run lint`: bersih (sempat ada temuan `react-hooks/set-state-in-effect`; diperbaiki dengan ref)

### File

- Modify: `app/src/app/(tabs)/index.tsx`, `app/src/app/entry/new.tsx`, `app/src/app/entry/[id].tsx`, `app/src/features/entry/draft.ts`, `EntryFlow.test.tsx`, `draft.test.ts`
- Create: `app/src/features/entry/usePostSave.ts`

### Concern yang tersisa

- Concern 1–4 dan 6 di atas sudah selesai. Concern 5 tetap: mode edit di `entry/[id]` tidak ditulis ke draft, tetapi perubahannya kini dilindungi prompt "Simpan perubahan?".
- `usePostSave` tidak punya test unit sendiri; perilakunya (tidak di-await, error lokal ditelan) diuji lewat `EntryFlow.test.tsx`.
- Kalau `updateEntry` gagal saat menyimpan draft sisa secara otomatis, teksnya diperlakukan seperti draft yang catatannya hilang: ditampilkan di catatan baru, tidak dibuang.
