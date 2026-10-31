# Task 5: Pattern engine

Built `app/src/domain/patterns.ts` (PATTERN_RULES, computePatterns) with 17 tests in `patterns.test.ts`.

TDD: RED - `npx jest src/domain/patterns.test.ts` failed with "Cannot find module './patterns'" (module missing). GREEN - full suite: 6 suites, 45 tests pass. Typecheck and eslint clean.

Decisions: experience `count` = entries with the tag (any mood), `hitCount` = low-mood ones, lift = rate - baseline for ordering; coping count = non-belum_tahu ratings. Lift compared with 1e-9 tolerance for the float edge at 0.2.

Concerns: none. node_modules symlinked from the main checkout.
