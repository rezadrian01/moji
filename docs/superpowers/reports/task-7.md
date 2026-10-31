# Task 7: Safety check lokal & pola memburuk

Dibangun: `safetyPhrases.ts` (peta slang + frasa), `safety.ts` (`normalizeText`, `checkLocalSafety`, `maxRisk`, `WORSENING_RULE`, `isWorsening`), `docs/safety-phrases.md`, `safety.test.ts` (30 tes).

TDD: RED = `npx jest src/domain/safety` gagal "Cannot find module './safety'" (modul belum ada). GREEN = 30 passed, 30 total.

Keputusan: slang dipetakan per kata setelah hapus tanda baca dan collapse >= 3 huruf; frasa dinormalisasi otomatis saat modul dimuat; "mau" tidak dipetakan. `isWorsening` memeriksa 7 catatan terbaru: butuh >= 5 catatan, semuanya <= 7 hari, >= 5 bermood 1, dan cooldown 72 jam.

Concern: "mau mati lampu" memicu urgent (false positive yang diterima, konservatif; dicatat di docs).

## Fix round 1

Perubahan: R5 collapse huruf >= 2 (frasa dan kunci slang ikut dinormalisasi), R7 `isWorsening` hanya menghitung catatan <= 7 hari lalu (maks 7 terbaru; lastPromptAt tak terbaca = belum pernah), R8 kedekatan kata untuk keinginan mati plus pembuangan idiom "mati gaya/suri/kutu", tambahan slang dan frasa urgent/concern, tes false positive yang diterima, docs diperbarui (aturan baru, false positive, sumber WHO yang disebut presisi).

RED: `npx jest src/domain/safety` -> 33 failed, 34 passed, 67 total (kasus baru gagal).
GREEN: `npx jest src/domain/safety` -> 67 passed, 67 total. Hasil suite penuh, typecheck, lint: lihat balasan.

Catatan: tes lama "kopi pagi dan aamiin" kini menghasilkan "amin" (konsekuensi R5, konsisten untuk frasa).
