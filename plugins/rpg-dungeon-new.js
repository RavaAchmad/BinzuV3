import { RPGHandler } from '../lib/rpg-handler.js'
import { CombatSession } from '../lib/combat-system-v2.js'

let handler = async (m, { conn, text, args }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const difficulty = (args[0] || 'NORMAL').toUpperCase()
    
    // Check valid difficulty
    const validDifficulties = ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE', 'INFERNO']
    if (!validDifficulties.includes(difficulty)) {
      return m.reply(`❌ Invalid difficulty!\nValid: ${validDifficulties.join(', ')}`)
    }

    // Start dungeon
    const result = await RPGHandler.handleDungeonStart(global.db, userId, userName, difficulty)
    
    if (result.error) {
      return m.reply(`⏳ ${result.error}`)
    }

    // Store active combat in global
    global.activeCombats = global.activeCombats || {}
    global.activeCombats[m.sender] = {
      combat: result.combat.combat || result.combat,
      combatId: result.combatId,
      userId: userId,
      userName: userName,
      chatId: m.chat,
      timeout: setTimeout(() => {
        delete global.activeCombats[m.sender]
      }, 300000) // 5 minute timeout
    }

    // Display combat start
    const combatText = RPGHandler.formatCombatStatus(global.activeCombats[m.sender].combat)
    m.reply(combatText)

  } catch (error) {
    console.error('Dungeon error:', error)
    m.reply(`❌ Error: ${error.message}`)
  }
}

handler.help = ['dungeon']
handler.tags = ['rpg', 'combat']
handler.command = /^dungeon$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
