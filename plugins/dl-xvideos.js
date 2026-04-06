import { binzuApiSingle } from '../lib/binzu-api.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let chat = global.db?.data?.chats?.[m.chat]
    if (!args[0]) throw `*Linknya mana?*\n\nContoh:\n${usedPrefix + command} https://www.xvideos.com/video.xxxxx/title`
    await m.reply('🔍 Sedang memproses...')
    try {
        const data = await binzuApiSingle('nsfw/xvideos', { url: args[0] })
        const r = data.result || data
        const dlUrl = r?.url_dl || r?.url || r?.video || r?.download
        if (!dlUrl) throw 'Link download tidak ditemukan'
        let capt = `*INFO FILE*\n\nName: ${r?.title || '-'}\nViews: ${r?.views || '-'}\nVote: ${r?.vote || '-'}\nLike/Dislike: ${r?.likes || '-'}/${r?.deslikes || r?.dislikes || '-'}\nSize: ${r?.size || '-'}`
        await conn.sendFile(m.chat, dlUrl, null, capt, m)
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['xvideosdl <url>']
handler.tags = ['nsfw', 'downloader']
handler.command = /^xvideosdl$/i
handler.limit = true
handler.nsfw = true

export default handler
