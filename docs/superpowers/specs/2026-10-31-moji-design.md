# MOJI (More Than Just a Mood): Dokumen Desain MVP

- **Tanggal:** 31 Oktober 2026
- **Sumber:** presentasi "TUGAS PRESENTASI TOPIC PROYEK ANIMASI.pdf" dan sesi tanya jawab dengan tim
- **Tim:** Ahmad Reza Adrian, Ahmad Wildan Putro Santoso, Fathan Alfariel Adhyaksa, Juhari
- **Target waktu:** MVP siap usability testing dalam 2–4 minggu
- **Pembangun:** Claude menulis kode, tim me-review dan menguji di HP **[Keputusan tim]**

Penanda yang dipakai di dokumen ini:
- **[Keputusan tim]**: diputuskan oleh tim.
- **[Usulan desainer]**: keputusan penulis dokumen. Tim belum menyetujuinya secara eksplisit, jadi boleh diganti.
- **[Diserahkan ke builder]**: bebas diputuskan oleh yang mengerjakan.

---

## 1. Maksud dan alasan

Banyak orang tahu apa yang mereka rasakan, tetapi tidak tahu **kenapa**. Menurut I-NAMHS (2022), sekitar 1 dari 3 remaja Indonesia (34,9%) mengalami masalah kesehatan mental, tetapi hanya 2,6% yang mencari bantuan. Mood tracker yang sudah ada, seperti Daylio dan Reflectly, berhenti di grafik: "mood kamu menurun minggu ini".

MOJI menghubungkan mood dengan konteks kejadian, pengalaman emosional, dan cara coping. Dari situ MOJI menemukan pola dari catatan pengguna sendiri, lalu mengajak pengguna merefleksikan pola itu:

```
MOOD → CONTEXT → PATTERN → INSIGHT → REFLECTION
```

**Fokus utama proyek [Keputusan tim]:** UI yang *ramah kesehatan mental*, yaitu mudah dan nyaman dipakai oleh orang yang sedang tidak baik-baik saja. Nama mata kuliah "Proyek Animasi" hanya formalitas. Animasi dipakai kalau membantu kenyamanan, bukan untuk pamer.

**Keberhasilan:** responden usability testing bisa mencatat dengan cepat walaupun sedang down, tidak merasa dihakimi atau dibebani, dan merasa insight MOJI membantu mereka memahami diri sendiri.

## 2. Tujuan, non-goal, dan anti-goal

### Tujuan
1. Mencatat mood bisa selesai dalam satu tap. Detail lain opsional dan bisa dilengkapi kemudian.
2. Pengguna bisa mencatat konteks (6 kategori), pengalaman emosional (4 dimensi), dan coping beserta apakah coping itu membantu.
3. Ada timeline emosional yang menampilkan riwayat mood beserta konteksnya.
4. Insight personal yang deskriptif muncul mingguan secara otomatis dan bisa diminta kapan saja.
5. Ada pertanyaan reflektif, dan pengguna bisa mengonfirmasi atau mengoreksi pola.
6. Ada jaring pengaman: kalau terdeteksi tanda butuh bantuan, aplikasi menampilkan kontak bantuan dengan lembut.
7. Pengguna memegang penuh datanya: semua data ada di HP, bisa diekspor, bisa dihapus.

### Non-goal (tidak dikerjakan di MVP)
- Login atau akun pengguna, sinkronisasi cloud, multi-device. **[Keputusan tim]**
- iOS. Android dulu. **[Keputusan tim]**
- Publikasi ke Play Store. APK dibagikan langsung ke responden. **[Keputusan tim]**
- Chatbot percakapan bebas dengan AI. Risiko keselamatan terlalu besar untuk MVP. **[Usulan desainer]**
- Gamifikasi: streak, poin, badge, hitungan hari bolong. **[Keputusan tim]**
- Fitur sosial atau berbagi ke orang lain.
- Analytics atau tracking perilaku pengguna.
- Diagnosis dalam bentuk apa pun.

### Anti-goal (gagal walaupun secara teknis berjalan)
- Pengguna merasa **bersalah, dihakimi, atau dituntut**, misalnya karena tidak mencatat beberapa hari atau karena cara coping-nya.
- Insight terdengar seperti **diagnosis**, misalnya "kamu depresi" atau "kamu mengalami kecemasan".
- Insight **mengarang** pola yang tidak ada di data.
- Tampilan bantuan darurat terasa **menakutkan atau menghakimi**, sehingga pengguna malah berhenti jujur.
- Isi jurnal **bocor**, tersimpan di server, atau tercatat di log.
- Mencatat terasa seperti mengisi formulir panjang.

