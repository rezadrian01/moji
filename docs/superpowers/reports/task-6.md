# Task 6: Statistik pribadi (perhitungan)

Dibangun: `app/src/domain/stats.ts` (rangeStart, computeStats, describeStats) + `stats.test.ts` (13 tes, zona Asia/Jakarta).

TDD:
- RED: `npm test -- src/domain/stats.test.ts` -> suite gagal, "Cannot find module './stats'" (modul belum ada).
- GREEN: 12/13 lulus; satu gagal karena urutan seri di helpfulCopings (tes mengharapkan urutan deterministik). Ditambah tie-break `tag` -> 13/13.
- Penuh: 6 suite, 41 tes lulus; typecheck dan lint bersih.

Keputusan / concern:
- `helped` = hanya jawaban `ya`; `sedikit` dihitung di `rated` tapi tidak di `helped` (brief tidak menetapkan).
- Konteks dihitung sekali per catatan walau ada beberapa subTag.
- Catatan setelah `now` dikecualikan dari rentang.
- Urutan seri: contextFrequency/moodByContext mengikuti urutan taksonomi (sort stabil); helpfulCopings seri -> helped, lalu tag.
- describeStats: kalimat per mood (>0), konteks teratas, coping teratas yang pernah membantu.

## Fix round 1
Ruling R4: "membantu" = `ya` atau `sedikit`; `belum_tahu` tetap di luar `rated`. (Menggantikan keputusan "hanya ya" di atas.)
- `stats.ts`: helper `isHelpful` dipakai untuk menghitung `helped`.
- Tes baru: "counts 'sedikit' as helpful and rated" (helped 2 dari rated 3 + kalimat describeStats "membantu 2 dari 3 kali") dan "excludes entries dated after now" (filter `t <= now` kini diuji).
- RED: `npm test -- src/domain/stats.test.ts` -> 1 failed, 14 passed (helped diharapkan 2, diterima 1).
- GREEN: stats 15/15; suite penuh 6 suite, 43 tes lulus; typecheck dan lint bersih.
