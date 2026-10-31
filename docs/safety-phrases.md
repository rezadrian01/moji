# Frasa safety check lokal

Safety check lokal selalu aktif, berjalan di perangkat, tanpa jaringan dan tanpa AI. Kode: `app/src/domain/safety.ts`, daftar: `app/src/domain/safetyPhrases.ts`.

## Cara kerja

1. `normalizeText`: huruf kecil, tanda baca/emoji jadi spasi, huruf yang sama berulang 2 kali atau lebih jadi satu ("matiii" dan "matii" menjadi "mati"), lalu slang dipetakan per kata. Collapse yang sama dipakai untuk daftar frasa dan kunci peta slang, jadi "nggak" menjadi "ngak" di kedua sisi dan "aamiin" menjadi "amin" secara konsisten.
2. Frasa dicocokkan sebagai frasa utuh di batas kata ("kematian" tidak cocok dengan "mati"). Idiom tak berbahaya "mati gaya", "mati suri", "mati kutu" dibuang dulu.
3. Kedekatan kata (keinginan mati): pemicu (ingin, mau, mending, lebih baik, kapan, andai) + 0 sampai 2 kata + "mati", dan kata setelah "mati" bukan lampu/listrik/gaya/suri/kutu -> `urgent`. Contoh: "mending gue mati", "pengen cepet mati".
4. Ada frasa `urgent` atau kedekatan di atas -> `urgent`; kalau tidak, ada frasa `concern` -> `concern`; selain itu `none`.

Pola memburuk (`isWorsening`): hanya catatan dalam 7 hari terakhir yang dihitung; ambil sampai 7 terbaru dari itu; true bila >= 5 bermood 1 dan sudah >= 72 jam sejak prompt terakhir. `lastPromptAt` yang tidak bisa dibaca diperlakukan sebagai belum pernah ada prompt.

Peta slang (lihat `SLANG_MAP`): gak/ga/gk/nggak/ngga/enggak/engga/gax/ngak/kagak/ndak/nda/tdk -> tidak; gaada/gada -> tidak ada; pengen/pgn/pingin/mo -> ingin; aja/aj -> saja; udh/udah -> sudah; lg -> lagi; bgt -> banget; org -> orang; gw/gue/gua/saya/aq/ak/aku -> aku; yg -> yang; idup -> hidup; cape -> capek; cepet -> cepat; ilang -> hilang. Kata "mau" sengaja tidak dipetakan.

## Daftar frasa

Sumber kebenaran adalah `app/src/domain/safetyPhrases.ts` (`URGENT_PHRASES`, `CONCERN_PHRASES`); semua frasa dinormalisasi dengan pipeline yang sama saat dimuat.

**urgent:** bunuh diri, ingin mati, mau mati, mending mati, lebih baik mati, ingin mati saja, mengakhiri hidup, akhiri hidup, tidak ingin hidup, tidak mau hidup lagi, menyakiti diri, nyakitin diri, melukai diri, self harm, sayat tangan, gantung diri, minum obat banyak, overdosis, lompat dari, kys, suicide, bundir, selfharm, suisid, sucide, tidak mau hidup, tidak ingin hidup lagi, mati saja, ingin mampus, tidur selamanya, tidak ingin bangun lagi, dunia lebih baik tanpa aku, andai aku tidak lahir, melukai diriku, ngelukain diri, nyilet, sayat nadi, nyayat nadi, potong nadi, silet tangan, cutting, terjun dari, loncat dari, minum racun, minum baygon, bunuh dirinya, mengakhiri hidupku

**concern:** tidak kuat lagi, capek hidup, lelah hidup, putus asa, tidak ada harapan, tidak ada gunanya, aku tidak berguna, jadi beban, beban buat semua orang, ingin menghilang, ingin hilang saja, tidak ada yang peduli, sendirian banget, hancur banget, tidak sanggup lagi, nyerah, menyerah saja, tidak ada gunanya hidup, tidak berguna, tidak berarti, benci diri sendiri, capek banget hidup, males hidup, muak hidup, bosan hidup, ingin lenyap, ingin hilang, ingin menghilang selamanya, tidak ada yang sayang, tidak ada yang butuh aku, merepotkan semua orang

## False positive yang diterima

Sengaja dibiarkan karena yang muncul hanya tawaran bantuan yang lembut, dan tes mendokumentasikannya:

- "mau mati lampu" -> `urgent` (cocok dengan frasa "mau mati").
- "aku tidak mau mati" -> `urgent` (frasa "mau mati" tetap cocok; negasi tidak dibaca).

Sebaliknya "mati lampu lagi", "lampu kos mati lagi", dan "mau mati gaya" -> `none`.

## Sumber

- WHO, "Preventing suicide: a resource for media professionals" (pembaruan 2023): bahasa dan kerangka pemberitaan.
- WHO, "LIVE LIFE: an implementation guide for suicide prevention in countries" (2021): kerangka pencegahan.
- Daftar frasa bahasa gaul dan ejaan bebas disusun dari pengamatan pola tulisan Indonesia di media sosial (singkatan, huruf berulang); bukan dari satu dokumen yang dirujuk.

## Prinsip konservatif

- Salah tidak mendeteksi lebih buruk daripada salah mendeteksi. Frasa ambigu dibiarkan memicu (lihat bagian false positive).
- Kata sehari-hari tidak boleh memicu ("lampu kos mati lagi", "mati lampu", "deadline bikin capek").
- Frasa berupa rangkaian kata, bukan satu kata umum, kecuali istilah yang tidak ambigu (overdosis, kys, suicide).

## Menambah frasa

1. Tambahkan ke `URGENT_PHRASES` atau `CONCERN_PHRASES` di `safetyPhrases.ts`. Tulis dalam bentuk baku (slang sudah dipetakan); daftar dinormalisasi otomatis saat dimuat.
2. Tambahkan kasus tes di `safety.test.ts`: satu yang harus memicu (termasuk varian slang), dan satu kalimat sehari-hari yang mirip yang tidak boleh memicu.
3. Perbarui daftar di dokumen ini, lalu jalankan `npm test`.
