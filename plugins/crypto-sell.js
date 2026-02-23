// ============================================================
// CRYPTO SELL - Jual koin kembali ke wallet
// File: plugins/crypto-sell.js
// ============================================================
import { initCryptoEngine, COINS, getPrice, isValidCoin, formatNum } from '../lib/crypto-engine.js'

let handler = async (m, { conn, usedPrefix, args }) => {
    let user = global.db.data.users[m.sender]

    if (!user.cryptoWallet) user.cryptoWallet = 0
    if (!user.cryptoPortfolio) user.cryptoPortfolio = {}
    if (!user.cryptoBuyPrice) user.cryptoBuyPrice = {}
    initCryptoEngine()

    if (!args[0] || !args[1]) throw `❌ *Format salah!*\nGunakan: *${usedPrefix}crypto-sell <koin> <jumlah/all>*\n\n_Contoh: ${usedPrefix}crypto-sell BTC 0.5_\n_Jual semua: ${usedPrefix}crypto-sell BTC all_\n\nKoin tersedia: *${Object.keys(COINS).join(', ')}*`

    const symbol = args[0].toUpperCase()

    if (!isValidCoin(symbol)) throw `❌ *Koin "${symbol}" tidak ditemukan!*\nKoin tersedia: *${Object.keys(COINS).join(', ')}*`

    const owned = user.cryptoPortfolio[symbol] || 0
    if (owned <= 0) throw `❌ *Kamu tidak punya ${symbol}!*\n💡 Beli dulu: *${usedPrefix}crypto-buy ${symbol} <nominal>*`

    let sellAmount
    if (args[1].toLowerCase() === 'all') {
        sellAmount = owned
    } else {
        sellAmount = parseFloat(args[1])
    }

    if (!sellAmount || sellAmount <= 0) throw `❌ *Jumlah tidak valid!*`
    if (sellAmount > owned) throw `❌ *Kamu hanya punya ${owned} ${symbol}!*`

    const price = getPrice(symbol)
    const coin = COINS[symbol]
    const revenue = Math.floor(sellAmount * price)

    // Hitung profit/loss
    const avgBuyPrice = user.cryptoBuyPrice[symbol] || price
    const costBasis = Math.floor(sellAmount * avgBuyPrice)
    const pnl = revenue - costBasis
    const pnlPct = ((revenue - costBasis) / costBasis * 100).toFixed(2)
    const pnlEmoji = pnl >= 0 ? '🟢' : '🔴'
    const pnlSign = pnl >= 0 ? '+' : ''

    // Update portfolio
    user.cryptoPortfolio[symbol] = parseFloat((owned - sellAmount).toFixed(8))
    if (user.cryptoPortfolio[symbol] <= 0.00000001) {
        delete user.cryptoPortfolio[symbol]
        delete user.cryptoBuyPrice[symbol]
    }
    user.cryptoWallet += revenue

    // Tambahkan ke total profit tracking
    if (!user.cryptoTotalPnl) user.cryptoTotalPnl = 0
    user.cryptoTotalPnl += pnl

    await conn.reply(m.chat, `
╔══════════════════════╗
║  💰 *PENJUALAN BERHASIL* ║
╚══════════════════════╝

${coin.emoji} *${symbol}* (${coin.name})

✅ Kamu menjual *${sellAmount} ${symbol}*
💲 Harga jual    : ${formatNum(price)} / koin
💰 Total diterima: ${revenue.toLocaleString('id')}

━━━━━━━━━━━━━━━━━━━━━━
📊 *Analisis Trading*
   Harga beli avg  : ${formatNum(avgBuyPrice)}
   Modal           : ${costBasis.toLocaleString('id')}
   Hasil           : ${revenue.toLocaleString('id')}
   ${pnlEmoji} P&L: ${pnlSign}${pnl.toLocaleString('id')} (${pnlSign}${pnlPct}%)
━━━━━━━━━━━━━━━━━━━━━━
💼 Wallet sekarang : ${user.cryptoWallet.toLocaleString('id')}
📦 Sisa ${symbol}      : ${user.cryptoPortfolio[symbol] || 0}
━━━━━━━━━━━━━━━━━━━━━━

💡 *${usedPrefix}crypto-portofolio* — Cek semua aset kamu
`.trim(), m)
}

handler.help = ['crypto-sell']
handler.tags = ['game', 'rpg']
handler.command = /^crypto[-_]sell$/i

export default handler