## 3. Batasan

- **Stack aplikasi [Keputusan tim]:** React Native + Expo, TypeScript.
- **AI [Keputusan tim]:** Gemini lewat Vertex AI di GCP. Project GCP dan billing sudah siap.
- **Perantara AI [Keputusan tim]:** Cloud Functions. Aplikasi tidak pernah memegang kredensial GCP.
- **Penyimpanan [Keputusan tim]:** semua jurnal lokal di HP. Tidak ada login.
- **Proteksi API [Keputusan tim]:** kode undangan per responden (lihat §7). Tidak ada API key atau rahasia lain di dalam APK.
- **Platform dan distribusi [Keputusan tim]:** Android, APK dibagikan langsung (bukan Play Store).
- **Bahasa [Keputusan tim]:** Bahasa Indonesia, menyapa dengan "kamu", nada hangat seperti teman yang mendengarkan, tidak alay.
- **Waktu:** 2–4 minggu sampai siap usability testing.
- **Bentuk usability testing [Keputusan tim]:** 10–20 responden memakai MOJI di rumah selama ±1–2 minggu, lalu diwawancara. Akibatnya:
  - Insight muncul dari data asli responden. Dalam 2 minggu biasanya hanya ada 1–2 insight mingguan, jadi tombol on-demand penting.
  - Pembaruan aplikasi selama studi tidak boleh menghapus data. APK harus selalu ditandatangani dengan keystore yang sama (dikelola EAS) dan memakai package name yang sama. **[Usulan desainer]**
  - Perbaikan JS kecil selama studi bisa dikirim lewat EAS Update (OTA) supaya responden tidak perlu instal ulang. Ini P1. **[Usulan desainer]**
  - Ada mode data contoh untuk tim saja, misalnya dari menu tersembunyi atau build development, yang mengisi 2–3 minggu catatan palsu. Gunanya menguji insight tanpa menunggu. Mode ini tidak terlihat oleh responden. **[Usulan desainer]**
- **Etika studi [Keputusan tim]:** tidak ada kewajiban peneliti menindaklanjuti responden berisiko, dan tidak ada data yang dilaporkan ke peneliti dari aplikasi. Tidak ada psikolog atau konselor yang meninjau. Karena itu daftar frasa berisiko dan aturan prompt disusun dari literatur dan pedoman publik dengan sikap **konservatif**: lebih baik terlalu sensitif daripada terlewat. Aplikasi juga menegaskan di onboarding dan halaman bantuan bahwa MOJI **bukan layanan darurat**.
- **Etika [dari presentasi]:** bukan alat diagnosis, bukan pengganti psikolog atau psikiater, tidak menyimpulkan kondisi klinis, tidak menghakimi coping.

## 4. Arsitektur

```
┌────────────────────────── HP Android ──────────────────────────┐
│  Aplikasi Expo (TypeScript)                                    │
│  ├─ SQLite lokal: entri, insight, refleksi, pengaturan         │
│  ├─ Pattern engine lokal (deterministik, tanpa AI)             │
│  ├─ Safety check lokal (daftar frasa, tanpa AI)                │
│  └─ Kode undangan (disimpan di secure storage)                 │
└──────────────┬─────────────────────────────────────────────────┘
               │ HTTPS + header X-Moji-Invite: <kode>
               │ (hanya jika fitur AI aktif + izin diberikan)
┌──────────────▼──────────── GCP ────────────────────────────────┐
│  Cloud Functions (Node.js/TypeScript)                          │
│  ├─ validasi kode undangan + rate limit (Firestore)            │
│  ├─ susun prompt + panggil Gemini (Vertex AI)                  │
│  └─ TIDAK menyimpan/me-log teks jurnal                         │
│  Firestore: hanya koleksi kode undangan & hitungan pemakaian   │
│  Billing: budget alert                                         │
└────────────────────────────────────────────────────────────────┘
```

**Prinsip utama [Usulan desainer]:** *pola dihitung di HP secara deterministik, Gemini hanya menuliskan.* Angka dan pola, misalnya "mood rendah muncul di 5 dari 7 catatan yang berkonteks akademik", dihitung oleh kode lokal. Gemini mengubahnya menjadi kalimat yang hangat dan pertanyaan reflektif. Dengan begitu insight selalu berdasar data, bisa diuji, dan aplikasi tetap berguna tanpa AI.

