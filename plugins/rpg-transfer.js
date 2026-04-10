const items = [
    'money', 'bank', 'potion', 'trash', 'wood',
    'rock', 'string', 'petFood', 'emerald',
    'diamond', 'gold', 'iron', 'common',
    'uncommon', 'mythic', 'legendary', 'pet', 'chip', 
    'anggur', 'apel', 'jeruk', 'mangga', 'pisang', 
    'bibitanggur', 'bibitapel', 'bibitjeruk', 'bibitmangga', 'bibitpisang',
    'shard',
]
import { listMenu } from '../lib/buttons.js'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = global.db.data.users[m.sender]
    const item = items.filter(v => v in user && typeof user[v] == 'number')
    const type = (args[0] || '').toLowerCase()

    if (!item.includes(type)) {
        // Interactive item selection
        const rows = item.filter(v => user[v] > 0).map(v => ({
            id: `${usedPrefix}${command} ${v}`,
            title: `${rpg.emoticon(v)} ${v}`,
            description: `Stok: ${user[v]?.toLocaleString('id-ID') || 0}`
        }))

        let text = `📨 *TRANSFER MENU*\n\n`
        text += `Format: ${usedPrefix}${command} [type] [jumlah] @tag\n`
        text += `Contoh: ${usedPrefix}${command} money 9999 @628xx\n\n`
        text += `📦 *Item yang bisa ditransfer:*\n`
        item.filter(v => user[v] > 0).forEach(v => {
            text += `${rpg.emoticon(v)} ${v}: *${user[v]?.toLocaleString('id-ID') || 0}*\n`
        })

        if (rows.length > 0) {
            return await listMenu(conn, m.chat, text.trim(), 'Pilih item untuk transfer', '📦 Pilih Item', [{
                title: 'Transferable Items',
                rows: rows.slice(0, 20) // WA max 20 rows
            }])
        }
        return m.reply(text)
    }
    const count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, (isNumber(args[1]) ? parseInt(args[1]) : 1))) * 1
    let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : args[2] ? (args[2].replace(/[@ .+-]/g, '') + '@s.whatsapp.net') : ''
    let _user = global.db.data.users[who]
    if (!who) return m.reply('Tag salah satu, atau ketik Nomernya!!')
    if (!(who in global.db.data.users)) return m.reply(`User ${who} not in database`)
    if (user[type] * 1 < count) return m.reply(`Your *${rpg.emoticon(type)}${type}${special(type)}* is less *${count - user[type]}*`)
    let previous = user[type] * 1
    let _previous = _user[type] * 1
    user[type] -= count * 1
    _user[type] += count * 1
    if (previous > user[type] * 1 && _previous < _user[type] * 1) m.reply(`*––––––『 𝚃𝚁𝙰𝙽𝚂𝙵𝙴𝚁 』––––––*\n*📊 Status:* Succes\n*🗂️ Type:* ${type}${special(type)} ${rpg.emoticon(type)}\n*🧮 Count:* ${count}\n*📨 To:* @${(who || '').replace(/@s\.whatsapp\.net/g, '')}`, null, { mentions: [who] })
    else {
        user[type] = previous
        _user[type] = _previous
        m.reply(`*––––––『 TRANSFER 』––––––*\n*📊 Status:* Failted\n*📍 Item:* ${count} ${rpg.emoticon(type)}${type}${special(type)}\n*📨 To:* @${(who || '').replace(/@s\.whatsapp\.net/g, '')}`, null, { mentions: [who] })
    }
}

handler.help = ['transfer'].map(v => v + ' <type> <count> <@tag>')
handler.tags = ['rpg']
handler.command = /^(transfer|tf)$/i
handler.register = true
handler.group = true
handler.rpg = true
export default handler

function special(type) {
    let b = type.toLowerCase()
    let special = (['common', 'uncommon', 'mythic', 'legendary', 'pet'].includes(b) ? ' Crate' : '')
    return special
}

function isNumber(x) {
    return !isNaN(x)
}