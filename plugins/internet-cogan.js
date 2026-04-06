import { binzuApiSingle } from '../lib/binzu-api.js';

let handler = async (m, { conn }) => {
    try {
        const data = await binzuApiSingle('random/image/anime')
        const imageUrl = data.result?.url || data.result?.image || data.result || data.url
        if (!imageUrl) throw 'Gambar tidak ditemukan'
        await conn.sendFile(m.chat, imageUrl, 'cogan.jpeg', null, m, false)
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['cogan']
handler.tags = ['internet']
handler.command = /^(cogan)$/i
handler.limit = true
handler.register = true

export default handler
