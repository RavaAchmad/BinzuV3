/**
 * RPG - Nguli Activity
 */
import { RPGHandler } from '../lib/rpg-handler.js'
let handler = async (m, { conn }) => {
  try {
    const result = await RPGHandler.handleWork(global.db, m.sender, await conn.getName(m.sender), 'general')
    m.reply(RPGHandler.formatActivityResult(result, await conn.getName(m.sender)))
  } catch (error) {
    m.reply('❌ Error: ' + error.message)
  }
}
handler.help = ['nguli']
handler.tags = ['rpg']
handler.command = /^nguli$/i
handler.register = true
handler.group = true
handler.rpg = true
export default handler
