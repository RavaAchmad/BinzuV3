import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, text, args }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    
    // Check for auto-fish mode
    const isAutoMode = args[0]?.toLowerCase() === 'auto'
    const autoDays = isAutoMode ? Math.min(30, parseInt(args[1]) || 1) : 0
    
    if (isAutoMode && autoDays < 1) {
      return m.reply('❌ Usage: !fish auto [days: 1-30]')
    }

    const result = await RPGHandler.handleFish(global.db, userId, userName, isAutoMode, autoDays)
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
