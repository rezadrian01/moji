# Task 4: Penyimpanan lokal (SQLite + repository)

## Dibangun
`app/src/db/`: `db.ts` (interface Db, `newId`, `toLocalIso`), `migrations.ts` (v1, `PRAGMA user_version`), `expoDb.ts` (`openAppDb`), `events.ts`, `useDbQuery.ts` (`useDbQuery`, `DbContext`, `useDb`), `entriesRepo.ts`, `insightsRepo.ts`, `feedbackRepo.ts`, `pendingSafetyRepo.ts`, `settingsRepo.ts`, `testing/sqljsDb.ts` (`createTestDb`).

## Bukti TDD
- RED migrations: `Cannot find module './testing/sqljsDb'` -> GREEN 1 passed.
- RED entriesRepo / repos: `Cannot find module './entriesRepo'` / `'./insightsRepo'` -> GREEN 24 passed (setelah mock expo-crypto di tes, lihat concern).
- RED useDbQuery: `Cannot find module './useDbQuery'` -> GREEN 4 passed.

## Hasil
`npm test`: 9 suite, 56 tes lulus. `npm run typecheck` bersih. `npm run lint`: 0 error, tidak ada warning di `src/db` (warning lain dari file lain).

## Concern
- `jest-expo` tidak memberi `randomUUID` yang berfungsi (mengembalikan undefined), jadi tes me-mock `expo-crypto` per file dengan `globalThis.crypto.randomUUID`. `jest.setup.ts` tidak diubah.
- `newId` dan `toLocalIso` (ISO dengan offset lokal) ada di `db.ts`, bukan file terpisah.
- Perbandingan `from`/`to` pada `listEntries` adalah perbandingan string ISO; benar selama semua timestamp memakai offset yang sama (lokal).
- Tes repo insights/feedback/pending/settings digabung di `repos.test.ts`.
- `takePendingSafety` dan `addPendingSafety` tidak emit event (tabel bukan bagian dari `emitDataChanged`).