**Aplikasi harus berfungsi penuh tanpa AI [Usulan desainer].** Kalau fitur AI dimatikan, belum ada kode undangan, atau sedang offline, ini yang tetap berjalan: mencatat, timeline, pola deskriptif dalam bentuk kalimat templat lokal, pertanyaan reflektif dari bank pertanyaan lokal, dan safety check lokal. Fitur yang hilang hanya kalimat insight versi Gemini, kategorisasi otomatis, dan deteksi tanda bahaya berbasis AI.

### Pilihan teknis
| Bagian | Pilihan | Status |
|---|---|---|
| Navigasi | expo-router | [Usulan desainer] |
| Database lokal | expo-sqlite (ORM opsional, misal Drizzle) | [Usulan desainer]; ORM [Diserahkan ke builder] |
| Animasi | react-native-reanimated, respek setting *reduce motion* | [Usulan desainer] |
| Notifikasi | expo-notifications (notifikasi **lokal** terjadwal saja) | [Usulan desainer] |
| Penyimpanan kode undangan | expo-secure-store | [Usulan desainer] |
| Build APK | EAS Build, profil `preview` dengan `buildType: apk` | [Usulan desainer] |
| Functions | Cloud Functions for Firebase gen 2 (atau Cloud Run functions), Node.js + TypeScript, SDK `@google/genai` mode Vertex | [Usulan desainer]; varian persisnya [Diserahkan ke builder] |
| Model | Gemini Flash terbaru yang tersedia di Vertex, nama model lewat env var | [Usulan desainer] |
| Region | Function di `asia-southeast2` (Jakarta) bila tersedia; lokasi Vertex disesuaikan ketersediaan model (misal `global`) | [Diserahkan ke builder] |
| State management, styling lib, struktur folder | — | [Diserahkan ke builder] |

Catatan: klien tidak memakai native module Firebase, cukup `fetch` ke endpoint HTTPS. Jadi pengembangan harian bisa memakai Expo Go, dan EAS dibutuhkan hanya untuk membuat APK.

Struktur repo yang disarankan [Usulan desainer]: satu repo dengan `app/` (Expo) dan `functions/` (Cloud Functions), ditambah `scripts/` untuk membuat kode undangan.

## 5. Model data (lokal, SQLite)

**[Usulan desainer]** Nama kolom dan bentuk persisnya [Diserahkan ke builder].

### `entries`: satu catatan
| Field | Keterangan |
|---|---|
| `id` | UUID |
| `created_at` | waktu catatan dibuat (pengguna bisa mengubahnya untuk catatan susulan) |
| `updated_at` | |
| `mood` | 1–5 (lihat §6.1) |
| `note` | teks bebas, opsional |
| `contexts` | daftar kategori + sub-tag (lihat §6.2), opsional |
| `experiences` | daftar tag per dimensi (lihat §6.3), opsional |
| `copings` | daftar `{tag, helped: ya / sedikit / tidak / belum tahu}`, opsional |
| `ai_suggested` | penanda kategori mana yang berasal dari saran AI dan diterima pengguna |

### `insights`: hasil insight
| Field | Keterangan |
|---|---|
| `id`, `created_at` | |
| `kind` | `weekly` atau `on_demand` |
| `period_start`, `period_end` | rentang data yang dianalisis |
| `patterns` | JSON hasil pattern engine (sumber kebenaran). Tiap pola punya `pattern_key` stabil, misalnya `low_mood×akademik`, dan teks per polanya |
| `text` | kalimat pembuka atau ringkasan insight (dari Gemini atau templat lokal) |
| `source` | `ai` atau `local` |
| `questions` | daftar pertanyaan reflektif |
| `reflection` | tulisan refleksi pengguna, opsional |

### `pattern_feedback`: tanggapan per pola
Tanggapan diberikan **per pola**, bukan per insight. Satu insight bisa berisi beberapa pola. **[Usulan desainer]**
| Field | Keterangan |
|---|---|
| `insight_id`, `pattern_key` | |
| `feedback` | `sesuai` / `sebagian` / `tidak_sesuai` |
| `created_at` | |

Pola dengan `pattern_key` yang terakhir ditandai `tidak_sesuai` dikirim ke Gemini sebagai "pernah ditolak". Di templat lokal, pola itu ditulis dengan nada lebih tentatif ("kamu pernah bilang ini kurang sesuai, tapi datanya masih menunjukkan…") atau dilewati kalau datanya tidak berubah.

