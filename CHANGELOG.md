# Changelog

## BinzuV3 Commerce Direction

### Branding cleanup

- README diperbarui dari XMYULA-MD menjadi BinzuV3.
- Metadata package diarahkan ke repository `RavaAchmad/BinzuV3`.
- Deskripsi proyek diperbarui menjadi WhatsApp commerce automation bot dengan fitur pendukung plugin, RPG, downloader, dan webhook.

### Product direction

Jalur utama yang dipilih: commerce.

Alasan teknis:

- Proyek sudah punya fondasi premium/sewa, limit, store commands, QRIS/media payment reference, broadcast, webhook promo, dan command deposit/withdraw.
- Flow commerce lebih mudah dijadikan update utama karena punya nilai produk yang jelas: order, payment, saldo, premium, dan promo.
- RPG tetap dipakai sebagai retention layer, tetapi bukan fokus utama rilis BinzuV3.

Prioritas modul:

1. Order lifecycle: create order, invoice, status, cancel, done.
2. Deposit/payment: QRIS/manual proof, saldo, confirmation, mutation log.
3. Premium/store: sinkronisasi sewa, premium time, limit, dan store catalog.
4. Debug dashboard: health, plugin errors, webhook test, dan order diagnostics.

## Technical Changelog

### Baileys rc10 migration

- Dependency Baileys menggunakan alias npm `baileys: npm:@whiskeysockets/baileys@7.0.0-rc10`.
- Connection bootstrap dipusatkan di `lib/connection.js:createConnection`.
- Auth memakai `useMultiFileAuthState(authFile)` dengan session default `sessions/`.
- Pairing code handled oleh `lib/connection.js:handlePairing`.
- Reconnect flow dipusatkan di `connectionUpdate` dengan error classification:
  - fatal logged out
  - restart required
  - session/bad mac
  - transient network
  - rate limit
- LID/PN compatibility ditangani di:
  - `lib/simple.js:makeWASocket`
  - `lib/simple.js:smsg`
  - `lib/jid-helper.js`
- Bad MAC/session error dibuat non-fatal di `lib/bad-mac-handler.js` dan `handler.js`.

### Interactive buttons

- Interactive message helper dipusatkan di `lib/buttons.js:interactiveMsg`.
- Helper mendukung native interactive format dan fallback text jika WA client/helper internal tidak tersedia.
- RPG follow-up memakai `handler.js:sendRpgFollowup` -> `lib/rpg-engagement.js:buildRpgPostUseMenu` -> `interactiveMsg`.
- Text-RPG memakai `lib/text-rpg/index.js:handleTextRpgCommand` untuk mengirim menu/button service response.
- Beberapa command lama masih memakai reply text biasa; migrasi button belum seragam di seluruh plugin.

### Compatibility notes

- Node.js 20+ direkomendasikan.
- Baileys rc10 masih release candidate; breaking changes dapat terjadi pada interactive message, auth state, dan LID mapping.
- Full history sync nonaktif secara default; dapat diaktifkan lewat `BAILEYS_SYNC_FULL_HISTORY=true` atau `WA_SYNC_FULL_HISTORY=true`.
- FFmpeg wajib untuk fitur audio/video/sticker.
- ImageMagick/GraphicsMagick diperlukan untuk sebagian fitur image conversion.
- Database default adalah `database.json`; MongoDB/cloud DB hanya aktif jika `--db` diberikan.
- Plugin loader masih dynamic import dari `plugins/*.js`, sehingga error syntax satu plugin bisa memengaruhi load plugin tersebut tetapi tidak seharusnya menghentikan semua plugin.
- Beberapa modul masih memakai global mutable state (`global.db`, `global.plugins`, `conn.room`, `conn.youtubePlay`), sehingga perubahan schema perlu dilakukan hati-hati.
