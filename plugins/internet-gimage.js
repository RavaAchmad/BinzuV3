import { binzuSearch } from '../lib/binzu-api.js';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `*Contoh:* ${usedPrefix}${command} Minecraft`
    await m.reply('🔍 Mencari gambar...')
    try {
        const data = await binzuSearch('pinterest', text)
        const results = data.result || data.data || []
        if (!results.length) throw 'Gambar tidak ditemukan'
        const pick = results[Math.floor(Math.random() * results.length)]
        const imageUrl = pick?.url || pick?.image || pick?.pin || pick
        if (!imageUrl) throw 'Gambar tidak ditemukan'
        await conn.sendFile(m.chat, imageUrl, 'image.jpg', `*G O O G L E  I M A G E*\n*Query:* ${text}`, m)
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['gimage <query>']
handler.tags = ['internet']
handler.command = /^(gimage)$/i

export default handler
