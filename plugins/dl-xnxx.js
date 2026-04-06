import { binzuApiSingle } from '../lib/binzu-api.js';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let chat = global.db?.data?.chats?.[m.chat]
    if (!text) throw `URL nya mana?\n\nContoh:\n${usedPrefix + command} https://www.xnxx.com/video-xxxxx/title`
    if (!/^https?:\/\/(www\.)?xnxx\.com/.test(text)) throw `URL salah!\n\nContoh:\n${usedPrefix + command} https://www.xnxx.com/video-xxxxx/title`
    await m.reply('🔍 Sedang memproses...')
    try {
        const data = await binzuApiSingle('nsfw/xnxx', { url: text })
        const r = data.result || data
        const dlUrl = r?.url_dl || r?.url || r?.video || r?.download
        if (!dlUrl) throw 'Link download tidak ditemukan'
        let capt = `*INFO DATA*\n\nJudul: ${r?.title || '-'}\nDurasi: ${r?.duration || '-'}\nKualitas: ${r?.quality || '-'}\nUkuran: ${r?.size || '-'}`
        await conn.sendFile(m.chat, dlUrl, 'video.mp4', capt, m)
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['xnxx <url>']
handler.tags = ['nsfw', 'downloader']
handler.command = /^(xnxx)$/i
handler.nsfw = true
handler.limit = true

export default handler
