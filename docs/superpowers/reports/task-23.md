# Task 23 report

Built OnboardingFlow (4 steps), InviteCodeForm, AiConsentText, settings/ai. Client injectable via `client` prop.

TDD: RED = "Cannot find module ./OnboardingFlow / ./InviteCodeForm" and settings/ai toggle test failing against placeholder; GREEN after implementation (full suite 297 passed, typecheck and lint clean).

Notes: settings/ai test lives in app/src/features/ai/AiSettings.test.tsx (avoids a test file inside the expo-router app dir). "Lewati" advances one step. Switch tests use valueChange events.

## Fix round 1

Tests added first (RED: 4 failed / 13 passed via `npm --prefix app test -- src/features/ai src/features/onboarding`): scheduler throws still finishes; permission denied shows "Izin notifikasi belum aktif..." and finishes; checkInvite throw shows network message; "Batal" closes Ganti kode form. Also added characterization tests: toggle on with code sets aiEnabled+aiConsentAt; toggle on without code shows form with AI off; Ganti kode keeps aiEnabled.

Fix: finish() saves onboardingDone first, reminder scheduling in try/catch, always router.replace, finishing reset in finally. Permission checked when the reminder toggle is turned on; denial shows the gentle line and skips reminderTime. InviteCodeForm catches thrown checkInvite. settings/ai got "Batal".

GREEN: `npm --prefix app test` -> 32 suites, 303 tests passed; typecheck and lint clean.
