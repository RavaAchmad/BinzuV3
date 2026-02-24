import fs from 'fs'
import fetch from 'node-fetch'
import sharp from 'sharp'

let timeout = 120000
let poin = 4999

// Fetch gambar dari Wikipedia dengan header yang bener
// + konversi SVG → PNG otomatis kalau perlu
async function fetchFlagImage(url) {
    // Wikipedia sering punya versi PNG dari SVG
    // Format: ...Flag_of_X.svg → ubah ke .../800px-Flag_of_X.svg.png
    let fetchUrl = url

    // Kalau URL SVG dari wikimedia commons, coba ambil versi PNG langsung
    if (url.includes('wikipedia.org') || url.includes('wikimedia.org')) {
        if (url.endsWith('.svg')) {
            // Konversi path ke thumbnail PNG
            // Contoh: /commons/a/ab/Flag_of_X.svg
            //      → /commons/thumb/a/ab/Flag_of_X.svg/800px-Flag_of_X.svg.png
            const parts = url.split('/commons/')
            if (parts.length === 2) {
                const filePath = parts[1]                    // a/ab/Flag_of_X.svg
                const fileName = filePath.split('/').pop()   // Flag_of_X.svg
                fetchUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${filePath}/800px-${fileName}.png`
            }
        }
    }

    const res = await fetch(fetchUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://en.wikipedia.org/',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
        timeout: 15000
    })

    if (!res.ok) throw new Error(`HTTP ${res.status} dari ${fetchUrl}`)

    const contentType = res.headers.get('content-type') || ''
    const buffer = Buffer.from(await res.arrayBuffer())

    // Kalau masih SVG (fallback PNG gagal), konversi pakai sharp
    if (contentType.includes('svg') || fetchUrl.endsWith('.svg')) {
        const pngBuffer = await sharp(buffer).png().toBuffer()
        return { buffer: pngBuffer, mime: 'image/png' }
    }

    // Kalau bukan image sama sekali (dapat HTML error page)
    if (!contentType.includes('image')) {
        throw new Error(`Response bukan gambar: ${contentType}`)
    }

    return { buffer, mime: 'image/jpeg' }
}

let handler = async (m, { conn, usedPrefix }) => {
    conn.game = conn.game ? conn.game : {}
    let id = 'tebakbendera-' + m.chat
    if (id in conn.game) return conn.reply(m.chat, 'Masih ada soal belum terjawab di chat ini', conn.game[id][0])

    let src = JSON.parse(fs.readFileSync('./json/tebakbendera.json', 'utf-8'))
    let json = src[Math.floor(Math.random() * src.length)]

    let caption = `
Silahkan Tebak Bendera Di Atas...

Timeout *${(timeout / 1000).toFixed(0)} detik*
Ketik ${usedPrefix}teben untuk bantuan
Bonus: ${poin} XP
    `.trim()

    let sentMsg
    try {
        const { buffer, mime } = await fetchFlagImage(json.img)

        sentMsg = await conn.sendMessage(m.chat, {
            image: buffer,
            caption,
            mimetype: mime
        }, { quoted: m })

    } catch (e) {
        console.error('[TEBAKBENDERA] Gagal fetch gambar:', e.message)
        // Fallback: coba kirim via URL langsung (mungkin berhasil di beberapa kasus)
        try {
            sentMsg = await conn.sendMessage(m.chat, {
                image: { url: json.img },
                caption,
            }, { quoted: m })
        } catch (e2) {
            return m.reply(`❌ Gagal mengambil gambar bendera. Coba lagi!\n_Error: ${e.message}_`)
        }
    }

    conn.game[id] = [
        sentMsg,
        json,
        poin,
        setTimeout(() => {
            if (conn.game[id]) {
                conn.reply(m.chat, `⏰ Waktu habis!\nJawabannya adalah *${json.name}*`, conn.game[id][0])
            }
            delete conn.game[id]
        }, timeout)
    ]
}

handler.help = ['tebakbendera']
handler.tags = ['game']
handler.command = /^tebakbendera$/i
handler.onlyprem = true
handler.game = true

export default handler