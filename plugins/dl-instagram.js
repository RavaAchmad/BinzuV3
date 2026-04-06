import { binzuDownload } from '../lib/binzu-api.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.instagram.com/p/xxxxx/`
    await m.reply('🔍 Sedang memproses...')
    try {
        const data = await binzuDownload('instagram', args[0])
        const r = data.result
        const allMedia = []

        // Normalize response - different versions return different formats
        const images = r?.image || r?.images || r?.photos || []
        const videos = r?.video || r?.videos || []

        if (Array.isArray(images)) {
            images.forEach(img => allMedia.push({ url: typeof img === 'string' ? img : img.url || img.src, type: 'image' }))
        }
        if (Array.isArray(videos)) {
            videos.forEach(vid => allMedia.push({ url: typeof vid === 'string' ? vid : vid.url || vid.src, type: 'video' }))
        }
        // Some versions return a flat url/download
        if (allMedia.length === 0 && (r?.url || r?.download)) {
            allMedia.push({ url: r.url || r.download, type: 'video' })
        }

        if (allMedia.length === 0) throw 'Konten tidak ditemukan.'

        for (let i = 0; i < Math.min(10, allMedia.length); i++) {
            if (i > 0) await new Promise(r => setTimeout(r, 150))
            try {
                await conn.sendFile(m.chat, allMedia[i].url, null, i === 0 ? (r?.caption || r?.title || '') : '', m)
            } catch {}
        }
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['instagram', 'ig']
handler.tags = ['downloader']
handler.command = /^(ig|instagram|igdl|instagramdl|igstory)$/i
handler.limit = true
export default handler
