# Task 20: Timeline

Built: `WeekStrip`, `TimelineList` (grouped by local date, mood face/label, context chips, 80-char excerpt, time, "Ada saran untukmu", tap -> /entry/[id], empty state), and the Timeline tab screen (week strip, "Semua" + per-category filter chips, scrolling Screen).

TDD: RED = suites failed with "Cannot find module './WeekStrip'" / TimelineList missing; screen tests failed against the placeholder (2 failed). GREEN = timeline suites 13 tests passed.
Final: npm test 299 passed; typecheck clean; lint clean.

Files: app/src/app/(tabs)/timeline.tsx, app/src/features/timeline/{TimelineList,WeekStrip}.tsx + tests, TimelineScreen.test.tsx.

Concerns: excerpt = first 80 chars + "…" (so up to 81 chars displayed). Entry.contexts are objects ({category, subTag}); filter by category. Tests mock expo-router (router + SplashScreen) as AppProviders imports SplashScreen from it.
