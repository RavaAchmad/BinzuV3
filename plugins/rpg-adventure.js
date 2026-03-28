/**
 * RPG - Adventure Activity
 * Using new unified RPGHandler system
 */
import { RPGHandler } from '../lib/rpg-handler.js'

const cooldown = 120000 // 2 minutes - real cooldown handled by RPGHandler

let handler = async (m, { conn }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const result = await RPGHandler.handleAdventure(global.db, userId, userName, 1)
    m.reply(RPGHandler.formatActivityResult(result, userName))
  } catch (error) {
    m.reply('❌ Error: ' + error.message)
  }
}

handler.help = ['adventure', 'adventure']
handler.tags = ['rpg']
handler.command = /^(adventure|adventure)$/i
handler.register = true
handler.group = true
handler.cooldown = cooldown
handler.rpg = true
export default handler