### `pending_safety`
Penanda lokal bahwa hasil pengecekan AI berstatus `concern` atau `urgent` tapi support sheet belum sempat ditampilkan, misalnya karena pengguna sudah keluar dari aplikasi. Penanda ini ditampilkan saat aplikasi dibuka berikutnya lalu dihapus. **[Usulan desainer]**

### `settings`
Isinya: izin AI (ya/tidak + waktu izin diberikan), kode undangan (di secure store, bukan SQLite), jam pengingat (atau mati), hari ringkasan mingguan, kontak konseling kampus (nama + nomor/tautan), kontak darurat pribadi (nama + nomor), status onboarding, tema.

## 6. Fitur dan perilaku

Prioritas: **P0** wajib ada untuk usability testing, **P1** sebaiknya ada, **P2** kalau waktu cukup. Prioritas ini **[Usulan desainer]**.

### 6.1 Mood Journal (P0)
- Skala 5 mood, masing-masing dengan ilustrasi atau ekspresi dan label kata, misalnya: Sangat berat, Kurang baik, Biasa, Baik, Sangat baik. Label final [Diserahkan ke builder] dengan syarat tidak menghakimi.
- **Satu tap memilih mood, lalu "Simpan" langsung aktif.** Semua langkah setelahnya opsional dan bisa dilewati. **[Keputusan tim]**
- Setelah menyimpan, aplikasi menawarkan "Mau cerita lebih?" untuk mengisi konteks, pengalaman, coping, dan tulisan bebas, atau "Nanti saja".
- Pencatatan bisa kapan saja dan berkali-kali per hari.
- Catatan bisa diedit dan dihapus. Catatan susulan untuk waktu lampau bisa dibuat.
- Draft tersimpan otomatis kalau aplikasi tertutup di tengah jalan.

### 6.2 Context Logging (P0)
Ada 6 kategori dari presentasi (Pradipta & Hanami, 2024). Pengguna boleh memilih lebih dari satu. Tiap kategori punya sub-tag yang bisa dipilih atau ditambah sendiri:

| Kategori | Contoh sub-tag |
|---|---|
| Akademik | deadline, tugas, ujian |
| Interpersonal | konflik, pertemanan, keluarga |
| Internal | overthinking, ekspektasi diri |
| Finansial | kebutuhan, tekanan ekonomi |
| Media & Hiburan | media sosial, berita, aktivitas digital |
| Kejadian tak terduga | situasi yang tidak direncanakan |

Sub-tag di atas adalah contoh. Daftar finalnya [Diserahkan ke builder].

### 6.3 Emotional Experience (P0)
Empat dimensi dari presentasi: **emosi, fisik, pikiran (kognitif), self-esteem.** Tiap dimensi berupa chip yang bisa dipilih lebih dari satu, misalnya:
- Fisik: lelah, sulit tidur, pusing.
- Pikiran: overthinking, sulit fokus.

Daftar finalnya [Diserahkan ke builder]. Isinya harus kata-kata sehari-hari, bukan istilah klinis.

### 6.4 Coping Journal (P0)
- Pengguna memilih atau menulis apa yang mereka lakukan, misalnya dengar musik, cerita ke teman, tidur, jalan-jalan.
- Untuk tiap coping ada pertanyaan "Apakah ini membantu?" dengan jawaban ya / sedikit / tidak / belum tahu. Jawabannya bisa diisi nanti.
- Bahasanya **tidak boleh menilai** coping. Tidak ada label "coping buruk".

### 6.5 Kategorisasi otomatis dengan AI (P1)
**Kapan berjalan [Usulan desainer]:** setiap kali catatan yang berisi teks bebas disimpan atau diedit, dengan syarat AI aktif dan izin sudah diberikan. Satu request `analyzeEntry` mengerjakan dua hal sekaligus: saran tag dan deteksi tanda bahaya (§6.9). Dengan begitu lapis AI pada jaring pengaman selalu aktif selama AI aktif. Layar izin AI di onboarding menyebutkan hal ini.

**Alur:**
- **Penyimpanan tidak pernah menunggu AI.** Catatan langsung tersimpan lokal, dan safety check lokal berjalan seketika.
- Request AI berjalan di latar dan berhenti setelah batas waktu (§7.2).
- Saran konteks, pengalaman, dan coping tampil sebagai chip "disarankan" begitu hasilnya datang: di layar catatan kalau pengguna masih di sana, atau di detail catatan kalau sudah pindah. Chip harus **disetujui pengguna**. Tidak ada yang diisi otomatis tanpa persetujuan.
- Kalau `risk_level` bukan `none`, support sheet muncul begitu hasil datang. Kalau pengguna sudah keluar dari aplikasi, hasilnya disimpan sebagai `pending_safety` dan ditampilkan saat aplikasi dibuka berikutnya.
- Kalau safety check lokal sudah memunculkan support sheet, hasil AI tidak memunculkannya lagi untuk catatan yang sama.

