# BinzuV3

BinzuV3 adalah WhatsApp bot berbasis Baileys untuk operasional chat, grup, konten, RPG, downloader, sticker, dan automasi commerce. Update utama proyek ini diarahkan ke jalur commerce: order, deposit, payment, premium, store flow, dan webhook promosi.

## Status Produk

- Fokus utama: commerce bot untuk order/deposit/payment di WhatsApp.
- Fokus pendukung: stabilitas plugin, menu, webhook, dan debug operasional.
- Fokus tambahan: RPG/chat retention tetap dipertahankan sebagai fitur retensi, bukan arah utama rilis.

## Tech Stack

- Runtime: Node.js 20+ dengan ESM.
- WhatsApp socket: `@whiskeysockets/baileys@7.0.0-rc10`.
- HTTP server: Express.
- Database default: LowDB JSON file (`database.json`).
- Database opsional: MongoDB atau remote cloud DB adapter lewat `--db`.
- Media tooling: FFmpeg, ImageMagick/GraphicsMagick, canvas/webp tooling.
- Monitoring: PM2 metrics dan health endpoint.

## Core Capabilities

- WhatsApp bot dengan pairing code authentication.
- Dynamic plugin loader untuk command di folder `plugins/`.
- Webhook HTTP untuk pengiriman pesan promo.
- Group management, owner tools, downloader, sticker, tools, fun/game, info, dan internet commands.
- Commerce primitives: premium/sewa, store list, QRIS/media payment reference, crypto minigame economy, deposit/withdraw command family.
- RPG/chat retention: legacy RPG inventory, dungeon, mission, leaderboard, text-RPG modular service.
- Health and debug: `/health`, `webhook-tester.js`, PM2 metric registered users.

## Quick Start

```bash
npm install
npm start
```

Saat pertama dijalankan, bot akan meminta nomor WhatsApp dan menampilkan pairing code. Session disimpan di folder `sessions/`.

## Configuration

Konfigurasi utama ada di `config.js`.

Bagian yang paling sering diubah:

```js
global.info = {
  nomorbot: '62895325866441',
  nomorown: '6281212035575',
  namebot: 'Binzu Bot',
  nameown: 'RV',
  channel: '120363406567158177@newsletter',
  namechannel: 'Binzu | WhatsApp Bots'
}

global.APIs = {
  btc: 'https://ravaja.my.id'
}
```

Environment yang didukung:

- `PORT`: port Express server, default `5000`.
- `BAILEYS_SYNC_FULL_HISTORY` / `WA_SYNC_FULL_HISTORY`: aktifkan full history sync jika diperlukan.
- `BOT_PORT` / `BOT_HOST`: dipakai oleh `webhook-tester.js`.
- `BINZU_INTERNAL_API_KEY`: API key rahasia untuk menerima webhook internal Ravion.
- `RAVION_API_BASE_URL`: base URL backend Ravion untuk integrasi command/status berikutnya.

## HTTP Endpoints

```text
GET  /health
POST /webhook/send-promo
POST /webhook/ravion-notify
```

Contoh payload promo:

```json
{
  "number": "6281234567890",
  "message": "Promo BinzuV3"
}
```

Endpoint Ravion wajib memakai header `x-ravion-key` yang cocok dengan `BINZU_INTERNAL_API_KEY`.
Field `number` wajib memakai format `62` tanpa `+`, spasi, atau awalan `0`, contoh `6281234567890`.

Contoh payload Ravion:

```json
{
  "event": "PAYMENT_RECEIVED",
  "number": "6281234567890",
  "payload": {
    "customerName": "Rava",
    "orderId": "RVN-12345678",
    "productName": "Ravion Comet",
    "amount": 10000
  }
}
```

Event Ravion yang didukung:

- `PAYMENT_RECEIVED`
- `ORDER_PROVISIONING`
- `ORDER_PROVISIONED`
- `ORDER_FAILED`

## Product Direction

Jalur yang dipilih untuk BinzuV3 adalah commerce.

Prioritas berikutnya:

1. Rapikan order flow: command order, validasi produk, invoice, status, dan riwayat order.
2. Rapikan deposit/payment: QRIS, manual confirmation, saldo, callback/webhook jika provider tersedia.
3. Satukan premium/store: premium, sewa, limit, store list, dan broadcast promo dalam satu alur.
4. Tambahkan dashboard/debug ringan untuk melihat health, antrean order, dan error plugin.

## Technical Notes

Lihat [CHANGELOG.md](./CHANGELOG.md) untuk catatan migrasi Baileys rc10, perubahan interactive buttons, dan compatibility notes.

Peta sistem utama tersedia di [SYSTEM_MAP.md](./SYSTEM_MAP.md).

## Development Commands

```bash
npm start
npm test
node webhook-tester.js
node bot-monitor.js
```

## Runtime Data

- `sessions/`: kredensial WhatsApp multi-file auth.
- `database.json`: database default LowDB.
- `bot-status.json`: status monitor jika health monitor menulis file.
- `bot-health.log`: log monitor jika tersedia.
- `tmp/`: temporary media/runtime artifacts.

## Compatibility

- Gunakan Node.js 20+.
- Baileys saat ini memakai rc10, jadi perilaku pairing, LID/PN mapping, dan interactive message bisa berubah antar rilis.
- FFmpeg diperlukan untuk video/audio/sticker.
- ImageMagick atau GraphicsMagick diperlukan untuk sebagian fitur image/sticker.
- Jika memakai MongoDB, jalankan dengan argumen `--db mongodb://...`.

## Repository

- GitHub: https://github.com/RavaAchmad/BinzuV3
- Main entrypoint: `index.js`
- Bot bootstrap: `main.js`
- Message dispatcher: `handler.js`
