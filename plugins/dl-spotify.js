import { binzuDownload } from '../lib/binzu-api.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://open.spotify.com/track/xxxxx`
    await m.reply('🔍 Sedang memproses...')
    try {
        const data = await binzuDownload('spotify', args[0])
        const r = data.result
        const audioUrl = r?.url || r?.download || r?.audio || r?.link
        if (!audioUrl) throw 'Audio tidak ditemukan'
        await conn.sendMessage(m.chat, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            contextInfo: {
                externalAdReply: {
                    title: r?.title || r?.name || 'Spotify Audio',
                    body: r?.artist || r?.artists || '',
                    thumbnailUrl: r?.thumbnail || r?.cover || r?.image || '',
                    sourceUrl: args[0],
                    mediaType: 2
                }
            }
        }, { quoted: m })
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['spotify']
handler.tags = ['downloader']
handler.command = /^(spotify)$/i
handler.limit = true
export default handler
