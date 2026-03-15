/**
 * RPG - Polisi (Police) Activity
 * Adventure activity using new unified RPGHandler
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

handler.help = ['polisi']
handler.tags = ['rpg']
handler.command = /^polisi$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler