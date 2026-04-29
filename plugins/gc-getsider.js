import { formatMention, getParticipantJid, getParticipantJids } from '../lib/jid-helper.js'

let handler = async (m, { conn, text, groupMetadata }) => {
    const lama = 86400000 * 7
    const now = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta"
    })
    const milliseconds = new Date(now).getTime()

    const participants = groupMetadata?.participants || []
    const member = getParticipantJids(participants, conn)
    const pesan = text || "Harap aktif di grup karena akan ada pembersihan member setiap saat"
    const sider = []

    for (const jid of member) {
        const participant = participants.find(u => getParticipantJid(u, conn) == jid) || {}
        const user = global.db.data.users[jid]
        const isAdmin = participant.isAdmin || participant.isSuperAdmin || participant.admin
        const isInactive = typeof user == 'undefined' || milliseconds - user.lastseen > lama

        if (!isInactive || isAdmin) continue
        if (typeof user == 'undefined' || user.banned == true) sider.push(jid)
    }

    if (!sider.length) return conn.reply(m.chat, `*Digrup ini tidak terdapat sider.*`, m)

    const list = sider.map(jid => {
        const user = global.db.data.users[jid]
        const status = typeof user == 'undefined' ? 'Sider' : 'Off ' + msToDate(milliseconds - user.lastseen)
        return `  - ${formatMention(jid)} ${status}`
    }).join('\n')

    conn.reply(m.chat, `*${sider.length}/${member.length}* anggota grup *${await conn.getName(m.chat)}* adalah sider dengan alasan :\n1. Tidak aktif selama lebih dari 7 hari\n2. Baru join tetapi tidak pernah berinteraksi\n\n_"${pesan}"_\n\n*LIST SIDER :*\n${list}`, m, {
        contextInfo: {
            mentionedJid: sider
        }
    })
}
handler.help = ['gcsider']
handler.tags = ['info','group']
handler.command = /^(gcsider)$/i
handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler

function msToDate(ms) {
    let d = isNaN(ms) ? '--' : Math.floor(ms / 86400000)
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000) % 24
    if (d == 0 && h == 0) return "Baru Saja"
    return [d, 'H ', h, 'J '].map(v => v.toString().padStart(2, 0)).join('')
}
