# Task 3: Scaffold functions/

Built: functions/ package (ESM, Node 24 = latest GA on Cloud Run functions; nodejs26 is Preview), strict tsconfig, vitest config, zod contract (`contract.ts`), `loadConfig` (`config.ts`). Lockfile committed.

Versions (npm, checked 2026-10-31): functions-framework 5.0.5, firestore 9.4.0, @google/genai 2.32.0, zod 4.6.7, typescript 7.0.2, vitest 5.0.5, @types/node pinned ^24 to match the runtime.

TDD: RED = both test files failed ("Cannot find module './contract.js'" / config.js). GREEN = 2 files, 15 tests pass; `tsc --noEmit` and `npm run build` clean.

Ruling R1: no fixtures read/created; tests use inline samples shaped like Task 2's interfaces. Fixture validation deferred to a later task.

Concerns:
- No lint tool configured (none in brief); typecheck is the static gate.
- `invites` script points at ../scripts/invites.ts (Task 13), file not yet present.
- TypeScript 7.0.2 (native compiler) works with build/typecheck here.
- Schemas are non-strict (unknown keys stripped); key-exactness of patternTexts vs expected keys is left to the Task 11/13 guard.
- `projectId` defaults to '' when GOOGLE_CLOUD_PROJECT/GCLOUD_PROJECT unset.
