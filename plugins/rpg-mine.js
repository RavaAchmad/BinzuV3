import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, text }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    
    const result = await RPGHandler.handleMine(global.db, userId, userName)
    const formattedMessage = RPGHandler.formatActivityResult(result, userName)
    
    m.reply(formattedMessage)
  } catch (error) {
    m.reply(`❌ Error: ${error.message}`)
  }
}

handler.help = ['mine', 'mining']
handler.tags = ['rpg']
handler.command = /^(mine|mining)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