### 6.6 Emotional Timeline (P0)
- Riwayat catatan berurutan waktu. Tiap item menampilkan mood, chip konteks, dan potongan catatan.
- Ada tampilan ringkas per minggu atau bulan, misalnya baris mood harian. Bentuk visualnya [Diserahkan ke builder] dengan syarat tidak memakai merah untuk mood rendah.
- Hari tanpa catatan tampil **netral**, tanpa tanda "bolong" dan tanpa pesan yang membuat merasa bersalah.
- Filter berdasarkan kategori konteks (P1).

### 6.7 Personal Insight (P0)

**Pattern engine lokal [Usulan desainer]** menghitung dari catatan dalam periode yang dianalisis:
1. **Mood × konteks:** untuk tiap kategori konteks, berapa proporsi mood rendah (1–2) pada catatan yang mengandung konteks itu, dibanding semua catatan. Pola dilaporkan hanya kalau konteks itu muncul di **minimal 3 catatan** dan bedanya bermakna. Ambang persisnya [Diserahkan ke builder], dengan syarat terdokumentasi dan teruji.
2. **Pengalaman yang sering muncul bersama mood rendah.**
3. **Coping yang paling sering ditandai "membantu".**
4. **Ringkasan deskriptif:** jumlah catatan dan sebaran mood.

Output engine berupa JSON terstruktur. JSON ini **satu-satunya** sumber fakta untuk kalimat insight.

**Kapan insight muncul [Keputusan tim]:**
- **Default mingguan otomatis.** Insight mingguan mencakup **minggu kalender sebelumnya (Senin–Minggu)**. Insight dibuat saat aplikasi pertama kali dibuka sejak Senin, kalau insight untuk minggu itu belum ada. Kuncinya tanggal Senin minggu tersebut, supaya tidak dibuat dua kali dan tidak terlewat. Kalau pengguna melewatkan beberapa minggu, hanya minggu terakhir yang dibuat. **[Usulan desainer]**
- **Notifikasi mingguan** (lokal, Senin di jam pengingat, bisa dimatikan) hanya **ajakan lembut**, misalnya "Ringkasan minggu lalu bisa kamu lihat kalau mau." Notifikasi tidak mengklaim insight sudah dibuat, karena pembuatannya terjadi saat aplikasi dibuka. Tidak ada pembuatan di latar belakang. **[Usulan desainer]**
- **On demand:** tombol "Lihat polaku" bisa ditekan kapan saja. Periodenya 30 hari terakhir **[Usulan desainer]**.
- **Data minimum [Usulan desainer]:** kalau catatan dalam periode kurang dari 4, tampilkan pesan lembut seperti "MOJI masih mengenal polamu, coba cek lagi setelah beberapa catatan lagi." Pesan ini tidak dibuat terdengar seperti kegagalan pengguna.

**Penulisan insight:**
- Jika AI aktif, JSON pola dikirim ke Gemini untuk dijadikan 2–4 kalimat. Pola yang pernah ditandai pengguna "tidak sesuai" ikut dikirim supaya tidak diulang dengan nada yakin.
- Jika AI mati atau gagal, pakai **templat kalimat lokal**.
- Contoh nada dari presentasi: *"Dalam beberapa catatan terakhir, mood negatifmu lebih sering muncul ketika kamu mencatat adanya tekanan akademik. Apakah pola ini sesuai dengan pengalamanmu?"*

### 6.8 Reflection Assistant (P0)
- Tiap insight disertai 1–3 pertanyaan reflektif. Kalau AI aktif, pertanyaan dibuat Gemini; kalau tidak, diambil dari bank pertanyaan lokal per jenis pola.
- Untuk **tiap pola** di insight, pengguna memberi tanggapan **Sesuai / Sebagian / Tidak sesuai**. Untuk insight secara keseluruhan, pengguna bisa menulis satu refleksi bebas.
- Tanggapan disimpan, ditampilkan bersama insight di riwayat, dan dipakai untuk insight berikutnya (§5 `pattern_feedback`, §6.7).

### 6.9 Jaring pengaman: deteksi tanda butuh bantuan (P0)

