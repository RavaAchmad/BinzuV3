/**
 * RPG - Berburu (Hunt) Activity
 * Indonesian alias for hunt command
 */

import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, text }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    
    const result = await RPGHandler.handleHunt(global.db, userId, userName)
    const formattedMessage = RPGHandler.formatActivityResult(result, userName)
    
    m.reply(formattedMessage)
  } catch (error) {
    m.reply(`❌ Error: ${error.message}`)
  }
}

handler.help = ['berburu']
handler.tags = ['rpg']
handler.command = /^berburu$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
