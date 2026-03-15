import { RPGHandler } from '../lib/rpg-handler.js'
import { SKILL_DATABASE } from '../lib/rpg-core-engine.js'

let handler = async (m, { conn, text, args }) => {
  try {
    const userId = m.sender
    const activeComabt = global.activeCombats?.[userId]

    // Check if in combat
    if (!activeComabt) {
      return m.reply('❌ You are not in any combat!\nUse !dungeon to start.')
    }

    // Check correct user
    if (activeComabt.userId !== userId) {
      return m.reply('❌ This is not your combat!')
    }

    // Get ability from args
    const abilityName = args[0]?.toLowerCase() || 'slash'

    // Perform attack
    const result = RPGHandler.handleAttack(activeComabt.combat, userId, abilityName)

    if (result.error) {
      return m.reply(`❌ ${result.error}`)
    }

    // Show combat result
    const combatDisplay = RPGHandler.formatCombatStatus(result.combat)
    m.reply(combatDisplay)

    // Check if combat ended
    if (result.finished && result.rewards) {
      // Apply rewards to player
      const user = await RPGHandler.initializeUser(global.db, userId, activeComabt.userName)
      
      if (result.rewards.won) {
        user.money = (user.money || 0) + result.rewards.moneyPerPlayer
        user.addExperience(result.rewards.expPerPlayer, false)
        
        const rewardMsg = `
🎉 *VICTORY!*
${result.rewards.messages.join('\n')}
        `
        m.reply(rewardMsg)
      } else {
        const defeatMsg = `
💀 *DEFEAT!*
${result.rewards.messages.join('\n')}
        `
        m.reply(defeatMsg)
      }

      // Save player & Clean up
      await RPGHandler.initializeUser(global.db, userId, activeComabt.userName)
      clearTimeout(activeComabt.timeout)
      delete global.activeCombats[userId]
    }

  } catch (error) {
    console.error('Attack error:', error)
    m.reply(`❌ Error: ${error.message}`)
  }
}

handler.help = ['attack']
handler.tags = ['rpg', 'combat']
handler.command = /^attack$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
