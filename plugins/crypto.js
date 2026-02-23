// ============================================================
// CRYPTO MINIGAME - MAIN GUIDE
// File: plugins/crypto.js
// ============================================================

let handler = async (m, { conn, usedPrefix }) => {
    let user = global.db.data.users[m.sender]

    // Init crypto fields jika belum ada
    if (!user.cryptoWallet) user.cryptoWallet = 0
    if (!user.cryptoPortfolio) user.cryptoPortfolio = {}
    if (!user.cryptoTotalDeposit) user.cryptoTotalDeposit = 0

    // Ambil newsletter channel dari settings bot
    const settings = global.db.data.settings[conn.user.jid] || {}
    const newsletterJid = settings.cryptoNewsletterJid || null

    // Coba ambil invite link channel kalau JID sudah diset
    let channelSection = ''
    if (newsletterJid) {
        try {
            const meta = await conn.newsletterMetadata('jid', newsletterJid)
            const inviteLink = meta?.inviteCode
                ? `https://whatsapp.com/channel/${meta.inviteCode}`
                : null
            const channelName = meta?.name || 'Crypto Update'

            channelSection = `
━━━━━━━━━━━━━━━━━━━━━━━
📢 *CHANNEL UPDATE HARGA*
━━━━━━━━━━━━━━━━━━━━━━━
Biar ga ketinggalan info pump & dump, *follow channel* berikut:

📣 *${channelName}*
${inviteLink ? `🔗 ${inviteLink}` : `🆔 \`${newsletterJid}\``}

✅ Kamu akan dapat:
 • Update harga otomatis setiap *30 menit*
 • Alert khusus saat ada koin *naik/turun > 10%*
 • Info market tanpa spam di chat
`
        } catch (e) {
            // Channel ada tapi gagal fetch metadata, tetap tampil JID-nya
            channelSection = `
━━━━━━━━━━━━━━━━━━━━━━━
📢 *CHANNEL UPDATE HARGA*
━━━━━━━━━━━━━━━━━━━━━━━
Follow channel berikut untuk notif harga otomatis:
🆔 \`${newsletterJid}\`
_Cari channel ini di WhatsApp kamu!_
`
        }
    } else {
        // Channel belum diset owner, kasih hint saja
        channelSection = `
━━━━━━━━━━━━━━━━━━━━━━━
💡 *Tips buat kamu:*
Minta owner bot untuk mengaktifkan channel
notifikasi harga crypto agar kamu dapat
update otomatis tanpa spam!
`
    }

    const caption = `
╔═══════════════════════╗
║   💹 *CRYPTO MINIGAME*  ║
╚═══════════════════════╝

Selamat datang di *Crypto Exchange*!
Investasikan uangmu, ikuti pasar, dan raih keuntungan maksimal.

💰 *Saldo Money:*  ${(user.money || 0).toLocaleString('id')}
💼 *Crypto Wallet:* ${user.cryptoWallet.toLocaleString('id')}

━━━━━━━━━━━━━━━━━━━━━━━
📋 *DAFTAR FITUR & CARA PAKAI*
━━━━━━━━━━━━━━━━━━━━━━━

*💸 Kelola Wallet*
› ${usedPrefix}crypto-deposit <nominal>
  Setor uang dari saldo ke crypto wallet
  _Contoh: ${usedPrefix}crypto-deposit 10000_

› ${usedPrefix}crypto-withdraw <nominal>
  Tarik uang dari wallet ke saldo
  _Contoh: ${usedPrefix}crypto-withdraw 5000_

━━━━━━━━━━━━━━━━━━━━━━━

*📊 Market & Harga*
› ${usedPrefix}crypto-market
  Lihat harga semua koin secara realtime
  Termasuk grafik tren naik/turun

━━━━━━━━━━━━━━━━━━━━━━━

*🛒 Trading*
› ${usedPrefix}crypto-buy <koin> <nominal>
  Beli koin dengan uang dari wallet
  _Contoh: ${usedPrefix}crypto-buy BTC 5000_

› ${usedPrefix}crypto-sell <koin> <jumlah/all>
  Jual koin kembali ke wallet
  _Contoh: ${usedPrefix}crypto-sell BTC 0.5_
  _Jual semua: ${usedPrefix}crypto-sell BTC all_

━━━━━━━━━━━━━━━━━━━━━━━

*📈 Portfolio*
› ${usedPrefix}crypto-portofolio
  Lihat semua koin yang kamu punya
  beserta nilai sekarang & profit/loss

━━━━━━━━━━━━━━━━━━━━━━━

*🪙 Koin yang Tersedia:*
BTC · ETH · BNB · SOL · DOGE · ADA · XRP · MATIC
${channelSection}
━━━━━━━━━━━━━━━━━━━━━━━
_Harga bergerak dinamis setiap 5 menit._
_Beli saat rendah, jual saat tinggi!_ 🚀
`.trim()

    await conn.reply(m.chat, caption, m)
}

handler.help = ['crypto']
handler.tags = ['game', 'rpg']
handler.command = /^crypto$/i

export default handler