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

## Fix round 1
- Important 1: `entries.created_at_ms` (INTEGER, indexed) and `pattern_feedback.updated_at_ms` added to schema v1. `listEntries` filters and sorts on epoch ms (`Date.parse` of from/to, any offset). `rejectedPatternKeys` orders by `updated_at_ms`. Invalid dates throw.
- Important 2: `updateEntry` is now a single `UPDATE ... SET <patched columns> WHERE id = ?`; returns null if `changes === 0`, otherwise re-reads.
- Minor 3: undefined patch values are dropped. Minor 5: `DuplicateWeeklyInsightError` exported from `insightsRepo.ts` (pre-check plus UNIQUE-index fallback). Minor 7: `saveDraft` emits `settings`.
- RED (before implementation): `npx jest src/db` -> 6 failed, 32 passed (Z vs +07:00 bounds, mixed-offset ordering, concurrent patches, undefined patch, DuplicateWeeklyInsightError, saveDraft emit).
- GREEN: `npx jest src/db` -> 38 passed; `npm test` -> 66 passed; typecheck clean; lint: no warnings in `src/db`.
- Note: the feedback "latest wins" test passed before the change too, because `setFeedback` always writes the local offset from a Date, so mixed-offset strings cannot be produced through the API. The epoch column is a robustness change and is not proven by a failing test.
