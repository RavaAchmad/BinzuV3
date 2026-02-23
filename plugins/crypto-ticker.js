// ============================================================
// CRYPTO TICKER - Background scheduler → broadcast ke Newsletter
// File: plugins/crypto-ticker.js
//
// CARA PASANG DI INDEX.JS / MAIN BOT:
//
//   import { startCryptoTicker } from './plugins/crypto-ticker.js'
//
//   conn.ev.on('connection.update', ({ connection }) => {
//     if (connection === 'open') startCryptoTicker(conn)
//   })
//
// PERBEDAAN DARI VERSI GRUP:
// - Broadcast dikirim ke 1 CHANNEL (newsletter) saja
// - User yang mau notif tinggal FOLLOW channel → zero spam
// - Bot harus admin/owner channel tersebut
// - Set channel via: .crypto-notif set <jid>
// ============================================================
import { updatePrices, COINS, getPrice, getPriceChange, getMiniChart, formatNum, initCryptoEngine } from '../lib/crypto-engine.js'

let tickerStarted = false

export function startCryptoTicker(conn) {
    if (tickerStarted) return
    tickerStarted = true
    console.log('[CRYPTO] Ticker started ✅')

    // Update harga setiap 5 menit
    setInterval(async () => {
        try {
            if (global.db?.data?.crypto) {
                updatePrices()
                console.log('[CRYPTO] Prices updated at', new Date().toLocaleTimeString('id-ID'))
                await checkAlerts(conn)
            }
        } catch (e) {
            console.error('[CRYPTO] Price update error:', e.message)
        }
    }, 5 * 60 * 1000)

    // Broadcast ke newsletter setiap 30 menit
    setInterval(async () => {
        try {
            await broadcastToNewsletter(conn)
        } catch (e) {
            console.error('[CRYPTO] Broadcast error:', e.message)
        }
    }, 30 * 60 * 1000)
}

// Ambil newsletter JID dari settings DB
function getNewsletterJid(conn) {
    const settings = global.db?.data?.settings?.[conn.user?.jid] || {}
    return settings.cryptoNewsletterJid || null
}

// Broadcast update harga ke newsletter
async function broadcastToNewsletter(conn) {
    const newsletterJid = getNewsletterJid(conn)
    if (!newsletterJid) {
        // Belum diset owner, skip diam-diam
        return
    }

    try {
        initCryptoEngine()
        const message = buildMarketMessage()
        await conn.sendMessage(newsletterJid, { text: message })
        console.log(`[CRYPTO] Broadcast ke newsletter ${newsletterJid} ✅`)
    } catch (e) {
        console.error(`[CRYPTO] Gagal broadcast ke newsletter:`, e.message)
    }
}

// Cek pergerakan harga ekstrem (> 10%) → kirim alert khusus
async function checkAlerts(conn) {
    const newsletterJid = getNewsletterJid(conn)
    if (!newsletterJid) return

    let alertLines = ''
    for (const [symbol, coin] of Object.entries(COINS)) {
        const change = getPriceChange(symbol)
        const price = getPrice(symbol)
        if (Math.abs(change) >= 10) {
            const direction = change > 0 ? '🚀 PUMP' : '💥 DUMP'
            const sign = change > 0 ? '+' : ''
            alertLines += `${coin.emoji} *${symbol}* — ${direction}!\n`
            alertLines += `   💲 ${formatNum(price)}  (${sign}${change.toFixed(2)}%)\n`
        }
    }

    if (!alertLines) return

    const alertMsg = `
🚨 *CRYPTO ALERT!* 🚨
━━━━━━━━━━━━━━━━━━━━━━
Pergerakan harga signifikan terdeteksi!

${alertLines.trim()}
━━━━━━━━━━━━━━━━━━━━━━
⚡ _Cek market sekarang sebelum terlambat!_
`.trim()

    try {
        await conn.sendMessage(newsletterJid, { text: alertMsg })
        console.log(`[CRYPTO] Alert dikirim ke newsletter ✅`)
    } catch (e) {
        console.error(`[CRYPTO] Gagal kirim alert:`, e.message)
    }
}

// Build pesan market lengkap
function buildMarketMessage() {
    const now = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'short'
    })

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

    return `
╔══════════════════════╗
║  📊 *UPDATE HARGA CRYPTO* ║
╚══════════════════════╝
🕐 ${now} WIB
━━━━━━━━━━━━━━━━━━━━━━
${rows.trim()}
━━━━━━━━━━━━━━━━━━━━━━
💡 Ketik *.crypto* di bot untuk trading!
`.trim()
}

// Dummy handler biar ga error saat di-load sebagai plugin
let handler = async () => {}
handler.help = []
handler.tags = []
handler.command = /^_crypto_ticker_never_match_$/

export default handler