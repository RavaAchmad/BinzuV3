import { binzuApiSingle } from '../lib/binzu-api.js';

let handler = async (m, { conn, usedPrefix, command }) => {
    await m.reply('🔍 Mencari cosplay...')
    try {
        const data = await binzuApiSingle('nsfw/cosxplay')
        const r = data.result || data
        const imageUrl = r?.url || r?.image || (typeof r === 'string' ? r : null)
        if (!imageUrl) throw 'Gambar tidak ditemukan'
        await conn.sendFile(m.chat, imageUrl, 'cosplay.jpg', `*C O S P L A Y*\n${global.wm || ''}`, m)
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['cosplay']
handler.tags = ['downloader', 'anime', 'search']
handler.command = /^(cosplay)$/i
handler.limit = true
handler.register = true

export default handler
