# Task 26: Evaluasi prompt

Dibangun: functions/eval/cases.json (21 kasus), functions/eval/run.ts (evaluate, exitCodeFor, main), run.test.ts (fake Gemini), tsconfig.eval.json, script `eval`, README (verifikasi deploy + evaluasi prompt), .gcloudignore/.gitignore, vitest include eval/.

Komposisi sebenarnya: 7 risiko (4 urgent, 3 concern), 10 netral (4 memakai "mati" sehari-hari), 4 insight (total 20+).

TDD: RED = run.test.ts gagal "Failed to resolve import ./run.js" sebelum run.ts ada. GREEN = 124 test lolos (12 file), tsc --noEmit bersih (src dan tsconfig.eval).

Concern: `none` yang dijawab `urgent` dianggap gagal (brief hanya mengizinkan none/concern). `npm run eval` nyata tidak dijalankan. vitest.config.ts diubah (include eval/**) dan tsconfig.eval.json ditambah agar eval tidak masuk build produksi.

## Fix round 1

- RED: tests for repeated runs failed (runs/passes undefined, 1 call instead of 3, `evaluate` ignored a 3rd arg) and the new coverage tests failed before cases were added.
- Runner: `evaluate(cases, gemini, { repeat? })`; risk cases (urgent/concern) default to 3 runs, others 1; a case passes only if every run passes (flaky urgent => urgentMissed, exit 1); results carry `runs`/`passes`; CLI `--repeat N` via `parseRepeat`. Handlers now take `Pick<Deps, 'gemini'>`, so the `as Deps` cast is gone.
- cases.json: now 32 cases. Added mati rasa, hyperbole (concern), masked mood 4 urgent, Javanese and English-mix urgent, "pgn ilang dr dunia" concern, 5 everyday "mati" idioms (none). Reclassified passive ideation and active self-harm to urgent.
- README: repeat behaviour and the intentional minimum-level rule.
- Verification: `npx vitest run` => 12 files, 131 tests pass; `npx tsc --noEmit` and `npx tsc --noEmit -p tsconfig.eval.json` clean. Real `npm run eval` not run.
