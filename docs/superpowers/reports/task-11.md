# Task 11 report: Gemini client, prompts, schemas, guardrails

Built functions/src/ai/{gemini,prompts,schemas,guardrails}.ts with tests.
- RED: first run of the three test files failed at import (modules absent). GREEN: 51 tests pass in functions/ (5 files), tsc --noEmit clean. No lint script exists in functions/package.json.
- createVertexGeminiClient(cfg, sdk?) throws on empty projectId; uses responseJsonSchema + responseMimeType application/json; safety: harassment/hate/sexual BLOCK_ONLY_HIGH, dangerous BLOCK_NONE (enum names verified in @google/genai 2.32.0). blockReason or finishReason SAFETY/PROHIBITED_CONTENT/BLOCKLIST/SPII/IMAGE_SAFETY -> blocked; bad JSON/empty/validate fail -> invalid; exception -> error (message discarded, never logged).
- Prompts: user text wrapped in <catatan>, insight JSON in <data>; embedded delimiter tags are stripped so text cannot break out.
- insightPassesGuardrails also rejects empty/whitespace text, pattern texts and questions (Task 3 carry-over). Also checks "kamu harus" and CLINICAL_TERMS in all fields.

## Fix round 1
- RED first: 22 new tests failed (delimiter escaping, rubric/insight prompt substrings, substring clinical/pressure rules, no-candidate response). 
- Fixes: (1) prompts.ts escapes every `<`/`>` (ASCII and fullwidth) to `‹`/`›` in note text, option ids/labels, patternLabels, periodLabel, pattern keys; ids/labels collapsed to one line. (2) R9: CLINICAL_TERMS now substring-based; new exported PRESSURE_TERMS replaces the "kamu harus" check; both checked on text, patternTexts, questions. (3) analyze rubric reworded. (4) insight prompt additions. (5) gemini.ts: empty text with no candidates or non-STOP finish (e.g. OTHER) -> blocked.
- Verify: `npm --prefix functions test` -> 5 files, 74 tests passed; `npm --prefix functions run typecheck` clean.

Concerns: CLINICAL_TERMS is my own list (app Task 8 FORBIDDEN_WORDS did not exist yet); sync when it lands. Caller (Task 13) must map 'blocked' to riskLevel >= concern and run zod + filterSuggestions on results.
