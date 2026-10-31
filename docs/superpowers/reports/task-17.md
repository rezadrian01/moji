# Task 17 - Penjadwal pengingat

Built: messages.ts (5 daily variants, weekly nudge), scheduler.ts (applyReminderSettings, ensureNotificationPermission, cancelAllReminders).

TDD: RED = both test files failed with "Cannot find module './messages'/'./scheduler'". GREEN = 10 tests in src/features/reminders pass; full suite 223 pass (23 suites). typecheck and lint clean.

Notes:
- expo-notifications weekly weekday is 1 = Sunday (installed types); ISO -> expo via (iso % 7) + 1 (Mon 1->2, Sat 6->7, Sun 7->1). Tested.
- scheduler.test.ts overrides the global expo-notifications mock to add SchedulableTriggerInputTypes (global mock in jest.setup.ts lacks it; not modified to respect file boundaries). Other tests using the scheduler through the global mock would see `type: undefined`.
- AndroidImportance is a named import because eslint import/namespace flagged namespace access.
- Channel: enableVibrate false, vibrationPattern []; content sound false.
