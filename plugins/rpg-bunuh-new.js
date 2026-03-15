/**
 * RPG - Bunuh (Hitman) Activity
 * Adventure activity using new unified RPGHandler
 */

import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const result = await RPGHandler.handleAdventure(global.db, userId, userName, 1)
    const formatted = RPGHandler.formatActivityResult(result, userName)
    m.reply(formatted)
  } catch (error) {
    m.reply(`❌ Error: ${error.message}`)
  }
}

handler.help = ['bunuh', 'hitman']
handler.tags = ['rpg']
handler.command = /^(bunuh|hitman)$/i
handler.register = true
handler.group = true
handler.rpg = true
export default handler
