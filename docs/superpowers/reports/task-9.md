# Task 9: Klien AI & penyimpanan kode undangan

Built `app/src/ai/client.ts` (createAiClient, defaultAiClient, status mapping, timeout via AbortController, contract guards) and `app/src/ai/inviteStore.ts` (SecureStore "moji.invite", normalize trim+uppercase).

## TDD
RED: `npm --prefix app test -- src/ai/client.test.ts src/ai/inviteStore.test.ts` -> 2 suites failed, "Cannot find module './inviteStore'" / "'./client'".
GREEN: full suite 7 suites, 47 tests passed. Typecheck and lint clean.

## Concerns
- node_modules is a symlink to the main checkout (not committed).
- checkInvite treats any 2xx /health as valid; an empty code yields no_code.
