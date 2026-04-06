import { binzuDownload, binzuSearch } from '../lib/binzu-api.js';

let handler = async (m, { conn, args, usedPrefix, command, text }) => {
    if (!text) throw `*Contoh:* ${usedPrefix}${command} https://pinterest.com/pin/xxxxx atau ${usedPrefix}${command} anime girl`
    await m.reply('🔍 Sedang memproses...')
    try {
        if (text.includes('pinterest.com') || text.includes('pin.it')) {
            const data = await binzuDownload('pinterest', text)
            const r = data.result
            const url = r?.url || r?.image || r?.video || r?.download
            if (!url) throw 'Media tidak ditemukan'
            await conn.sendFile(m.chat, url, null, r?.title || '', m)
        } else {
            const data = await binzuSearch('pinterest', text)
            const r = data.result
            const results = Array.isArray(r) ? r : r?.images || r?.pins || []
            if (results.length === 0) throw 'Tidak ditemukan'
            const pick = results[Math.floor(Math.random() * Math.min(20, results.length))]
            const url = typeof pick === 'string' ? pick : pick?.url || pick?.image || pick?.src
            if (!url) throw 'Gambar tidak ditemukan'
            await conn.sendFile(m.chat, url, 'pinterest.jpg', '', m)
        }
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['pinterestdownload']
handler.tags = ['downloader']
handler.command = /^(pinterest|pin)$/i
handler.limit = true
export default handler
