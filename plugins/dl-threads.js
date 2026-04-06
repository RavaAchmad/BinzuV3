import { binzuDownload } from '../lib/binzu-api.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.threads.net/@user/post/xxxxx`
    await m.reply('🔍 Sedang memproses...')
    try {
        const data = await binzuDownload('threads', args[0])
        const r = data.result
        const media = r?.media || r?.images || r?.videos || []
        if (Array.isArray(media) && media.length > 0) {
            for (let i = 0; i < Math.min(5, media.length); i++) {
                const url = typeof media[i] === 'string' ? media[i] : media[i]?.url
                if (url) await conn.sendFile(m.chat, url, null, i === 0 ? (r?.text || r?.caption || '') : '', m)
            }
        } else {
            const url = r?.url || r?.video || r?.image || r?.download
            if (!url) throw 'Media tidak ditemukan'
            await conn.sendFile(m.chat, url, null, r?.text || r?.caption || '', m)
        }
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['threads', 'threadsdl']
handler.tags = ['downloader']
handler.command = /^(threads|threadsdl)$/i
handler.premium = true
export default handler
