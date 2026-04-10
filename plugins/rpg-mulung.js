/**
 * RPG - Mulung (Scavenging) Activity
 * Nerf #041: Max 800 per item (was 1000)
 */
import { RPGHandler } from '../lib/rpg-handler.js'
const MAX_ITEM_PER_MULUNG = 800
let handler = async (m, { conn }) => {
  try {
    const result = await RPGHandler.handleAdventure(global.db, m.sender, await conn.getName(m.sender), 1)
    // Cap rewards at 800 per item
    if (result.rewards) {
      if (result.rewards.money > MAX_ITEM_PER_MULUNG) result.rewards.money = MAX_ITEM_PER_MULUNG
      if (result.rewards.items) {
        for (let key of Object.keys(result.rewards.items)) {
          if (result.rewards.items[key] > MAX_ITEM_PER_MULUNG) result.rewards.items[key] = MAX_ITEM_PER_MULUNG
        }
      }
    }
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
