# MOJI Functions

Satu Cloud Function HTTP (`api`) dengan rute `GET /health`, `POST /analyzeEntry`, `POST /writeInsight`. Setiap request wajib membawa header `X-Moji-Invite`.

## Perintah

```bash
npm test            # vitest
npm run typecheck
npm run build       # tsc, tanpa file test
npm start           # functions-framework lokal (butuh env var + kredensial ADC)
```

## Environment variable

| Nama | Wajib | Default | Arti |
|---|---|---|---|
| `MOJI_MODEL` | ya | - | Nama model Gemini di Vertex AI |
| `MOJI_VERTEX_LOCATION` | tidak | `global` | Lokasi Vertex AI |
| `GOOGLE_CLOUD_PROJECT` | ya (diisi otomatis di Cloud Functions) | - | Project GCP |
| `MOJI_PER_CODE_LIMIT` | tidak | `50` | Batas request per kode per hari (WIB) |
| `MOJI_GLOBAL_LIMIT` | tidak | `1000` | Batas request semua kode per hari (WIB) |

Tidak ada rahasia di repo. Kredensial berasal dari service account function.

## Firestore

Buat database Firestore mode **Native** di project yang sama:

```bash
gcloud firestore databases create --location=asia-southeast2 --type=firestore-native
```

Isinya hanya koleksi `invites` (kode, status, label, hitungan harian) dan `usage` (hitungan global per hari).

## IAM service account

Service account yang menjalankan function memerlukan:

- `roles/aiplatform.user` (Vertex AI User)
- `roles/datastore.user` (Cloud Datastore User, untuk Firestore)

## Deploy

```bash
gcloud functions deploy api \
  --gen2 --runtime=nodejs24 \
  --region=asia-southeast2 \
  --source=. --entry-point=api \
  --trigger-http --allow-unauthenticated \
  --service-account=<SA_EMAIL> \
  --set-env-vars MOJI_MODEL=<nama-model>,MOJI_VERTEX_LOCATION=global,MOJI_PER_CODE_LIMIT=50,MOJI_GLOBAL_LIMIT=1000
```

`--allow-unauthenticated` aman karena akses dijaga kode undangan di dalam function. URL hasil deploy menjadi `EXPO_PUBLIC_API_URL` di app.

## Kode undangan

Butuh kredensial ADC (`gcloud auth application-default login`) dan `GOOGLE_CLOUD_PROJECT`.

```bash
npm run invites -- create 20 --prefix R   # mencetak CSV label,code ke stdout
npm run invites -- revoke MOJI-R07-K3F9
npm run invites -- list
```

## Budget alert

1. Buka Cloud Console, **Billing**, **Budgets & alerts**, **Create budget**.
2. Pilih project MOJI, tentukan jumlah bulanan yang wajar.
3. Tambahkan ambang peringatan (misalnya 50%, 90%, 100%) dengan notifikasi email.
4. Batas harian (`MOJI_GLOBAL_LIMIT`) tetap menjadi pengaman utama; budget alert hanya pemberi tahu.

## Data & logging Vertex

- Function tidak menyimpan dan tidak me-log teks catatan maupun insight. Log hanya berisi endpoint, status, latensi, hash kode, dan kode alasan tetap.
- Firestore hanya menyimpan data kode undangan dan hitungan pemakaian.
- Teks diproses oleh Vertex AI sesuai ketentuan data GCP. Function tidak mengaktifkan penyimpanan prompt/respons. Pastikan fitur logging request-response Vertex (jika ada) tetap nonaktif di project, dan periksa pengaturan data caching/abuse monitoring pada model yang dipakai. Hasil pemeriksaan ini dirangkum di layar "Data apa yang dikirim" di app.
