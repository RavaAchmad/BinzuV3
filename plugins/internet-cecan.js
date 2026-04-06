import { binzuApiSingle } from '../lib/binzu-api.js';

let handler = async (m, { conn, command }) => {
    try {
        const data = await binzuApiSingle('random/image/anh')
        const imageUrl = data.result?.url || data.result?.image || data.result || data.url
        if (!imageUrl) throw 'Gambar tidak ditemukan'
        await conn.sendFile(m.chat, imageUrl, 'cecan.jpeg', null, m, false)
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['cecan']
handler.tags = ['internet']
handler.command = /^(cecan)$/i
handler.limit = true
handler.register = true

export default handler