Ada tiga lapis **[Usulan desainer]**:
1. **Safety check lokal (selalu aktif, tanpa AI):** daftar frasa berisiko dalam Bahasa Indonesia, termasuk bahasa gaul, dicocokkan dengan teks catatan saat disimpan. Daftar frasanya [Diserahkan ke builder]. Karena tidak ada reviewer profesional, daftar ini disusun dari literatur dan pedoman publik dengan sikap konservatif, lalu didokumentasikan supaya tim bisa mengeceknya.
2. **Deteksi AI (jika aktif):** Gemini mengembalikan `risk_level` (`none` / `concern` / `urgent`) bersama hasil kategorisasi. Kesalahan yang lebih aman adalah terlalu sensitif, bukan kurang sensitif.
3. **Pola memburuk:** misalnya 5 dari 7 catatan terakhir bermood 1 dalam rentang 7 hari. Ambang finalnya [Diserahkan ke builder].

**Respons:** sebuah *support sheet* muncul dengan lembut setelah catatan disimpan. Catatan tidak pernah diblokir. Isinya:
- Kalimat empatik, bukan peringatan. Contoh: "Kedengarannya hari ini berat banget. Kamu nggak harus menghadapinya sendirian."
- **Layanan nasional [Keputusan tim]:** misalnya layanan SEJIWA 119 ext 8 dan darurat 112. **Builder wajib memverifikasi nomor yang berlaku sebelum rilis ke responden.**
- **Konseling kampus [Keputusan tim]:** diisi pengguna sendiri di pengaturan. Kalau belum diisi, tampilkan ajakan untuk mengisinya.
- **Kontak darurat pribadi [Keputusan tim]:** satu orang terpercaya, bisa dihubungi dengan satu tap (telepon atau WhatsApp).
- Tombol "Aku baik-baik saja sekarang" untuk menutup tanpa pertanyaan lanjutan.

Halaman "Butuh bantuan?" juga selalu bisa diakses dari beranda dan pengaturan, terlepas dari deteksi.

Tingkat `concern` dan `urgent` dibedakan dari seberapa menonjol kontak darurat ditampilkan. Nadanya tetap lembut di keduanya.

### 6.10 Pengingat (P1)
**[Keputusan tim]**
- Pengingat harian **opsional**. Pengguna memilih jamnya atau mematikannya. Default ditanyakan di onboarding.
- Kalimatnya lembut dan bervariasi, misalnya "Gimana harimu? Kalau mau, ceritain ke MOJI." Tidak menyebut hari yang terlewat.
- **Tanpa streak**, tanpa hitungan hari berturut-turut, tanpa notifikasi "kamu sudah X hari tidak mencatat".

### 6.11 Onboarding (P0)
Layarnya singkat, maksimal sekitar 4 layar, dan semuanya bisa dilewati kecuali izin AI:
1. Apa itu MOJI: alat refleksi, **bukan alat diagnosis dan bukan pengganti psikolog**.
2. Privasi: catatan tersimpan hanya di HP ini, dan pengguna bisa mengekspor atau menghapusnya kapan saja.
3. **Izin AI [Keputusan tim]:** penjelasan jelas tentang apa yang dikirim ke AI (teks catatan dan ringkasan pola), bahwa server tidak menyimpannya, dan bahwa fitur ini bisa dimatikan kapan saja. Ada pilihan "Aktifkan" atau "Nanti saja". Jika diaktifkan, minta **kode undangan**.
4. Pengingat (opsional) dan kontak bantuan (opsional, bisa diisi nanti).

### 6.12 Kontrol data dan pengaturan (P0, kecuali yang ditandai)
- Matikan atau nyalakan fitur AI kapan saja. Kode undangan bisa diubah.
- Lihat penjelasan "Data apa yang disimpan dan dikirim".
- **Ekspor data** ke file JSON lewat share sheet. Ini sekaligus menjadi backup, karena data hilang kalau aplikasi di-uninstall. Aplikasi perlu memberi tahu hal ini dengan jelas.
- **Hapus semua data**, dengan konfirmasi.
- Impor dari file ekspor (P2).
- Kunci aplikasi dengan biometrik atau PIN HP (P2) **[Usulan desainer]**.
- Atur jam pengingat, hari ringkasan mingguan, dan kontak bantuan.

## 7. Backend AI dan keamanan

