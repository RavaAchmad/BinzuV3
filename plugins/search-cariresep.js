import { binzuSearch } from '../lib/binzu-api.js';

let handler = async (m, { conn, usedPrefix, command, text }) => {
    if (!text) throw `Masukan format dengan benar\n\nContoh:\n${usedPrefix + command} Ayam Geprek`
    await m.reply('🔍 Mencari resep...')
    try {
        const data = await binzuSearch('resep', text)
        const results = data.result || data.data || []
        if (Array.isArray(results) && results.length) {
            // Search result - list of recipes
            let cap = results.map((v) => {
                return `❏ *Judul:* ${v.judul || v.title || '-'}\n▧ *Link:* ${v.link || v.url || '-'}`
            }).join('\n\n')
            conn.reply(m.chat, cap, m)
        } else if (results.judul || results.title) {
            // Single detail result
            const r = results
            let cap = `▧ *Judul:* ${r.judul || r.title}\n▧ *Waktu Masak:* ${r.waktu_masak || r.time || '-'}\n▧ *Hasil:* ${r.hasil || r.servings || '-'}\n▧ *Tingkat Kesulitan:* ${r.tingkat_kesulitan || r.difficulty || '-'}\n\n▧ *Bahan:*\n${r.bahan || r.ingredients || '-'}\n\n▧ *Langkah Langkah:*\n${r.langkah_langkah || r.steps || '-'}`
            if (r.thumb || r.image) {
                conn.sendFile(m.chat, r.thumb || r.image, 'resep.jpeg', cap, m, false)
            } else {
                conn.reply(m.chat, cap, m)
            }
        } else {
            throw 'Resep tidak ditemukan'
        }
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['cariresep <query>']
handler.tags = ['search']
handler.command = /^(cariresep|resep)$/i
handler.limit = true
handler.register = true

export default handler
