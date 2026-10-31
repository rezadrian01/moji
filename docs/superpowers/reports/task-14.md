# Task 14: Kerangka aplikasi (provider, navigasi, route placeholder)

## Yang dibangun

- **`AppProviders`** (`app/src/features/app/AppProviders.tsx`): memuat font Nunito 400/600/700, membuka DB lewat `openAppDb()` (atau memakai prop `db` yang disuntikkan), lalu memasang `ThemeProvider` → `DbContext.Provider` → `SafetyProvider`. Splash (`SplashScreen` dari `expo-router`) tetap tampil sampai font beres dan DB siap. Kalau font gagal dimuat, aplikasi tetap jalan dengan font sistem. Kalau DB gagal dibuka, layar menampilkan pesan tenang ("MOJI belum bisa membuka catatanmu. ...") dan tidak berhenti di splash selamanya.
- **`useAiAllowed()`** (`useAiAllowed.ts`): mengembalikan fungsi async yang setiap kali dipanggil membaca ulang `getSettings(db)` dan `getInviteCode()`. Hasilnya `aiEnabled && aiConsentAt !== null && kode !== null`, tanpa cache.
- **`startup.ts`**: `DEV_TOOLS_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1'`, dan `useStartupTasks()` yang memanggil `useWeeklyInsightOnForeground()` dan `usePendingSafetyOnForeground()`.
- **Root layout** (`app/src/app/_layout.tsx`): `AppProviders` → `RootStack`, yang memanggil `useStartupTasks()` dan merender `Stack` bertema. Header stack hanya membawa tombol kembali (`headerTitle: ''`), karena judul ditulis di dalam tiap layar. `(tabs)` dan `onboarding` tidak punya header. Ada juga `StatusBar` yang mengikuti skema warna.
- **Tab** (`app/src/app/(tabs)/_layout.tsx`): `Tabs` dari `expo-router/js-tabs` (impor `Tabs` dari `expo-router` sudah deprecated di SDK 58). Ada 4 tab, masing-masing dengan label teks dan ikon `expo-symbols` (iOS SF / Android Material: home, calendar_month, insights, settings). Target sentuh minimal 48, dan warnanya diambil dari tema.
- **Gerbang onboarding:** kalau `settings.onboardingDone` false, `<Redirect href="/onboarding" />`. Lihat concern 1 soal lokasinya.
- **`(tabs)/polaku.tsx`**: segmented control "Insight" / "Statistik" (`tablist` / `tab` + `selected`, tinggi 48) yang merender `InsightSection` atau `StatsSection` di dalam `Screen scroll`.
- **Route placeholder** (masing-masing `Screen` + judul `header`, dengan komentar task pengganti): `(tabs)/index` (Beranda, plus tombol "Butuh bantuan?" ke `/help` supaya aturan ≤ 2 tap sudah berlaku sejak sekarang), `timeline`, `settings`, `onboarding`, `help`, `entry/new`, `entry/[id]`, `insight/[id]`, `settings/ai|contacts|privacy|reminders`, `dev/seed`. `app/src/app/index.tsx` lama dihapus.
- **Stub** (nama & signature persis sesuai brief, baris pertama berisi komentar task pengganti):
  - `features/insights/InsightSection.tsx` (Task 21)
  - `features/insights/useWeeklyInsight.ts` → `useWeeklyInsightOnForeground` (Task 21)
  - `features/stats/StatsSection.tsx` (Task 22)
  - `features/safety/SafetyProvider.tsx` → `SafetyProvider`, `useSafety()` dengan `show` no-op (Task 19)
  - `features/safety/usePendingSafety.ts` → `usePendingSafetyOnForeground` (Task 19)

## Bukti TDD

RED, `npm test -- src/features/app` (sebelum implementasi):
```
FAIL src/features/app/AppProviders.test.tsx
  Cannot find module '@/features/safety/SafetyProvider' ...
FAIL src/features/app/useAiAllowed.test.tsx
  Cannot find module './AppProviders' from 'src/features/app/useAiAllowed.test.tsx'
Test Suites: 2 failed, 2 total
```
GREEN:
```
Test Suites: 2 passed, 2 total
Tests:       11 passed, 11 total
```

RED, `npm test -- src/features/app/startup`:
```
Cannot find module './startup' ...
Tests:       3 failed, 3 total
```
GREEN: `Tests: 3 passed, 3 total`.

RED, `npm test -- src/features/app/navigation` (sebelum layout tab dan route dibuat):
```
Configuration error:
Could not locate module @/app/(tabs)/_layout mapped as: .../app/src/$1.
```
GREEN, setelah layout dan route dibuat (plus perbaikan test: `fireEvent` di RNTL v14 harus di-`await`):
```
Tests:       5 passed, 5 total
```
Mutation check: gerbang `Redirect` di `(tabs)/_layout.tsx` dimatikan sementara, lalu test dijalankan. Hasilnya "sends a first-time user to onboarding" dan "lands on Beranda right after onboarding is finished" gagal (2 failed). Setelah itu kode dikembalikan.

