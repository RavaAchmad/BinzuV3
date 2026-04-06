import { binzuDownload } from '../lib/binzu-api.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://twitter.com/user/status/xxxxx`
    await m.reply('🔍 Sedang memproses...')
    try {
        const data = await binzuDownload('twitter', args[0])
        const r = data.result
        const mediaURLs = r?.mediaURLs || r?.media || r?.videos || r?.images || []
        const caption = r?.text || r?.caption || r?.title || ''

        if (Array.isArray(mediaURLs) && mediaURLs.length > 0) {
            for (let i = 0; i < Math.min(5, mediaURLs.length); i++) {
                const url = typeof mediaURLs[i] === 'string' ? mediaURLs[i] : mediaURLs[i]?.url
                if (url) {
                    if (i > 0) await new Promise(r => setTimeout(r, 1000))
                    await conn.sendFile(m.chat, url, null, i === 0 ? caption : '', m)
                }
            }
        } else {
            const url = r?.url || r?.video || r?.download
            if (!url) throw 'Media tidak ditemukan'
            await conn.sendFile(m.chat, url, null, caption, m)
        }
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['twitter']
handler.tags = ['downloader']
handler.command = /^(twitterdl|twitter|xdl|x)$/i
handler.limit = true
export default handler
