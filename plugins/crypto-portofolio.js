// ============================================================
// CRYPTO PORTFOLIO - Lihat semua aset & profit/loss
// File: plugins/crypto-portofolio.js
// ============================================================
import { initCryptoEngine, COINS, getPrice, formatNum } from '../lib/crypto-engine.js'

let handler = async (m, { conn, usedPrefix }) => {
    let user = global.db.data.users[m.sender]
    let name = user.registered ? user.name : conn.getName(m.sender)

    if (!user.cryptoWallet) user.cryptoWallet = 0
    if (!user.cryptoPortfolio) user.cryptoPortfolio = {}
    if (!user.cryptoBuyPrice) user.cryptoBuyPrice = {}
    if (!user.cryptoTotalPnl) user.cryptoTotalPnl = 0
    initCryptoEngine()

    const portfolio = user.cryptoPortfolio
    const ownedCoins = Object.keys(portfolio).filter(s => portfolio[s] > 0)

    let totalValue = 0
    let totalCost = 0
    let coinRows = ''

    if (ownedCoins.length === 0) {
        coinRows = '\n_Kamu belum punya koin apapun._\n_Mulai beli dengan:_ ' + usedPrefix + 'crypto-buy <koin> <nominal>\n'
    } else {
        for (const symbol of ownedCoins) {
            const coin = COINS[symbol]
            if (!coin) continue

            const amount = portfolio[symbol]
            const currentPrice = getPrice(symbol)
            const avgBuyPrice = user.cryptoBuyPrice[symbol] || currentPrice
            const currentValue = Math.floor(amount * currentPrice)
            const costBasis = Math.floor(amount * avgBuyPrice)
            const pnl = currentValue - costBasis
            const pnlPct = costBasis > 0 ? ((pnl / costBasis) * 100).toFixed(2) : '0.00'
            const pnlEmoji = pnl >= 0 ? '🟢' : '🔴'
            const pnlSign = pnl >= 0 ? '+' : ''

            totalValue += currentValue
            totalCost += costBasis

            coinRows += `\n${coin.emoji} *${symbol}* — ${amount} koin\n`
            coinRows += `   💲 Harga: ${formatNum(currentPrice)}\n`
            coinRows += `   💰 Nilai: ${currentValue.toLocaleString('id')}\n`
            coinRows += `   ${pnlEmoji} P&L: ${pnlSign}${pnl.toLocaleString('id')} (${pnlSign}${pnlPct}%)\n`
        }
    }

    const totalPnl = totalValue - totalCost
    const totalPnlPct = totalCost > 0 ? ((totalPnl / totalCost) * 100).toFixed(2) : '0.00'
    const totalPnlEmoji = totalPnl >= 0 ? '🟢' : '🔴'
    const totalPnlSign = totalPnl >= 0 ? '+' : ''
    const grandTotal = user.cryptoWallet + totalValue

    await conn.reply(m.chat, `
╔══════════════════════╗
║   📈 *CRYPTO PORTFOLIO*  ║
╚══════════════════════╝
👤 *${name}*
━━━━━━━━━━━━━━━━━━━━━━
${coinRows.trim()}

━━━━━━━━━━━━━━━━━━━━━━
📊 *RINGKASAN PORTOFOLIO*
💼 Wallet (cash)    : ${user.cryptoWallet.toLocaleString('id')}
📦 Total nilai koin  : ${totalValue.toLocaleString('id')}
💎 Total aset        : ${grandTotal.toLocaleString('id')}

${totalPnlEmoji} *Total P&L Unrealized*
   ${totalPnlSign}${totalPnl.toLocaleString('id')} (${totalPnlSign}${totalPnlPct}%)

📝 *Total P&L Realized (all time)*
   ${user.cryptoTotalPnl >= 0 ? '🟢 +' : '🔴 '}${(user.cryptoTotalPnl || 0).toLocaleString('id')}
━━━━━━━━━━━━━━━━━━━━━━

💡 *${usedPrefix}crypto-market* — Cek harga terkini
💡 *${usedPrefix}crypto-sell <koin> all* — Jual koin
`.trim(), m)
}

handler.help = ['crypto-portofolio', 'crypto-portfolio']
handler.tags = ['game', 'rpg']
handler.command = /^crypto[-_]porto(folio|flio)?$/i

export default handler