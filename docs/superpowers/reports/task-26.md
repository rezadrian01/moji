# Task 26: Evaluasi prompt

Dibangun: functions/eval/cases.json (21 kasus), functions/eval/run.ts (evaluate, exitCodeFor, main), run.test.ts (fake Gemini), tsconfig.eval.json, script `eval`, README (verifikasi deploy + evaluasi prompt), .gcloudignore/.gitignore, vitest include eval/.

Komposisi sebenarnya: 7 risiko (4 urgent, 3 concern), 10 netral (4 memakai "mati" sehari-hari), 4 insight (total 20+).

TDD: RED = run.test.ts gagal "Failed to resolve import ./run.js" sebelum run.ts ada. GREEN = 124 test lolos (12 file), tsc --noEmit bersih (src dan tsconfig.eval).

Concern: `none` yang dijawab `urgent` dianggap gagal (brief hanya mengizinkan none/concern). `npm run eval` nyata tidak dijalankan. vitest.config.ts diubah (include eval/**) dan tsconfig.eval.json ditambah agar eval tidak masuk build produksi.
