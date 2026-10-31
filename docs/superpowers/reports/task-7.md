# Task 7: Safety check lokal & pola memburuk

Dibangun: `safetyPhrases.ts` (peta slang + frasa), `safety.ts` (`normalizeText`, `checkLocalSafety`, `maxRisk`, `WORSENING_RULE`, `isWorsening`), `docs/safety-phrases.md`, `safety.test.ts` (30 tes).

TDD: RED = `npx jest src/domain/safety` gagal "Cannot find module './safety'" (modul belum ada). GREEN = 30 passed, 30 total.

Keputusan: slang dipetakan per kata setelah hapus tanda baca dan collapse >= 3 huruf; frasa dinormalisasi otomatis saat modul dimuat; "mau" tidak dipetakan. `isWorsening` memeriksa 7 catatan terbaru: butuh >= 5 catatan, semuanya <= 7 hari, >= 5 bermood 1, dan cooldown 72 jam.

Concern: "mau mati lampu" memicu urgent (false positive yang diterima, konservatif; dicatat di docs).
