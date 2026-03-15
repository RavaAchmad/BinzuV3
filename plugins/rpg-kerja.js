/**
 * RPG - Kerja (Work) Activity
 * Indonesian command for work activity
 */

import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, text }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    
    const result = await RPGHandler.handleWork(global.db, userId, userName, 'random')
    const formattedMessage = RPGHandler.formatActivityResult(result, userName)
    
    m.reply(formattedMessage)
  } catch (error) {
    m.reply(`❌ Error: ${error.message}`)
  }
}

handler.help = ['kerja']
handler.tags = ['rpg']
handler.command = /^(kerja|kerjadulu|work)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

