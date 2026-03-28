/**
 * RPG - Mulung (Scavenging) Activity
 */
import { RPGHandler } from '../lib/rpg-handler.js'
let handler = async (m, { conn }) => {
  try {
    const result = await RPGHandler.handleAdventure(global.db, m.sender, await conn.getName(m.sender), 1)
    m.reply(RPGHandler.formatActivityResult(result, await conn.getName(m.sender)))
  } catch (error) {
    m.reply('❌ Error: ' + error.message)
  }
}
handler.help = ['mulung']
handler.tags = ['rpg']
handler.command = /^mulung$/i
handler.register = true
handler.group = true
handler.rpg = true
export default handler
