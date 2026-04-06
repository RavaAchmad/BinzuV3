import { binzuDownload } from '../lib/binzu-api.js';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Masukan URL!\n\nContoh:\n${usedPrefix + command} https://v.douyin.com/ikq8axJ/`
    if (!text.match(/douyin/gi)) throw 'URL Douyin tidak ditemukan!'
    await m.reply('🔍 Sedang memproses...')
    try {
        const data = await binzuDownload('douyin', text)
        const r = data.result
        const video = r?.video || r?.url || r?.media
        const title = r?.title || r?.desc || '-'
        const audio = r?.audio || r?.title_audio || r?.music
        let capt = `乂 *D O U Y I N*\n\n◦ *Title* : ${title}\n`
        if (video) await conn.sendFile(m.chat, video, null, capt, m)
        if (audio) {
            const audioUrl = Array.isArray(audio) ? audio[0] : audio
            await conn.sendMessage(m.chat, { audio: { url: audioUrl }, mimetype: 'audio/mpeg' }, { quoted: m })
        }
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['douyin <url>']
handler.tags = ['downloader']
handler.command = /^(douyin)$/i
handler.limit = true

export default handler
