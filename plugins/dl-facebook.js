import { binzuDownload } from '../lib/binzu-api.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.facebook.com/watch?v=xxxxx`
    await m.reply('🔍 Sedang memproses...')
    try {
        const data = await binzuDownload('facebook', args[0])
        const r = data.result
        const videoUrl = r?.hd || r?.sd || r?.video || r?.url || r?.download?.hd || r?.download?.sd
        if (!videoUrl) throw 'Video tidak ditemukan'
        const caption = `🎬 *Facebook Download*\n\n${r?.title || r?.caption || ''}`
        await conn.sendMessage(m.chat, { video: { url: videoUrl }, caption }, { quoted: m })
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['facebook']
handler.tags = ['downloader']
handler.command = /^(fb|facebook|facebookdl|fbdl|fbdown|dlfb)$/i
handler.limit = true
export default handler
