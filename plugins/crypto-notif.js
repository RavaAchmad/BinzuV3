// ============================================================
// CRYPTO NOTIF - Set channel (newsletter) untuk broadcast harga
// File: plugins/crypto-notif.js
//
// CARA KERJA:
// - Owner set 1 channel (newsletter) sebagai tujuan broadcast
// - Bot harus jadi ADMIN/OWNER dari channel tersebut
// - Format JID newsletter: 123456789@newsletter
// - User yang mau notif tinggal FOLLOW channel tersebut
// - Tidak perlu subscribe per-grup, jadi tidak spam
//
// CARA DAPET NEWSLETTER JID:
// Buka WA Web → Channel → Inspect Element → cari "@newsletter"
// atau ketik .crypto-notif info <invite_code> untuk cek dulu
// ============================================================
import { isJidNewsletter } from 'baileys'

let handler = async (m, { conn, usedPrefix, args, isROwner, isOwner }) => {
    // Hanya owner yang bisa set newsletter
    if (!isROwner && !isOwner) throw `❌ *Hanya owner bot yang bisa mengatur ini!*`

    const sub = (args[0] || '').toLowerCase()
    const settings = global.db.data.settings[conn.user.jid] || {}

    // Tampilkan status kalau ga ada args
    if (!sub) {
        const current = settings.cryptoNewsletterJid
        return m.reply(`
╔══════════════════════╗
║  🔔 *CRYPTO NOTIF SETUP* ║
╚══════════════════════╝

📢 *Channel aktif saat ini:*
${current ? `✅ \`${current}\`` : '❌ Belum diset'}

━━━━━━━━━━━━━━━━━━━━━━
*Cara penggunaan:*

› *${usedPrefix}crypto-notif set <newsletter_jid>*
  Set channel tujuan broadcast
  _Contoh: ${usedPrefix}crypto-notif set 120363xxx@newsletter_

› *${usedPrefix}crypto-notif info <invite_code>*
  Cek metadata channel sebelum di-set
  _Contoh: ${usedPrefix}crypto-notif info 0029Vaf0HPMLdQeZ_

› *${usedPrefix}crypto-notif test*
  Kirim test broadcast ke channel yang sudah diset

› *${usedPrefix}crypto-notif off*
  Matikan broadcast (hapus channel yang diset)

━━━━━━━━━━━━━━━━━━━━━━
💡 *Bot harus jadi admin/owner channel!*
_Cara dapet JID: Buka WA Web → Channel → Inspect Element → cari @newsletter_
`.trim())
    }

    // ── SET ──────────────────────────────────────────────────
    if (sub === 'set') {
        const jid = args[1]?.trim()
        if (!jid) throw `❌ *Masukkan newsletter JID!*\nContoh: *${usedPrefix}crypto-notif set 120363xxx@newsletter*`

        // Validasi format JID newsletter
        const cleanJid = jid.includes('@newsletter') ? jid : jid + '@newsletter'
        if (!isJidNewsletter(cleanJid)) throw `❌ *JID tidak valid!*\nFormat yang benar: \`120363xxx@newsletter\``

        // Coba kirim pesan test untuk verifikasi bot adalah admin
        try {
            await conn.sendMessage(cleanJid, { text: '✅ Crypto notif channel berhasil diset!' })
        } catch (e) {
            throw `❌ *Gagal kirim ke channel!*\nPastikan bot adalah *admin/owner* channel tersebut.\nError: ${e.message}`
        }

        settings.cryptoNewsletterJid = cleanJid
        global.db.data.settings[conn.user.jid] = settings

        return m.reply(`
╔══════════════════════╗
║  ✅ *CHANNEL DISET!*   ║
╚══════════════════════╝

📢 Newsletter JID: \`${cleanJid}\`

Bot akan broadcast ke channel ini:
 • Update harga setiap *30 menit*
 • Alert pump/dump *> 10%*

💡 User tinggal *follow channel* untuk dapat notif!
`.trim())
    }

    // ── INFO ─────────────────────────────────────────────────
    if (sub === 'info') {
        const code = args[1]?.trim()
        if (!code) throw `❌ *Masukkan invite code channel!*\nContoh: *${usedPrefix}crypto-notif info 0029Vaf0HPMLdQeZ*`

        try {
            // Hapus prefix URL kalau user copas full URL
            const cleanCode = code.replace('https://whatsapp.com/channel/', '')
            const meta = await conn.newsletterMetadata('invite', cleanCode)

            return m.reply(`
╔══════════════════════╗
║  📋 *INFO CHANNEL*     ║
╚══════════════════════╝

📢 *${meta.name || 'Nama tidak tersedia'}*
🆔 JID: \`${meta.id}\`
👥 Followers: ${meta.subscriberCount?.toLocaleString('id') || '?'}
📝 Desc: ${meta.description || '-'}

━━━━━━━━━━━━━━━━━━━━━━
Untuk set channel ini:
*${usedPrefix}crypto-notif set ${meta.id}*
`.trim())
        } catch (e) {
            throw `❌ *Gagal ambil info channel!*\nPastikan invite code benar.\nError: ${e.message}`
        }
    }

    // ── TEST ─────────────────────────────────────────────────
    if (sub === 'test') {
        const jid = settings.cryptoNewsletterJid
        if (!jid) throw `❌ *Belum ada channel yang diset!*\nGunakan: *${usedPrefix}crypto-notif set <jid>*`

        try {
            const { updatePrices, COINS, getPrice, getPriceChange, getMiniChart, formatNum, initCryptoEngine } = await import('../lib/crypto-engine.js')
            initCryptoEngine()

            let rows = ''
            for (const [symbol, coin] of Object.entries(COINS)) {
                const price = getPrice(symbol)
                const change = getPriceChange(symbol)
                const chart = getMiniChart(symbol)
                const trend = change >= 0 ? '📈' : '📉'
                const sign = change >= 0 ? '+' : ''
                rows += `${coin.emoji} *${symbol}* — ${formatNum(price)}  ${trend} ${sign}${change.toFixed(2)}%\n`
                rows += `  ${chart}\n`
            }

            const testMsg = `
🧪 *TEST BROADCAST* 🧪
━━━━━━━━━━━━━━━━━━━━━━
${rows.trim()}
━━━━━━━━━━━━━━━━━━━━━━
_Ini adalah pesan test dari bot_
`.trim()

            await conn.sendMessage(jid, { text: testMsg })
            return m.reply(`✅ *Test broadcast berhasil dikirim ke channel!*\nCek channel: \`${jid}\``)
        } catch (e) {
            throw `❌ *Gagal kirim test!*\nError: ${e.message}`
        }
    }

    // ── OFF ──────────────────────────────────────────────────
    if (sub === 'off' || sub === 'disable') {
        const was = settings.cryptoNewsletterJid
        delete settings.cryptoNewsletterJid
        global.db.data.settings[conn.user.jid] = settings

        return m.reply(was
            ? `✅ *Broadcast crypto dimatikan!*\nChannel \`${was}\` tidak lagi menerima update.`
            : `ℹ️ *Broadcast memang belum aktif.*`
        )
    }

    throw `❌ *Sub-command tidak dikenal!*\nGunakan: *${usedPrefix}crypto-notif* untuk melihat panduan.`
}

handler.help = ['crypto-notif']
handler.tags = ['owner', 'game']
handler.command = /^crypto[-_]notif$/i

export default handler