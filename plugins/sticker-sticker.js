import { toStickerImage, toStickerVideo } from '../lib/converter.js'

let handler = async (m, { conn, command, usedPrefix }) => {
    if (m.quoted?.viewOnce) return

    const options = {
        packname: info.namebot,
        author: info.nameown,
    }

    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    if (/image|jpeg|png|webp/.test(mime)) {
        m.reply(wait)
        try {
            let media = await q.download()

            // Kalau sudah webp (stiker), langsung kirim tanpa convert
            if (/webp/.test(mime)) {
                await conn.sendStickerImage(m.chat, media, m, {
                    ...options,
                    isAnimated: false
                })
                return
            }

            // Image biasa → resize ke 512x512 PNG dulu via ffmpeg
            // lalu sendStickerImage yang handle konversi PNG → webp + exif
            const resized = await toStickerImage(media, mime.split('/')[1] || 'jpg')
            await conn.sendStickerImage(m.chat, resized.data, m, {
                ...options,
                isAnimated: false
            })
            await resized.delete()
        } catch (e) {
            m.reply(`Gagal buat stiker: ${e.message}`)
        }

    } else if (/video|gif/.test(mime)) {
        if ((q.msg || q).seconds > 15) return m.reply('*DURASI MAKSIMAL 15 DETIK*')
        m.reply(wait)
        try {
            let media = await q.download()

            // Video/GIF → resize ke 512x512 mp4 dulu via ffmpeg
            // lalu sendStickerVideo yang handle konversi mp4 → webp animasi + exif
            const resized = await toStickerVideo(media, mime.split('/')[1] || 'mp4')
            await conn.sendStickerVideo(m.chat, resized.data, m, {
                ...options,
                isAnimated: true
            })
            await resized.delete()
        } catch (e) {
            m.reply(`Gagal buat stiker: ${e.message}`)
        }

    } else {
        throw '*Format tidak didukung! Kirim/reply gambar atau video*'
    }
}

handler.help = ['s', 'stiker', 'sticker']
handler.command = /^(s|stiker|sticker)$/i
handler.tags = ['sticker']
handler.sewa = true

export default handler