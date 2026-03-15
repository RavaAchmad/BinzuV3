import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, text, args }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const jobType = args[0] || 'default'
    
    const result = await RPGHandler.handleWork(global.db, userId, userName, jobType)
    const formattedMessage = RPGHandler.formatActivityResult(result, userName)
    
    m.reply(formattedMessage)
  } catch (error) {
    m.reply(`❌ Error: ${error.message}`)
  }
}

handler.help = ['work', 'kerja', 'job']
handler.tags = ['rpg']
handler.command = /^(work|kerja|job)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
