# Task 1 - Dependency & tooling aplikasi

## Dibangun
- Dependency runtime lewat `npx expo install` (expo-sqlite, expo-secure-store, expo-notifications, expo-file-system, expo-sharing, expo-crypto, react-native-svg, @react-native-community/datetimepicker, @expo-google-fonts/nunito); dev: sql.js, @types/sql.js.
- `app/jest.setup.ts`: mock secure-store (Map in-memory), notifications, sharing, file-system, reanimated (`react-native-reanimated/mock`).
- `package.json` jest: `setupFilesAfterEnv` -> `<rootDir>/jest.setup.ts`.
- `app.json`: plugin expo-sqlite, expo-secure-store, expo-notifications, datetimepicker (expo-sharing dihapus dari plugins karena tidak diminta); `web.output` dihapus; package tetap `com.moji.journal`.
- `eas.json` (development, preview apk), `.env.example`.
- `tsconfig.json` tidak perlu diubah.

## Bukti TDD
RED (`npm test -- src/__tests__/setup.test.ts`, sebelum jest.setup.ts dirujuk):
```
FAIL ... expo-secure-store adalah mock jest
Expected: true  Received: false
Tests: 1 failed, 1 passed, 2 total
```
GREEN (`npm test`): `Test Suites: 2 passed, Tests: 3 passed`.

## Hasil
- test: 3/3 lulus; typecheck: bersih; lint: bersih (require() di test diberi eslint-disable); `npx expo-doctor`: 20/20.

## Concern
- Mock expo-file-system memakai API lama (documentDirectory dst); task berikutnya yang memakai API SDK 58 baru (`File`/`Paths`) perlu memperluas mock.
- Peringatan npm install-scripts sudah ada sebelumnya.
