import { binzuTools } from '../lib/binzu-api.js';

const defaultLang = 'id'

let handler = async (m, { args, usedPrefix, command }) => {
    if (!args[0] && !m.quoted) {
        throw `*Contoh:* ${usedPrefix}${command} id how are you`
    }
    let lang = args[0]
    let text = args.slice(1).join(' ')
    if ((args[0] || '').length !== 2) {
        lang = defaultLang
        text = args.join(' ')
    }
    if (!text && m.quoted && m.quoted.text) text = m.quoted.text
    if (!text) throw 'Teks tidak ditemukan'
    try {
        const data = await binzuTools('translate', { text, to: lang })
        const r = data.result
        const translated = r?.text || r?.translated || r?.translation || (typeof r === 'string' ? r : null)
        if (!translated) throw 'Terjemahan gagal'
        m.reply(translated)
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['tr <lang> <text>']
handler.tags = ['tools']
handler.command = ['translate', 'tl', 'trid', 'tr']
handler.limit = true
handler.register = true

export default handler