### 7.1 Kode undangan [Keputusan tim]
- Tim membuat satu kode unik per responden dengan skrip admin (`scripts/`), misalnya `MOJI-R07-K3F9`. Kode disimpan di Firestore koleksi `invites`: `{code, active, created_at, label?, daily_count, count_date}`. Label hanya untuk tim (misal "R07") dan **tidak berisi data pribadi**.
- Aplikasi menyimpan kode di secure store dan mengirimnya di header setiap request.
- Function menolak dengan status 401 atau 403 kalau kode tidak ada atau tidak aktif. Aplikasi lalu menampilkan pesan ramah dan tetap berjalan dalam mode tanpa AI.
- **Rate limit [Usulan desainer]:** per kode misalnya 50 request per hari, dan batas total harian semua kode, misalnya 1.000 request per hari untuk 10–20 responden. Kalau batas tercapai, function mengembalikan 429 dan aplikasi beralih ke mode lokal tanpa pesan menyalahkan. Angka finalnya [Diserahkan ke builder] lewat env var.
- Kode bisa dicabut satu per satu dengan menyetel `active: false`.
- **Budget alert** di GCP Billing.

### 7.2 Endpoint [Usulan desainer]
Bentuk persisnya [Diserahkan ke builder].

| Endpoint | Input | Output |
|---|---|---|
| `POST /analyzeEntry` | teks catatan + mood + daftar tag yang tersedia | saran tag (hanya dari daftar yang ada), `risk_level` |
| `POST /writeInsight` | JSON pola dari engine + pola yang pernah ditolak | teks insight, 1–3 pertanyaan reflektif |
| `GET /health` (opsional) | kode undangan | status kode (untuk validasi saat onboarding) |

- Respons Gemini memakai **structured output (JSON schema)** dan divalidasi di server sebelum dikirim ke aplikasi.
- **Timeout** di sisi aplikasi, misalnya 15 detik. Kalau gagal, pakai fallback lokal tanpa mengganggu alur mencatat.

### 7.3 Aturan prompt (wajib)
- Peran: pendamping refleksi yang hangat. **Bukan** terapis, bukan dokter.
- **Dilarang** menyebut diagnosis, gangguan, atau istilah klinis tentang pengguna, menghakimi coping, atau memberi nasihat medis.
- Insight **hanya boleh** menyatakan pola yang ada di JSON input dan tidak boleh mengarang.
- Bahasanya tentatif ("sepertinya", "lebih sering muncul ketika") dan selalu mengundang konfirmasi.
- Bahasa Indonesia, menyapa dengan "kamu", hangat, singkat.
- Safety settings Vertex dikonfigurasi supaya teks tentang perasaan berat **tidak diblokir begitu saja**. Kalau respons diblokir, function tetap mengembalikan `risk_level` konservatif (`concern`) supaya jaring pengaman berjalan.

### 7.4 Privasi di server [Keputusan tim]
- Function **tidak menyimpan** teks catatan atau insight di mana pun dan **tidak me-log** isi request maupun respons. Yang boleh di-log: kode (atau hash-nya), endpoint, status, dan latensi.
- Firestore hanya berisi data kode undangan dan hitungan pemakaian.
- Pemrosesan di Vertex AI mengikuti ketentuan data GCP. Builder memastikan pengaturan *data caching/logging* Vertex sesuai prinsip "tidak disimpan" sejauh yang bisa dikonfigurasi, dan mendokumentasikannya di layar "Data apa yang dikirim".

## 8. Prinsip UI ramah kesehatan mental

Ini kriteria terima untuk semua layar. **[Keputusan tim]** untuk tujuannya, rinciannya **[Usulan desainer]**.

1. **Beban kognitif rendah:** satu tujuan per layar, sedikit pilihan sekaligus, label berupa kata yang jelas (bukan ikon saja).
2. **Semua opsional kecuali memilih mood.** Tidak ada field wajib lain dan tidak ada validasi yang memarahi.
3. **Tanpa rasa bersalah:** tanpa streak, tanpa merah untuk mood rendah, tanpa tanda "bolong", tanpa hitungan mundur atau urgensi palsu.
4. **Bahasa:** hangat, tidak menghakimi, tidak menggurui, dan tidak memakai positivitas paksa seperti "Semangat! Pasti bisa!". Semua teks UI dan pesan error ditulis dengan nada ini, misalnya "Koneksi lagi bermasalah, catatanmu tetap tersimpan kok."
5. **Warna dan visual tenang:** palet lembut dan tidak mencolok. Mood rendah ditampilkan dengan warna netral atau sejuk, bukan alarm. Ada mode terang dan gelap mengikuti sistem, karena orang sering menulis jurnal di malam hari.
6. **Gerak lembut:** animasi pelan dan halus, tanpa efek kaget, getar, atau konfeti. Animasi dimatikan atau dikurangi kalau *reduce motion* aktif di sistem.
7. **Aksesibilitas:** target sentuh minimal 48dp, kontras teks memenuhi WCAG AA, mendukung pembesaran font sistem, dan elemen penting punya label untuk screen reader.
8. **Rasa aman:** catatan tidak pernah hilang karena error jaringan, draft tersimpan otomatis, dan tindakan merusak (hapus) selalu dikonfirmasi.
9. **Bantuan selalu terjangkau:** akses "Butuh bantuan?" tidak pernah lebih dari dua tap dari beranda.

