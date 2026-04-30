import { buildRpgActionButtons, buildRpgSnapshot, formatRpgDashboard } from '../lib/rpg-engagement.js'
import { interactiveMsg } from '../lib/buttons.js'

let handler = async (m, { conn, usedPrefix }) => {
  const user = global.db.data.users[m.sender]
  const chat = global.db.data.chats[m.chat] || {}
  const name = await Promise.resolve(conn.getName(m.sender)).catch(() => m.sender.split('@')[0])
  const snapshot = buildRpgSnapshot(user, usedPrefix, { conn, chat, chatId: m.chat })
  const text = formatRpgDashboard(snapshot, name)

  const buttons = buildRpgActionButtons(snapshot, usedPrefix, { dashboard: false })
  buttons.splice(1, 0, {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: 'Missions', id: `${usedPrefix}missions` })
  })

  await interactiveMsg(conn, m.chat, {
    text,
    footer: 'RPG Director',
    interactiveButtons: buttons
  }, m, { forceNative: true })
}

handler.help = ['rpggo', 'rpgplan', 'rpgnext', 'playnow']
handler.tags = ['rpg', 'game']
handler.command = /^(rpggo|rpgplan|rpgnext|playnow)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
