/**
 * RPG - Bunuh (Hitman) Activity
 */
import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const result = await RPGHandler.handleAdventure(global.db, userId, userName, 1)
    m.reply(RPGHandler.formatActivityResult(result, userName))
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