Arah visual spesifik seperti palet, tipografi, dan ilustrasi atau maskot **[Diserahkan ke builder]**, dengan syarat memenuhi prinsip di atas. Gaya kertas vintage di slide presentasi **tidak wajib** diikuti.

## 9. Layar utama (garis besar)

**[Usulan desainer]** Tata letak detail [Diserahkan ke builder].

1. **Onboarding** (§6.11)
2. **Beranda:** sapaan sesuai waktu, pemilih mood besar ("Gimana perasaanmu sekarang?"), kartu insight terbaru jika ada, dan akses "Butuh bantuan?".
3. **Alur catat:** mood, lalu (opsional) konteks, pengalaman, coping, dan tulisan bebas dengan saran AI. Setelah disimpan, support sheet muncul bila perlu.
4. **Timeline:** daftar dan ringkasan visual mingguan atau bulanan, plus detail catatan dengan opsi edit dan hapus.
5. **Insight:** insight terbaru, pertanyaan reflektif, tanggapan dan refleksi, riwayat insight, dan tombol "Lihat polaku".
6. **Butuh bantuan?:** layanan nasional, konseling kampus, kontak pribadi.
7. **Pengaturan:** AI dan kode undangan, privasi dan data, pengingat, kontak bantuan, tentang MOJI.

Navigasi bawah [Usulan desainer]: Beranda, Timeline, Insight, Pengaturan.

## 10. Kualitas dan pengujian

- **Unit test wajib** untuk pattern engine (ambang, data minimum, beberapa konteks sekaligus, data kosong) dan safety check lokal.
- **Test untuk Cloud Functions:** validasi kode, rate limit, validasi skema respons, dan memastikan tidak ada isi teks di log.
- **Uji manual di HP Android sungguhan** sebelum dibagikan: mode offline, AI mati, kode tidak valid, batas tercapai, reduce motion, font besar, mode gelap.
- **Evaluasi prompt:** set kecil contoh catatan berbahasa Indonesia, termasuk bahasa gaul dan kasus berisiko, untuk mengecek bahwa insight tidak mendiagnosis atau mengarang dan bahwa deteksi risiko cukup sensitif.

## 11. Risiko yang diketahui

| Risiko | Mitigasi |
|---|---|
| Data hilang saat uninstall atau ganti HP | Peringatan jelas, fitur ekspor (P0), impor (P2) |
| Kode undangan bocor | Cabut per kode, rate limit per kode dan global, budget alert |
| Deteksi tanda bahaya meleset | Tiga lapis deteksi, akses bantuan selalu tersedia, aplikasi menegaskan bukan layanan darurat |
| Gemini memblokir atau keliru pada teks emosional | Structured output + validasi, fallback lokal, `risk_level` konservatif saat blokir |
| Nomor layanan nasional berubah | Verifikasi sebelum rilis; nomor disimpan sebagai konfigurasi yang mudah diubah |
| Tidak ada reviewer profesional untuk frasa berisiko dan nada AI | Sumber literatur dan pedoman publik, sikap konservatif, set evaluasi prompt (§10), penegasan "bukan layanan darurat" |
| Update APK menghapus data responden | Keystore dan package name tetap (EAS), perbaikan JS lewat EAS Update |
| Waktu 2–4 minggu ketat | Kerjakan P0 dulu; P1/P2 hanya jika waktu cukup |

## 12. Yang diserahkan ke builder (ringkasan)
- State management, library styling, struktur folder, ORM SQLite.
- Varian Cloud Functions (Firebase gen 2 atau Cloud Run functions) dan region.
- Ambang statistik pattern engine dan pola memburuk (harus terdokumentasi dan teruji).
- Daftar final sub-tag konteks, chip pengalaman, coping, bank pertanyaan reflektif, dan frasa safety check lokal.
- Arah visual (palet, tipografi, ilustrasi/maskot) dalam batas §8.
- Angka rate limit dan timeout.
