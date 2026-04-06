import { binzuSticker } from '../lib/binzu-api.js';
import { sticker } from '../lib/sticker.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const isTele = /tele/i.test(command)
    if (!args[0]) throw `*Cari sticker dari ${isTele ? 'Telegram' : 'search'}.*\n\n★ Contoh:\n${usedPrefix + command} naruto`
    await m.reply('🔍 Mencari sticker...')
    try {
        const source = isTele ? 'telegram' : 'lines'
        const data = await binzuSticker(source, { query: args.join(' '), text: args.join(' ') })
        const results = data.result || data.data || []
        const stickers = Array.isArray(results) ? results : (results?.stickers || [])
        if (!stickers.length) throw 'Sticker tidak ditemukan'
        m.reply(`*Total sticker:* ${stickers.length}`)
        const max = Math.min(stickers.length, 7)
        for (let i = 0; i < max; i++) {
            const stickerUrl = stickers[i]?.sticker || stickers[i]?.url || stickers[i]
            try {
                const stiker = await sticker(false, stickerUrl, global.packname, global.author)
                await conn.sendFile(m.sender, stiker, 'sticker.webp', '', m)
            } catch {}
            await delay(2000)
        }
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['stikersearch <name>']
handler.tags = ['sticker', 'premium']
handler.command = /^stickersearch|stikersearch$/i
handler.premium = true

export default handler

const delay = time => new Promise(res => setTimeout(res, time))
