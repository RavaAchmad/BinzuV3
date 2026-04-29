import { formatMention, getParticipantJids } from '../lib/jid-helper.js'

let handler = async (m, { conn, text, groupMetadata, usedPrefix, command }) => {
    if (!text) throw `Contoh:\n${usedPrefix + command} Alay`

    let em = ['\u{1F976}', '\u{1F928}', '\u{1F5FF}', '\u{1F914}', '\u{1F62B}', '\u{1F92B}', '\u{1F974}', '\u{1F923}', '\u{1F60A}', '\u{1F60D}']
    let ps = getParticipantJids(groupMetadata?.participants || [], conn)
    if (!ps.length) throw 'Anggota grup tidak ditemukan.'

    let a = ps.getRandom()
    let am = em.getRandom()
    conn.reply(m.chat, `Si paling *${text}* adalah ${formatMention(a)} ${am}`, m, { mentions: [a].filter(Boolean) })
}
handler.help = ['sipaling'].map(v => v + ' <teks>')
handler.command = ['sipaling']
handler.tags = ['fun']
handler.group = true
export default handler
