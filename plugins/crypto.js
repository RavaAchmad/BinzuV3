// ============================================================
// CRYPTO MINIGAME - MAIN GUIDE
// File: plugins/crypto.js
// ============================================================

let handler = async (m, { conn, usedPrefix }) => {
    let user = global.db.data.users[m.sender]

    if (!user.cryptoPortfolio) user.cryptoPortfolio = {}

    // Ambil newsletter channel dari settings bot
    const settings      = global.db.data.settings[conn.user.jid] || {}
    const newsletterJid = settings.cryptoNewsletterJid || null

    // Hitung total nilai koin yang dimiliki
    let totalCoinValue = 0
    try {
        const { initCryptoEngine, getPrice } = await import('../lib/crypto-engine.js')
        initCryptoEngine()
        for (const [symbol, amount] of Object.entries(user.cryptoPortfolio)) {
            if (amount > 0) totalCoinValue += Math.floor(amount * getPrice(symbol))
        }
    } catch (e) {}

    // Coba ambil invite link channel
    let channelSection = ''
    if (newsletterJid) {
        try {
            const meta       = await conn.newsletterMetadata('jid', newsletterJid)
            const inviteLink = meta?.inviteCode
                ? `https://whatsapp.com/channel/${meta.inviteCode}`
                : null
            const channelName = meta?.name || 'Crypto Update'

            channelSection = `
━━━━━━━━━━━━━━━━━━━━━━━
📢 *CHANNEL UPDATE HARGA*
━━━━━━━━━━━━━━━━━━━━━━━
Follow channel ini biar ga ketinggalan pump!

📣 *${channelName}*
${inviteLink ? `🔗 ${inviteLink}` : `🆔 \`${newsletterJid}\``}

✅ Update otomatis tiap *30 menit*
🚨 Alert saat koin *naik/turun > 10%*`
        } catch (e) {
            channelSection = `
━━━━━━━━━━━━━━━━━━━━━━━
📢 *CHANNEL UPDATE HARGA*
━━━━━━━━━━━━━━━━━━━━━━━
🆔 \`${newsletterJid}\`
_Follow channel ini untuk notif harga otomatis!_`
        }
    } else {
        channelSection = `
━━━━━━━━━━━━━━━━━━━━━━━
💡 *Tips:* Minta owner aktifkan channel notifikasi
crypto agar kamu dapat update harga otomatis!`
    }

    const caption = `
╔═══════════════════════╗
║   💹 *CRYPTO MINIGAME*  ║
╚═══════════════════════╝

Investasikan saldomu, ikuti pasar, dan raih profit!

💰 *Saldo Money  :* ${(user.money || 0).toLocaleString('id')}
📦 *Nilai Koin   :* ${totalCoinValue.toLocaleString('id')}
💎 *Total Aset   :* ${((user.money || 0) + totalCoinValue).toLocaleString('id')}

━━━━━━━━━━━━━━━━━━━━━━━
📋 *CARA PAKAI*
━━━━━━━━━━━━━━━━━━━━━━━

*📊 Lihat Harga*
› ${usedPrefix}crypto-market
  Harga semua koin + grafik tren

*🛒 Beli Koin*
› ${usedPrefix}crypto-buy <koin> <nominal>
  _Contoh: ${usedPrefix}crypto-buy BTC 5000_
  Uang langsung dipotong dari saldo

*💰 Jual Koin*
› ${usedPrefix}crypto-sell <koin> <jumlah/all>
  _Contoh: ${usedPrefix}crypto-sell BTC all_
  Uang langsung masuk ke saldo
  ⚠️ Kena pajak *15%* + cooldown *8 jam*

*📈 Portfolio*
› ${usedPrefix}crypto-portofolio
  Semua koin + profit/loss kamu

━━━━━━━━━━━━━━━━━━━━━━━
*🪙 Koin Tersedia:*
₿ BTC · ⟠ ETH · 🔶 BNB · ◎ SOL
🐕 DOGE · 🔵 ADA · 💧 XRP · 🟣 MATIC
https://whatsapp.com/channel/0029Vb7T0uc8F2pJm1e4Uo0I
━━━━━━━━━━━━━━━━━━━━━━━
_Harga bergerak tiap 5 menit. Beli rendah, jual tinggi!_ 🚀
`.trim()

    await conn.reply(m.chat, caption, m)
}

handler.help = ['crypto']
handler.tags = ['game', 'rpg']
handler.command = /^crypto$/i

export default handler