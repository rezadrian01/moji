# Task 2 — Tipe domain, taksonomi, kontrak API, fixtures

## Dibangun
- `app/src/domain/types.ts` (tipe + `DEFAULT_SETTINGS`), `taxonomy.ts` (MOOD_LABELS, CONTEXTS, EXPERIENCES, COPINGS, `labelForTag`), `period.ts` (waktu lokal), `app/src/ai/contract.ts` (tipe + guard `isAnalyzeEntryResponse`, `isWriteInsightResponse`).
- Fixtures di `contract/fixtures/` (4 JSON: catatan akademik, `riskLevel: none`, dua pola).
- `app/src/domain/jakartaEnvironment.js`: Jest environment kecil untuk TZ (lihat Concern).

## Bukti TDD
RED (`npm test -- src/domain src/ai`, modul belum ada):
```
FAIL src/ai/contract.test.ts   Cannot find module '../../../contract/fixtures/analyzeEntry.request.json'
FAIL src/domain/period.test.ts Cannot find module './period'
FAIL src/domain/taxonomy.test.ts Cannot find module './taxonomy'
Test Suites: 3 failed, 3 total
```
GREEN: `Tests: 26 passed, 26 total` (4 suite termasuk smoke).

Bukti TZ berpengaruh:
- Implementasi period memakai getter UTC (mutasi sementara, sudah dikembalikan): `Tests: 5 failed, 2 passed`, termasuk kasus Senin 00:30 WIB.
- `process.env.TZ = 'Asia/Jakarta'` di dalam file tes TIDAK bekerja di Jest 30 (sandbox `process` adalah salinan): dengan `TZ=UTC` luar, tes timezone gagal (offset 0). Karena itu dipakai docblock `@jest-environment ./src/domain/jakartaEnvironment.js` yang mengatur TZ di proses worker. Terverifikasi lulus dengan `TZ=UTC` dan `TZ=America/New_York` dari luar.

## Hasil
- `npm test`: 26 passed. `npm run typecheck`: bersih. `npm run lint`: bersih.

## Concern
- Environment TZ memakai path relatif ke rootDir (`./src/domain/jakartaEnvironment.js`) dan `jest-environment-node` (transitif dari jest). Tes period berjalan di environment node, bukan environment jest-expo; tidak masalah untuk logika murni. Tes lain yang butuh TZ bisa memakai docblock yang sama.
- `labelForTag` untuk id tak dikenal mengembalikan id apa adanya.
- `app/node_modules` adalah symlink ke checkout utama (tidak di-commit).
