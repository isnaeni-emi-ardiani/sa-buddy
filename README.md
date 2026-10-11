# SA Buddy

Chatbot asisten **System Analyst** berbasis Google Gemini API. SA Buddy membantu menggali kebutuhan sistem, lalu menyusun user story, use case, dan ringkasan BRD dalam Bahasa Indonesia.

Dibuat sebagai Final Project **AI Productivity and AI API Integration for Developers** (Hacktiv8).

> Hasil SA Buddy adalah **draf**. Analis manusia tetap perlu meninjau dan memvalidasinya dengan stakeholder.

## Fitur

- **Empat mode kerja:** Gali kebutuhan, User story, Use case, dan Ringkas BRD. Tiap mode menambahkan instruksi khusus ke model.
- **Memori percakapan:** riwayat chat dikirim ulang ke model, sehingga jawaban nyambung dengan diskusi sebelumnya.
- **System instruction:** persona analis senior, bahasa Indonesia, bertanya dulu bila informasi kurang, menandai asumsi, dan menolak topik di luar analisis sistem.
- **Parameter terkontrol:** `temperature 0.3`, `top_p 0.9`, `top_k 32` agar dokumen konsisten dan tidak mengarang.
- **Tampilan Markdown:** tabel, daftar, dan heading ter-render rapi, dengan sanitasi terhadap HTML berbahaya.
- **Salin dan unduh:** salin jawaban per pesan, atau unduh seluruh percakapan sebagai file `.md`.
- **Penanganan error:** pesan yang jelas untuk API key salah, kuota habis, atau server tidak aktif.

## Teknologi

- Backend: Node.js, Express, `@google/genai`, `dotenv`, `cors`
- Model: Gemini (default `gemini-3-flash-preview`, bisa diganti lewat `.env`)
- Frontend: HTML, CSS, dan JavaScript biasa (tanpa framework), dengan `marked` dan `DOMPurify` via CDN

## Arsitektur

```
Browser (public/)  --POST /api/chat-->  Express (index.js)  --generateContent-->  Gemini API
                   <---- { result } ----
```

API key hanya ada di server (`.env`) dan tidak pernah dikirim ke browser.

## Cara menjalankan

Prasyarat: Node.js 18 atau lebih baru dan Gemini API key dari [Google AI Studio](https://aistudio.google.com/).

```bash
git clone <url-repo-ini>
cd sa-buddy
npm install
```

Buat file `.env` dari contoh, lalu isi API key:

```bash
cp .env.example .env
```

```
GEMINI_API_KEY=isi_api_key_anda
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_TEMPERATURE=0.3
PORT=3000
```

Jalankan server:

```bash
npm start
```

Buka `http://localhost:3000` di browser.

## API

`POST /api/chat`

```json
{
  "conversation": [
    { "role": "user", "text": "Buatkan user story untuk fitur login." }
  ],
  "mode": "user-story"
}
```

`mode` adalah salah satu dari `gali`, `user-story`, `use-case`, `brd`. Balasan sukses: `{ "result": "..." }`. Balasan gagal: `{ "error": "..." }`.

## Struktur proyek

```
├── index.js          server Express dan endpoint /api/chat
├── package.json
├── .env.example      template konfigurasi (salin menjadi .env)
├── .gitignore
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

## Contoh pertanyaan

- "Saya mau buat aplikasi pemesanan ruang rapat, mulai dari mana?"
- "Buatkan user story untuk fitur login dan reset password."
- "Buat use case untuk proses pengajuan cuti karyawan."
- "Apa saja kebutuhan non-fungsional untuk aplikasi kasir?"

## Keamanan

- File `.env` masuk `.gitignore` dan tidak boleh di-commit.
- Input divalidasi di server (format, panjang pesan, jumlah riwayat).
- Jawaban model disanitasi sebelum ditampilkan di browser.
