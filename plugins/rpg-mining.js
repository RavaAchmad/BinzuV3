/**
 * RPG - Mining Activity
 */
import { RPGHandler } from '../lib/rpg-handler.js'
let handler = async (m, { conn }) => {
  try {
    const result = await RPGHandler.handleMine(global.db, m.sender, await conn.getName(m.sender))
    m.reply(RPGHandler.formatActivityResult(result, await conn.getName(m.sender)))
  } catch (error) {
    m.reply(`❌ Error: ${error.message}`)
  }
}
handler.help = ['mining']
handler.tags = ['rpg']
handler.command = /^mining$/i
handler.register = true
handler.group = true
handler.rpg = true
export default handler
