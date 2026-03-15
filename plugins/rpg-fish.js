import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, text }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    
    const result = await RPGHandler.handleFish(global.db, userId, userName)
    const formattedMessage = RPGHandler.formatActivityResult(result, userName)
    
    m.reply(formattedMessage)
  } catch (error) {
    m.reply(`❌ Error: ${error.message}`)
  }
}

handler.help = ['fish', 'mancing', 'fishing']
handler.tags = ['rpg']
handler.command = /^(fish|mancing|fishing)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
