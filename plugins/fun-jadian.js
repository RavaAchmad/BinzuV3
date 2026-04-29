import { formatMention, getParticipantJids } from '../lib/jid-helper.js'

function handler(m, { conn, groupMetadata }) {
    let ps = getParticipantJids(groupMetadata?.participants || [], conn)
    if (ps.length < 2) throw 'Anggota grup belum cukup buat dijodohin.'

    let a = ps.getRandom()
    let b
    do b = ps.getRandom()
    while (b === a)

    m.reply(`${formatMention(a)} \u2764\ufe0f ${formatMention(b)}`, null, {
        mentions: [a, b].filter(Boolean)
    })
}
handler.help = ['jadian'].map(v => v + ' *<tag>*')
handler.tags = ['fun']
handler.command = ['jadian']
handler.group = true
export default handler
