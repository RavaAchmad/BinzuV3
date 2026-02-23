// ============================================================
// CRYPTO BUY - Beli koin dengan saldo wallet
// File: plugins/crypto-buy.js
// ============================================================
import { initCryptoEngine, COINS, getPrice, isValidCoin, formatNum } from '../lib/crypto-engine.js'

let handler = async (m, { conn, usedPrefix, args }) => {
    let user = global.db.data.users[m.sender]

    if (!user.cryptoWallet) user.cryptoWallet = 0
    if (!user.cryptoPortfolio) user.cryptoPortfolio = {}
    if (!user.cryptoBuyPrice) user.cryptoBuyPrice = {}  // harga rata-rata beli per koin
    initCryptoEngine()

    if (!args[0] || !args[1]) throw `❌ *Format salah!*\nGunakan: *${usedPrefix}crypto-buy <koin> <nominal>*\n\n_Contoh: ${usedPrefix}crypto-buy BTC 5000_\n\nKoin tersedia: *${Object.keys(COINS).join(', ')}*`

    const symbol = args[0].toUpperCase()
    const nominal = parseInt(args[1].replace(/[^0-9]/g, ''))

    if (!isValidCoin(symbol)) throw `❌ *Koin "${symbol}" tidak ditemukan!*\nKoin tersedia: *${Object.keys(COINS).join(', ')}*`
    if (!nominal || nominal < 10) throw `❌ *Minimal pembelian adalah 10!*`
    if (nominal > user.cryptoWallet) throw `❌ *Saldo wallet tidak cukup!*\n💼 Wallet: ${user.cryptoWallet.toLocaleString('id')}\n💸 Beli: ${nominal.toLocaleString('id')}`

    const price = getPrice(symbol)
    const coin = COINS[symbol]

    // Hitung jumlah koin yang didapat (8 desimal presisi)
    const amount = parseFloat((nominal / price).toFixed(8))

    if (amount <= 0) throw `❌ *Nominal terlalu kecil untuk membeli ${symbol}!*\nHarga ${symbol}: ${formatNum(price)}`

    // Update portfolio
    user.cryptoWallet -= nominal
    user.cryptoPortfolio[symbol] = parseFloat(((user.cryptoPortfolio[symbol] || 0) + amount).toFixed(8))

    // Update harga rata-rata beli (weighted average)
    const prevAmount = (user.cryptoPortfolio[symbol] || 0) - amount
    const prevAvgPrice = user.cryptoBuyPrice[symbol] || price
    const totalAmount = user.cryptoPortfolio[symbol]
    if (prevAmount > 0) {
        user.cryptoBuyPrice[symbol] = Math.round(
            (prevAvgPrice * prevAmount + price * amount) / totalAmount
        )
    } else {
        user.cryptoBuyPrice[symbol] = price
    }

    await conn.reply(m.chat, `
╔══════════════════════╗
║  🛒 *PEMBELIAN BERHASIL* ║
╚══════════════════════╝

${coin.emoji} *${symbol}* (${coin.name})

✅ Kamu membeli *${amount} ${symbol}*
💲 Harga beli   : ${formatNum(price)} / koin
💸 Total bayar  : ${nominal.toLocaleString('id')}

━━━━━━━━━━━━━━━━━━━━━━
💼 Wallet sisa   : ${user.cryptoWallet.toLocaleString('id')}
📦 Total ${symbol} kamu: ${user.cryptoPortfolio[symbol]}
━━━━━━━━━━━━━━━━━━━━━━

💡 *${usedPrefix}crypto-portofolio* — Cek semua aset kamu
💡 *${usedPrefix}crypto-sell ${symbol} all* — Jual saat harga naik!
`.trim(), m)
}

handler.help = ['crypto-buy']
handler.tags = ['game', 'rpg']
handler.command = /^crypto[-_]buy$/i

export default handler