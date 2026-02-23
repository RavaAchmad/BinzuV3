// ============================================================
// CRYPTO MARKET - Lihat harga semua koin realtime
// File: plugins/crypto-market.js
// ============================================================
import { initCryptoEngine, COINS, getPrice, getPriceChange, getMiniChart, formatNum } from '../lib/crypto-engine.js'

let handler = async (m, { conn, usedPrefix }) => {
    initCryptoEngine()

    const crypto = global.db.data.crypto
    const lastUpdate = crypto.lastUpdate
        ? new Date(crypto.lastUpdate).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })
        : 'Baru saja'

    let marketRows = ''
    for (const [symbol, coin] of Object.entries(COINS)) {
        const price = getPrice(symbol)
        const change = getPriceChange(symbol)
        const chart = getMiniChart(symbol)
        const trend = change >= 0 ? '📈' : '📉'
        const sign = change >= 0 ? '+' : ''
        const changeStr = `${sign}${change.toFixed(2)}%`

        marketRows += `\n${coin.emoji} *${symbol}* (${coin.name})\n`
        marketRows += `   💲 ${formatNum(price)}  ${trend} ${changeStr}\n`
        marketRows += `   ${chart}\n`
    }

    await conn.reply(m.chat, `
╔══════════════════════╗
║   📊 *CRYPTO MARKET*   ║
╚══════════════════════╝
🕐 Update: ${lastUpdate} WIB
━━━━━━━━━━━━━━━━━━━━━━
${marketRows.trim()}
━━━━━━━━━━━━━━━━━━━━━━
💡 *Harga bergerak tiap 5 menit*

*Mulai Trading:*
 › ${usedPrefix}crypto-buy <koin> <nominal>
 › ${usedPrefix}crypto-sell <koin> <jumlah/all>
 › ${usedPrefix}crypto-portofolio
`.trim(), m)
}

handler.help = ['crypto-market']
handler.tags = ['game', 'rpg']
handler.command = /^crypto[-_]market$/i

export default handler