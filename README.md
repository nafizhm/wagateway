# WA Gateway Service

Backend service WhatsApp berbasis Node.js dan Baileys. Service ini tidak memiliki dashboard; client seperti Laravel berkomunikasi melalui REST API.

## Fitur

- Multi session WhatsApp per `clientId`
- Restore session setelah restart
- QR login
- Kirim text, image, dan PDF/document
- Semua pesan masuk FIFO queue sebelum dikirim
- Retry otomatis maksimal 3 kali
- Callback status ke Laravel
- Health dan monitoring endpoint

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Server default berjalan di `http://localhost:3000`.

## Endpoint Utama

### Health

```http
GET /health
```

### Buat/restore session

```http
POST /sessions
Content-Type: application/json

{
  "clientId": "laravel-app-1"
}
```

### Ambil QR

```http
GET /sessions/laravel-app-1/qr
```

Response berisi QR text dan data URL image.

### Kirim text

```http
POST /messages/text
Content-Type: application/json

{
  "clientId": "laravel-app-1",
  "to": "6281234567890",
  "text": "Halo dari WA Gateway",
  "callbackUrl": "https://example.com/wa/callback"
}
```

### Kirim image

```http
POST /messages/image
Content-Type: application/json

{
  "clientId": "laravel-app-1",
  "to": "6281234567890",
  "imageUrl": "https://example.com/image.jpg",
  "caption": "Caption optional",
  "callbackUrl": "https://example.com/wa/callback"
}
```

`imagePath` juga didukung untuk file lokal yang dapat dibaca service.

### Kirim PDF/document

```http
POST /messages/pdf
Content-Type: application/json

{
  "clientId": "laravel-app-1",
  "to": "6281234567890",
  "documentUrl": "https://example.com/file.pdf",
  "fileName": "kwitansi.pdf",
  "caption": "Kwitansi",
  "callbackUrl": "https://example.com/wa/callback"
}
```

`documentPath` juga didukung untuk file lokal.

### Monitoring queue dan message

```http
GET /queue
GET /messages/:messageId
```

## Callback Payload

Saat pesan selesai atau gagal permanen, service mengirim:

```json
{
  "messageId": "uuid",
  "clientId": "laravel-app-1",
  "to": "6281234567890",
  "type": "text",
  "status": "sent",
  "attempts": 1,
  "error": null,
  "sentAt": "2026-07-30T00:00:00.000Z"
}
```

## Catatan Produksi

Baileys menyarankan storage auth production-grade untuk skala besar. Versi ini memakai `useMultiFileAuthState` per session agar mudah dipindahkan dan cukup ringan untuk fase awal PRD. Untuk skala lanjut, pindahkan queue ke Redis/BullMQ dan auth store ke database.
