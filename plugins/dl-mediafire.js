import { binzuDownload } from '../lib/binzu-api.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.mediafire.com/file/xxxxx`
    if (!args[0].includes('mediafire.com')) return m.reply('URL Mediafire tidak valid.')
    await m.reply('🔍 Sedang memproses...')
    try {
        const data = await binzuDownload('mediafire', args[0])
        const r = data.result
        const dlUrl = r?.url || r?.download || r?.link
        if (!dlUrl) throw 'Link download tidak ditemukan'
        const caption = `📁 *Mediafire Download*\n\n📄 *Nama* : ${r?.filename || r?.name || '-'}\n📊 *Size* : ${r?.size || r?.filesize || '-'}\n🔗 *Type* : ${r?.ext || r?.filetype || '-'}`
        await conn.sendFile(m.chat, dlUrl, r?.filename || 'file', caption, m)
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['mediafire']
handler.tags = ['downloader']
handler.command = /^(mediafire|mf)$/i
handler.limit = true
handler.register = true
export default handler
