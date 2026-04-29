import { generateWAMessageFromContent } from 'baileys'
import { getParticipantJids } from '../lib/jid-helper.js'

let handler = async (m, { conn, text, participants }) => {
  let users = getParticipantJids(participants || [], conn).map(u => conn.decodeJid(u))
  let q = m.quoted ? m.quoted : m
  let c = m.quoted ? m.quoted : m.msg
  const msg = conn.cMod(m.chat,
    generateWAMessageFromContent(m.chat, {
      [c.toJSON ? q.mtype : 'extendedTextMessage']: c.toJSON ? c.toJSON() : {
        text: c || ''
      }
    }, {
      quoted: m,
      userJid: conn.user.id
    }),
    text || q.text, conn.user.jid, { mentions: users }
  )
  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}
handler.help = ['ohidetag'].map(v => v + ' <teks>')
handler.tags = ['owner']
handler.command = /^(ohidetag|oht|oh)$/i

handler.group = true
handler.owner = true

export default handler

