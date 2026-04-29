import { formatMention, getParticipantJids } from '../lib/jid-helper.js'

let handler = async (m, { conn, groupMetadata, command, usedPrefix, text }) => {
    if (!text) throw `Contoh:\n${usedPrefix + command} pengcoli`

    const ps = getParticipantJids(groupMetadata?.participants || [], conn)
    if (ps.length < 10) throw `Anggota grup kurang dari 10 orang!`

    const picked = []
    const pool = [...ps]
    while (picked.length < 10 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length)
        picked.push(pool.splice(idx, 1)[0])
    }

    const names = picked.map(formatMention)
    const emoji = pickRandom(['😨', '😅', '😂', '😳', '😎', '🥵', '😱', '🙄', '🗿', '🤨', '🥴', '😐', '👀', '👎'])
    const top = `*${emoji} Top 10 ${text} ${emoji}*

*1.* ${names[0]}
*2.* ${names[1]}
*3.* ${names[2]}
*4.* ${names[3]}
*5.* ${names[4]}
*6.* ${names[5]}
*7.* ${names[6]}
*8.* ${names[7]}
*9.* ${names[8]}
*10.* ${names[9]}`.trim()

    await conn.sendMessage(m.chat, {
        text: top,
        mentions: picked.filter(Boolean)
    }, { quoted: m })
}

handler.help = ['top']
handler.tags = ['fun']
handler.command = /^top$/i
handler.group = true
export default handler

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)]
}
