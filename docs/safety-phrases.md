# Frasa safety check lokal

Safety check lokal selalu aktif, berjalan di perangkat, tanpa jaringan dan tanpa AI. Kode: `app/src/domain/safety.ts`, daftar: `app/src/domain/safetyPhrases.ts`.

## Cara kerja

1. `normalizeText`: huruf kecil, tanda baca/emoji jadi spasi, huruf yang sama berulang 3 kali atau lebih jadi satu ("matiii" menjadi "mati"), lalu slang dipetakan per kata.
2. Frasa dicocokkan sebagai frasa utuh di batas kata ("kematian" tidak cocok dengan "mati").
3. Ada frasa `urgent` -> `urgent`; kalau tidak, ada frasa `concern` -> `concern`; selain itu `none`.

Pilihan collapse huruf: hanya >= 3 yang diciutkan, jadi kata Indonesia dengan huruf kembar dua ("aamiin", "kopi", "saat") utuh. Kata baku yang punya tiga huruf sama berurutan hampir tidak ada.

Peta slang: gak/ga/gk/nggak/ngga/enggak/tdk -> tidak; pengen/pgn/pingin/mo -> ingin; aja/aj -> saja; udh/udah -> sudah; lg -> lagi; bgt -> banget; org -> orang; gw/gue/aku -> aku. Kata "mau" sengaja tidak dipetakan.

## Daftar frasa (bentuk ternormalisasi)

**urgent:** bunuh diri, ingin mati, mau mati, mending mati, lebih baik mati, ingin mati saja, mengakhiri hidup, akhiri hidup, tidak ingin hidup, tidak mau hidup lagi, menyakiti diri, nyakitin diri, melukai diri, self harm, sayat tangan, gantung diri, minum obat banyak, overdosis, lompat dari, kys, suicide

**concern:** tidak kuat lagi, capek hidup, lelah hidup, putus asa, tidak ada harapan, tidak ada gunanya, aku tidak berguna, jadi beban, beban buat semua orang, ingin menghilang, ingin hilang saja, tidak ada yang peduli, sendirian banget, hancur banget

## Sumber

- Pedoman publik WHO tentang pemberitaan dan pencegahan bunuh diri (bahasa dan sinyal peringatan).
- Literatur bahasa gaul dan ejaan bebas Indonesia di media sosial (singkatan, huruf berulang).

## Prinsip konservatif

- Salah tidak mendeteksi lebih buruk daripada salah mendeteksi. Frasa ambigu dibiarkan memicu, mis. "mau mati lampu" ikut cocok dengan "mau mati"; ini diterima karena yang muncul hanya tawaran bantuan yang lembut.
- Kata sehari-hari tidak boleh memicu ("lampu kos mati lagi", "mati lampu", "deadline bikin capek").
- Frasa berupa rangkaian kata, bukan satu kata umum, kecuali istilah yang tidak ambigu (overdosis, kys, suicide).

## Menambah frasa

1. Tambahkan ke `URGENT_PHRASES` atau `CONCERN_PHRASES` di `safetyPhrases.ts`. Tulis dalam bentuk baku (slang sudah dipetakan); daftar dinormalisasi otomatis saat dimuat.
2. Tambahkan kasus tes di `safety.test.ts`: satu yang harus memicu (termasuk varian slang), dan satu kalimat sehari-hari yang mirip yang tidak boleh memicu.
3. Perbarui daftar di dokumen ini, lalu jalankan `npm test`.