## Test yang ditulis

- `AppProviders.test.tsx`: anak dirender setelah siap (termasuk `Screen` tanpa `SafeAreaProvider` tambahan); `useDb()` mengembalikan DB suntikan dan `openAppDb` tidak dipanggil; `useTheme()` mengikuti skema sistem (`useColorScheme` di-mock `dark`, lalu `scheme === 'dark'`, yang membuktikan provider ada di pohon); `useSafety().show` bisa dipanggil; tanpa prop `db`, DB dibuka lewat `openAppDb`; `openAppDb` gagal → pesan tenang dan anak tidak dirender.
- `useAiAllowed.test.tsx`: false di DB baru; true setelah `aiEnabled` + `aiConsentAt` + kode diset; fungsi yang sama menjadi false lagi setelah `aiEnabled` dimatikan (tidak di-cache); false tanpa consent; false tanpa kode.
- `startup.test.ts`: `DEV_TOOLS_ENABLED` true saat `__DEV__`; false di release tanpa flag atau dengan `'0'`; true di release dengan `'1'`.
- `navigation.test.tsx` (`expo-router/testing-library` `renderRouter`, memakai root layout dan tab layout asli, `openAppDb` di-mock ke `createTestDb()`): pengguna baru diarahkan ke `/onboarding`; setelah onboarding selesai (`updateSettings` + `router.replace('/')`) pengguna langsung sampai di Beranda tanpa race; 4 tab berlabel teks, dan tap "Timeline" pindah ke `/timeline`; segmented control Polaku berpindah antarbagian dengan `selected` yang benar; `useStartupTasks` memanggil kedua hook foreground. Layar milik task lain (index/timeline/settings/onboarding, isi InsightSection/StatsSection, dan hook foreground) di-mock inline, jadi test ini tetap hijau setelah Batch 3 mengganti file-file itu.

## Hasil verifikasi

- `npm test`: 28 suite, 263 test lulus, tanpa console error/warning.
- `npm run typecheck`: bersih. Diulang setelah typed routes dibuat (`npx expo start` dijalankan sebentar lewat `timeout 60`, lalu berhenti sendiri). `.expo/types/router.d.ts` memuat semua route: `/`, `/timeline`, `/polaku`, `/settings`, `/onboarding`, `/help`, `/entry/new`, `/entry/[id]`, `/insight/[id]`, `/settings/ai|contacts|privacy|reminders`, `/dev/seed`.
- `npm run lint`: bersih (0 warning).
- `npx expo export --platform android --output-dir /tmp/claude-1000/moji-export-check`: bundle Hermes android berhasil dibuat (3 MB, ketiga font Nunito ikut). Folder output sudah dihapus.

## File

Diubah: `app/src/app/_layout.tsx`. Dihapus: `app/src/app/index.tsx`.
Dibuat: semua file di daftar `Files:` brief, ditambah test `app/src/features/app/startup.test.ts` dan `app/src/features/app/navigation.test.tsx`.

## Concern

1. **Lokasi redirect onboarding.** Brief menulis "Root layout: Redirect ke /onboarding". `<Redirect>` dipasang di `(tabs)/_layout.tsx` (grup yang dirender root stack), bukan di komponen root layout. Ada dua alasan:
   - Root layout harus selalu merender navigator. Kalau root layout menyimpan state settings sendiri, ada race: onboarding memanggil `updateSettings` lalu `router.replace('/')` sebelum state root ikut terbarui, sehingga pengguna dilempar kembali ke onboarding. Layout tab membaca settings segar setiap kali dipasang. Test "lands on Beranda right after onboarding" membuktikan race ini tidak terjadi.
   - `/help` dan `/settings/contacts` tetap bisa dibuka selama onboarding. Langkah 4 Task 23 butuh tautan "Isi kontak bantuan sekarang".

   Perilaku yang terlihat pengguna sama dengan brief.
2. **Untuk Task 21/22:** `polaku.tsx` membungkus bagian di dalam `Screen scroll` (ScrollView). Jadi `InsightSection`/`StatsSection` sebaiknya tidak memakai ScrollView/FlatList vertikal sendiri. Pakai `View` + `map` supaya tidak ada VirtualizedList bersarang.
3. **Untuk Task 23/24:** setelah onboarding selesai, panggil `router.replace('/')`. Setelah `resetApp`, panggil `router.replace('/onboarding')`. Guard di tab bekerja saat grup tab dipasang atau difokuskan, jadi navigasi eksplisit tetap disarankan.
4. Di Jest (platform iOS), tombol tab JS punya `role="button"` dan label "Beranda, tab, 1 of 4". Test navigasi mencari tab lewat teks label. Kalau ada test Batch 3 yang memakai `renderRouter`, ingat bahwa `renderRouter` menyalakan fake timers dan `fireEvent` harus di-`await`.
