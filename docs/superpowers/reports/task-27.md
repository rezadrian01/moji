# Task 27: EAS Update & checklist rilis

## Dibangun
- `expo-updates` dipasang lewat `npx expo install expo-updates`; plugin `expo-updates` ditambahkan.
- `app.json`: `runtimeVersion: { policy: "appVersion" }` (top-level, sesuai docs EAS Update).
- `eas.json`: profil `preview` punya `channel: "preview"`.
- `docs/release-checklist.md` dengan semua butir brief plus butir tambahan (verifikasi WHO, uji tel:/wa.me, GCP, kode undangan).

## TDD
- RED: `npm test -- src/__tests__/releaseConfig.test.ts` gagal 3 dari 4: runtimeVersion `undefined`, plugin tidak ada, channel `undefined`.
- GREEN: seluruh suite 52 suite / 418 test lulus.

## Hasil
- test, typecheck, lint bersih; `npx expo-doctor`: 20/20 checks passed.

## Concern
- `updates.url` dan `extra.eas.projectId` belum ada: butuh `eas update:configure` dengan login EAS (masuk checklist bagian 4).
- Skrip `npm run eval` belum ada di repo pada branch ini; checklist merujuknya sesuai brief.
- Docs EAS tidak menyebut perubahan khusus SDK 58 untuk runtimeVersion.
