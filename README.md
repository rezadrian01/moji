# MOJI: More Than Just a Mood

Jurnal digital dan mood tracker yang ramah kesehatan mental. MOJI tidak berhenti pada mencatat apa yang kamu rasakan; MOJI membantu memahami **kenapa** perasaan itu muncul, lewat alur *mood → konteks → pola → insight → refleksi*.

- **Aplikasi:** Android, React Native + Expo SDK 58 (`app/`).
- **Backend:** server Node.js (`functions/`) yang memanggil Gemini lewat Vertex AI. Untuk demo, server ini dijalankan lokal di laptop.
- **Privasi:** semua catatan hanya tersimpan di HP. AI bersifat opsional, dan server tidak menyimpan isi tulisan.

## Mulai cepat

```bash
./run-demo.sh
```

Satu perintah ini menyalakan server lokal dan emulator, lalu memasang dan membuka aplikasi. Persiapan sekali saja (login Google, `functions/.env`, kode undangan) ada di **[docs/RUNNING.md](docs/RUNNING.md)**.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/RUNNING.md](docs/RUNNING.md) | Cara menjalankan proyek (satu perintah atau manual) dan troubleshooting |
| [docs/SETUP.md](docs/SETUP.md) | Setup lengkap dari nol, termasuk opsi Cloud Run dan EAS |
| [docs/manual/MOJI-Manual-Book.pdf](docs/manual/MOJI-Manual-Book.pdf) | Manual book: fitur, cara pakai, dan alur, dengan screenshot |
| [docs/manual/MOJI-Katalog-UI.pdf](docs/manual/MOJI-Katalog-UI.pdf) | Katalog semua tampilan UI |
| [docs/release-checklist.md](docs/release-checklist.md) | Checklist sebelum demo atau rilis |
| [docs/safety-phrases.md](docs/safety-phrases.md) | Daftar frasa jaring pengaman lokal |
| [docs/superpowers/specs/](docs/superpowers/specs/) | Spesifikasi desain |
| [functions/README.md](functions/README.md) | Detail backend: env, kode undangan, evaluasi prompt |

## Tim

Ahmad Reza Adrian · Ahmad Wildan Putro Santoso · Fathan Alfariel Adhyaksa · Juhari

> MOJI bukan alat diagnosis dan bukan layanan darurat.
