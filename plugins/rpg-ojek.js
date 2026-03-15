/**
 * RPG - Ojek Activity
 * Adventure/work activity using new unified RPGHandler
 */

import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, text }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    
    const result = await RPGHandler.handleAdventure(global.db, userId, userName, 1)
    const formattedMessage = RPGHandler.formatActivityResult(result, userName)
    
    m.reply(formattedMessage)
  } catch (error) {
    m.reply(`❌ Error: ${error.message}`)
  }
}

handler.help = ['ojek']
handler.tags = ['rpg']
handler.command = /^ojek$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler