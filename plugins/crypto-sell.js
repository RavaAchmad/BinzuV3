// ============================================================
// CRYPTO SELL - Jual koin langsung ke user.money
// File: plugins/crypto-sell.js
//
// PROTEKSI EKONOMI RPG (dipindah dari withdraw):
// ✦ Pajak jual 15% (hangus) — cegah money printer
// ✦ Cooldown 8 jam per sell — cegah spam flip
// ============================================================
import { initCryptoEngine, COINS, getPrice, isValidCoin, formatNum } from '../lib/crypto-engine.js'

const TAX_RATE   = 0.15
const COOLDOWN_MS = 8 * 60 * 60 * 1000  // 8 jam

let handler = async (m, { conn, usedPrefix, args }) => {
    let user = global.db.data.users[m.sender]

    if (!user.cryptoPortfolio) user.cryptoPortfolio = {}
    if (!user.cryptoBuyPrice) user.cryptoBuyPrice = {}
    if (!user.cryptoLastSell) user.cryptoLastSell = 0
    initCryptoEngine()

    if (!args[0] || !args[1]) throw `❌ *Format salah!*
Gunakan: *${usedPrefix}crypto-sell <koin> <jumlah/all>*

_Contoh: ${usedPrefix}crypto-sell BTC 0.5_
_Jual semua: ${usedPrefix}crypto-sell BTC all_

⚠️ _Penjualan dikenakan pajak *15%*_
⏳ _Cooldown *8 jam* per penjualan_`

    // Cek cooldown
    const now = Date.now()
    const sisaCooldown = COOLDOWN_MS - (now - user.cryptoLastSell)
    if (sisaCooldown > 0) {
        const jam   = Math.floor(sisaCooldown / (60 * 60 * 1000))
        const menit = Math.floor((sisaCooldown % (60 * 60 * 1000)) / (60 * 1000))
        throw `⏳ *Cooldown jual belum habis!*

Kamu bisa jual lagi dalam:
⏱ *${jam} jam ${menit} menit*

_Penjualan dibatasi 1x per 8 jam._`
    }

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

    const price      = getPrice(symbol)
    const coin       = COINS[symbol]
    const gross      = Math.floor(sellAmount * price)
    const tax        = Math.floor(gross * TAX_RATE)
    const diterima   = gross - tax

    // Hitung P&L
    const avgBuyPrice = user.cryptoBuyPrice[symbol] || price
    const costBasis   = Math.floor(sellAmount * avgBuyPrice)
    const pnl         = diterima - costBasis   // pakai nilai setelah pajak
    const pnlPct      = costBasis > 0 ? ((pnl / costBasis) * 100).toFixed(2) : '0.00'
    const pnlEmoji    = pnl >= 0 ? '🟢' : '🔴'
    const pnlSign     = pnl >= 0 ? '+' : ''

    // Update data
    user.cryptoPortfolio[symbol] = parseFloat((owned - sellAmount).toFixed(8))
    if (user.cryptoPortfolio[symbol] <= 0.00000001) {
        delete user.cryptoPortfolio[symbol]
        delete user.cryptoBuyPrice[symbol]
    }
    user.money = (user.money || 0) + diterima
    user.cryptoLastSell = now

    if (!user.cryptoTotalPnl) user.cryptoTotalPnl = 0
    user.cryptoTotalPnl += pnl

    await conn.reply(m.chat, `
╔══════════════════════╗
║  💰 *PENJUALAN BERHASIL* ║
╚══════════════════════╝

${coin.emoji} *${symbol}* (${coin.name})

✅ Terjual         : *${sellAmount} ${symbol}*
💲 Harga jual      : ${formatNum(price)} / koin
💰 Hasil kotor     : ${gross.toLocaleString('id')}
🏦 Pajak 15%       : -${tax.toLocaleString('id')}
✅ Diterima        : *${diterima.toLocaleString('id')}*

━━━━━━━━━━━━━━━━━━━━━━
📊 *Analisis Trading*
   Harga beli avg  : ${formatNum(avgBuyPrice)}
   Modal           : ${costBasis.toLocaleString('id')}
   ${pnlEmoji} P&L (after tax): ${pnlSign}${pnl.toLocaleString('id')} (${pnlSign}${pnlPct}%)
━━━━━━━━━━━━━━━━━━━━━━
💰 Saldo Money    : ${user.money.toLocaleString('id')}
📦 Sisa ${symbol.padEnd(5)}    : ${user.cryptoPortfolio[symbol] || 0}
━━━━━━━━━━━━━━━━━━━━━━
⏳ Jual berikutnya: *8 jam lagi*
`.trim(), m)
}

handler.help = ['crypto-sell']
handler.tags = ['game', 'rpg']
handler.command = /^crypto[-_]sell$/i

export default handler  