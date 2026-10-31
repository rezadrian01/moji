# Task 15: layanan generate insight

Dibangun: `app/src/features/insights/generate.ts` (`generateWeeklyIfDue`, `generateOnDemand`) + `generate.test.ts` (10 tes, env jakarta).

TDD: RED = "Cannot find module './generate'" (modul belum ada); 2 tes sempat gagal karena fixture (bukan implementasi), diperbaiki di tes. GREEN = 10/10; suite penuh 222/222; typecheck dan lint bersih.

Catatan: DuplicateWeeklyInsightError dipetakan ke `exists`; `writeInsight` yang melempar jatuh ke teks lokal.
Concern: tidak ada.
