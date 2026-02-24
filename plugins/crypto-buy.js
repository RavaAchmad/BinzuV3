// ============================================================
// CRYPTO BUY - Beli koin langsung dari user.money
// File: plugins/crypto-buy.js
// ============================================================
import { initCryptoEngine, COINS, getPrice, isValidCoin, formatNum } from '../lib/crypto-engine.js'

let handler = async (m, { conn, usedPrefix, args }) => {
    let user = global.db.data.users[m.sender]

    if (!user.cryptoPortfolio) user.cryptoPortfolio = {}
    if (!user.cryptoBuyPrice) user.cryptoBuyPrice = {}
    initCryptoEngine()

    if (!args[0] || !args[1]) throw `❌ *Format salah!*
Gunakan: *${usedPrefix}crypto-buy <koin> <nominal>*

_Contoh: ${usedPrefix}crypto-buy BTC 5000_

Koin tersedia: *${Object.keys(COINS).join(', ')}*`

    const symbol = args[0].toUpperCase()
    const nominal = parseInt(args[1].replace(/[^0-9]/g, ''))

    if (!isValidCoin(symbol)) throw `❌ *Koin "${symbol}" tidak ditemukan!*\nKoin tersedia: *${Object.keys(COINS).join(', ')}*`
    if (!nominal || nominal < 10) throw `❌ *Minimal pembelian adalah 10!*`
    if (nominal > (user.money || 0)) throw `❌ *Saldo tidak cukup!*\n💰 Money: ${(user.money || 0).toLocaleString('id')}\n💸 Beli: ${nominal.toLocaleString('id')}`

    const price = getPrice(symbol)
    const coin = COINS[symbol]
    const amount = parseFloat((nominal / price).toFixed(8))

    if (amount <= 0) throw `❌ *Nominal terlalu kecil untuk membeli ${symbol}!*\nHarga ${symbol}: ${formatNum(price)}`

    // Update saldo & portfolio
    user.money -= nominal
    user.cryptoPortfolio[symbol] = parseFloat(((user.cryptoPortfolio[symbol] || 0) + amount).toFixed(8))

    // Hitung harga rata-rata beli (weighted average)
    const prevAmount = user.cryptoPortfolio[symbol] - amount
    const prevAvgPrice = user.cryptoBuyPrice[symbol] || price
    if (prevAmount > 0) {
        user.cryptoBuyPrice[symbol] = Math.round(
            (prevAvgPrice * prevAmount + price * amount) / user.cryptoPortfolio[symbol]
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
💰 Saldo Money     : ${(user.money).toLocaleString('id')}
📦 Total ${symbol.padEnd(5)}: ${user.cryptoPortfolio[symbol]}
━━━━━━━━━━━━━━━━━━━━━━

💡 *${usedPrefix}crypto-portofolio* — Cek semua aset
💡 *${usedPrefix}crypto-sell ${symbol} all* — Jual saat harga naik!
`.trim(), m)
}

handler.help = ['crypto-buy']
handler.tags = ['game', 'rpg']
handler.command = /^crypto[-_]buy$/i

export default handler