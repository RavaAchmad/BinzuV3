import { binzuDownload } from '../lib/binzu-api.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.xiaohongshu.com/xxxxx`
    await m.reply('🔍 Sedang memproses...')
    try {
        const data = await binzuDownload('rednote', args[0])
        const r = data.result
        const media = r?.images || r?.media || r?.videos || []
        if (Array.isArray(media) && media.length > 0) {
            for (const item of media.slice(0, 10)) {
                const url = typeof item === 'string' ? item : item?.url
                if (url) await conn.sendFile(m.chat, url, null, '', m)
            }
        } else {
            const url = r?.url || r?.video || r?.image || r?.download
            if (!url) throw 'Media tidak ditemukan'
            await conn.sendFile(m.chat, url, null, r?.title || '', m)
        }
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['xiaohongshu', 'rednote']
handler.tags = ['downloader']
handler.command = /^(xiaohongshu|xhs|xhsdl|rednote)$/i
handler.limit = true
export default handler
