/**
 * ============================================
 * UNIFIED RPG HANDLER v2.0
 * ============================================
 * Universitas handler untuk semua command RPG
 * Integrasi dengan core engine, combat, activities
 */

import { RPGPlayer, GAME_CONFIG, GameBalance, SKILL_DATABASE, EQUIPMENT_DATABASE } from './rpg-core-engine.js'
import { PlayerDataManager } from './player-data-manager.js'
import { CombatSession, BossRaidSession } from './combat-system-v2.js'
import { ActivityManager, FISHING_SYSTEM, HUNTING_ITEMS, MINING_ITEMS } from './activity-system-v3.js'

class RPGHandler {
  /**
   * Initialize RPG untuk user
   */
  static async initializeUser(db, senderId, senderName) {
    try {
      return await PlayerDataManager.getOrCreatePlayer(db, senderId, senderName)
    } catch (error) {
      console.error('Initialize error:', error)
      const fallbackPlayer = PlayerDataManager.initializeNewPlayer(senderId, senderName)
      return this.attachPlayerMethods(fallbackPlayer)
    }
  }

  /**
   * Attach methods to player object
   */
  static attachPlayerMethods(player) {
    if (!player.canPerformActivity) {
      player.canPerformActivity = function(activity) {
        const cooldownKey = activity.toLowerCase()
        if (!this.cooldowns) this.cooldowns = {}
        const timeSinceLastUse = Date.now() - (this.cooldowns[cooldownKey] || 0)
        const cooldownDuration = GAME_CONFIG.COOLDOWNS[cooldownKey] || 300000
        return timeSinceLastUse >= cooldownDuration
      }
    }
    if (!player.getCooldownRemaining) {
      player.getCooldownRemaining = function(activity) {
        const cooldownKey = activity.toLowerCase()
        if (!this.cooldowns) this.cooldowns = {}
        const lastUse = this.cooldowns[cooldownKey] || 0
        const cooldownDuration = GAME_CONFIG.COOLDOWNS[cooldownKey] || 300000
        const timePassed = Date.now() - lastUse
        const remaining = Math.max(0, cooldownDuration - timePassed)
        return Math.ceil(remaining / 1000)
      }
    }
    if (!player.setActivityCooldown) {
      player.setActivityCooldown = function(activity) {
        const cooldownKey = activity.toLowerCase()
        if (!this.cooldowns) this.cooldowns = {}
        this.cooldowns[cooldownKey] = Date.now()
      }
    }
    return player
  }

  /**
   * Handle hunt activity with detailed itemized rewards
   */
  static async handleHunt(db, senderId, senderName) {
    const user = await this.initializeUser(db, senderId, senderName)
    const result = ActivityManager.hunt(user, 1)
    
    if (result.error) {
      return { error: result.error }
    }

    user.money = (user.money || 0) + result.rewards.money
    user.addExperience(result.rewards.exp, false)
    user.addExperience(result.rewards.skillExp, true)
    
    if (result.rewards.items) {
      for (const [key, val] of Object.entries(result.rewards.items)) {
        user.inventory = user.inventory || {}
        user.inventory[key] = (user.inventory[key] || 0) + val
      }
    }

    await PlayerDataManager.savePlayer(db, senderId, user)

    return {
      success: true,
      message: result.message,
      prey: result.prey,
      emoji: result.emoji,
      isCrit: result.isCrit,
      rewards: result.rewards,
      stats: {
        level: user.level,
        hp: user.stats.hp,
        money: user.money,
        exp: user.exp
      }
    }
  }

  /**
   * Handle fishing activity with auto-fish support dan ekonomi suggestions
   */
  static async handleFish(db, senderId, senderName, autoMode = false, autoDays = 1) {
    const user = await this.initializeUser(db, senderId, senderName)
    
    // First, do manual fishing to get suggestion baseline
    let manualResult = null
    if (!autoMode) {
      manualResult = ActivityManager.fish(user, false, 1)
    }
    
    const result = ActivityManager.fish(user, autoMode, autoDays)
    
    if (result.error) {
      return { error: result.error }
    }

    user.money = (user.money || 0) + result.rewards.money
    if (result.rewards.diamondUsed) {
      user.diamond -= result.rewards.diamondUsed
    }
    user.addExperience(result.rewards.exp, false)
    user.addExperience(result.rewards.skillExp, true)

    // Add fish items to inventory
    if (result.rewards.items) {
      Object.entries(result.rewards.items).forEach(([fishType, count]) => {
        user.inventory = user.inventory || {}
        user.inventory[fishType] = (user.inventory[fishType] || 0) + count
      })
    }

    await PlayerDataManager.savePlayer(db, senderId, user)

    // Get suggestion untuk auto fishing
    const suggestion = autoMode ? null : ActivityManager.suggestFishingMode(user, manualResult)
    
    return {
      success: true,
      message: result.message,
      rewards: result.rewards,
      catches: result.catches,
      catchDetails: result.catchDetails,
      rodUsed: result.rodUsed,
      rodBonus: result.rodBonus,
      rodDurability: (user.equipment && user.equipment.fishingRodDurability) || null,
      suggestion: suggestion,
      stats: { level: user.level, money: user.money, diamond: user.diamond }
    }
  }

  /**
   * Handle mining activity with detailed ore extraction
   */
  static async handleMine(db, senderId, senderName) {
    const user = await this.initializeUser(db, senderId, senderName)
    const result = ActivityManager.mine(user)
    
    if (result.error) {
      return { error: result.error }
    }

    user.money = (user.money || 0) + result.rewards.money
    user.addExperience(result.rewards.exp, false)
    user.addExperience(result.rewards.skillExp, true)
    
    if (result.rewards.items) {
      for (const [ore, amount] of Object.entries(result.rewards.items)) {
        user.resources = user.resources || {}
        user.resources[ore] = (user.resources[ore] || 0) + amount
      }
    }

    await PlayerDataManager.savePlayer(db, senderId, user)

    return {
      success: true,
      message: result.message,
      oreSequence: result.oreSequence,
      rewards: result.rewards,
      stats: { level: user.level, money: user.money }
    }
  }

  /**
   * Handle work activity dengan multiple job types
   */
  static async handleWork(db, senderId, senderName, jobType = 'default') {
    const user = await this.initializeUser(db, senderId, senderName)
    const result = ActivityManager.work(user, jobType)
    
    if (result.error) {
      return { error: result.error }
    }

    user.money = (user.money || 0) + result.rewards.money
    user.addExperience(result.rewards.exp, false)
    user.addExperience(result.rewards.skillExp, true)

    await PlayerDataManager.savePlayer(db, senderId, user)

    return {
      success: true,
      message: result.message,
      job: result.job,
      jobDesc: result.jobDesc,
      jobEmoji: result.jobEmoji,
      rewards: result.rewards,
      stats: { level: user.level, money: user.money }
    }
  }

  /**
   * Handle adventure activity
   */
  static async handleAdventure(db, senderId, senderName, days = 1) {
    const user = await this.initializeUser(db, senderId, senderName)
    const result = ActivityManager.adventure(user, days)
    
    if (result.error) {
      return { error: result.error }
    }

    user.money = (user.money || 0) + result.rewards.money
    user.addExperience(result.rewards.exp, false)
    user.addExperience(result.rewards.skillExp, true)

    await PlayerDataManager.savePlayer(db, senderId, user)

    return {
      success: true,
      message: `🗺️ ${result.message}`,
      rewards: result.rewards,
      stats: { level: user.level, money: user.money }
    }
  }

  /**
   * Handle player stats display
   */
  static async handleStats(db, senderId, senderName) {
    const user = await this.initializeUser(db, senderId, senderName)
    const card = PlayerDataManager.getStatsCard(user)
    const power = PlayerDataManager.calculatePowerLevel(user)

    return {
      success: true,
      profile: senderName,
      stats: card,
      power,
      skill: user.skill
    }
  }

  /**
   * Handle dungeon combat
   */
  static async handleDungeonStart(db, senderId, senderName, difficulty = 'NORMAL') {
    const user = await this.initializeUser(db, senderId, senderName)
    
    if (!user.canPerformActivity('dungeon')) {
      const remaining = user.getCooldownRemaining('dungeon')
      return { error: `Dungeon cooldown. Wait ${remaining}s` }
    }

    // Create enemy
    const enemyLevel = Math.max(1, user.level - 5)
    const enemy = {
      id: 'dungeon_enemy_' + Date.now(),
      name: this.getRandomEnemyName(enemyLevel),
      level: enemyLevel,
      hp: 100 + (enemyLevel * 20),
      abilities: ['attack', 'bash']
    }

    // Start combat
    const combat = new CombatSession([user], enemy, difficulty)
    combat.start()

    return {
      success: true,
      combat: combat.getStatus(),
      combatId: combat.id,
      message: `⚔️ Battle started! vs ${enemy.name}`
    }
  }

  /**
   * Handle attack dalam combat
   */
  static handleAttack(combat, senderId, ability = 'slash') {
    if (!combat) {
      return { error: 'No active combat' }
    }

    const result = combat.playerAttack(senderId, ability)
    
    if (result.error) {
      return { error: result.error }
    }

    return {
      success: true,
      combat: result,
      finished: result.state === 'finished',
      rewards: combat.rewards || null
    }
  }

  /**
   * Get random enemy name
   */
  static getRandomEnemyName(level) {
    const enemies = [
      'Goblin', 'Slime', 'Wolf', 'Skeleton', 'Zombie', 'Ghost', 'Imp',
      'Baby Demon', 'Witch', 'Ghoul', 'Giant Scorpion', 'Baby Dragon',
      'Sorcerer', 'Mermaid', 'Orc', 'Troll', 'Spider', 'Bat'
    ]
    return enemies[Math.floor(Math.random() * enemies.length)]
  }

  /**
   * Handle skill selection
   */
  static async selectSkill(db, senderId, skillName) {
    const user = await this.initializeUser(db, senderId, '')
    
    if (!SKILL_DATABASE[skillName.toLowerCase()]) {
      return {
        error: 'Invalid skill',
        available: Object.keys(SKILL_DATABASE)
      }
    }

    user.skill = {
      name: skillName.toLowerCase(),
      level: 1,
      exp: 0
    }

    await PlayerDataManager.savePlayer(db, senderId, user)

    return {
      success: true,
      selectedSkill: user.skill.name,
      message: `✅ Skill selected: ${SKILL_DATABASE[skillName.toLowerCase()].name}`
    }
  }

  /**
   * Format activity result dengan detail rewards breakdown + suggestions
   */
  static formatActivityResult(result, userName) {
    if (result.error) {
      return `⏳ *${userName}*\n❌ ${result.error}`
    }

    let rewardBreakdown = ''

    // Hunt-specific
    if (result.prey) {
      rewardBreakdown += `\n🦌 *Prey:* ${result.emoji} ${result.prey}${result.isCrit ? ' 🎯' : ''}`
      
      // Weapon info
      if (result.weaponUsed) {
        const bonusPercent = Math.round((result.weaponDamageBonus - 1) * 100)
        rewardBreakdown += `\n⚔️ *Weapon:* ${result.weaponUsed} Lv.${result.toolLevel} (${bonusPercent > 0 ? '+' : ''}${bonusPercent}%)`
        if (result.weaponDurability) {
          rewardBreakdown += ` | Durability: ${result.weaponDurability.current}/${result.weaponDurability.max}`
        }
      }
    }

    // Fishing-specific
    if (result.catches) {
      rewardBreakdown += `\n🎣 *Caught ${result.catches} fish*`
      if (result.autoMode) {
        rewardBreakdown += ` (Auto ${result.autoDays}d)`
      }
      
      // Rod info
      if (result.rodUsed) {
        const bonusPercent = Math.round((result.rodCatchBonus - 1) * 100)
        rewardBreakdown += `\n🎯 *Rod:* ${result.rodUsed} Lv.${result.toolLevel} (${bonusPercent > 0 ? '+' : ''}${bonusPercent}%)`
        if (result.rodDurability) {
          rewardBreakdown += ` | Durability: ${result.rodDurability.current}/${result.rodDurability.max}`
        }
      }
      
      if (result.catchDetails && result.catchDetails.length > 0) {
        const rarityCount = {}
        result.catchDetails.forEach(c => {
          rarityCount[c.rarity] = (rarityCount[c.rarity] || 0) + 1
        })
        rewardBreakdown += '\n'
        Object.entries(rarityCount).forEach(([rarity, count]) => {
          const icon = FISHING_SYSTEM.fish[rarity.toLowerCase()].emoji
          rewardBreakdown += `  ${icon} ${rarity}: ${count}x\n`
        })
      }
    }

    // Mining-specific
    if (result.oreSequence) {
      rewardBreakdown += `\n⛏️ *Mined Ores:*`
      result.oreSequence.forEach(ore => {
        rewardBreakdown += `\n  ${ore.emoji} ${ore.ore}: ${ore.amount}x (${ore.rarity})`
      })
    }

    // Work-specific
    if (result.jobEmoji) {
      rewardBreakdown += `\n${result.jobEmoji} *Job:* ${result.jobDesc}`
    }

    // Items breakdown
    if (result.rewards.items && Object.entries(result.rewards.items).length > 0) {
      const hasRealItems = Object.entries(result.rewards.items).some(([k, v]) => !['kayu', 'kulit'].includes(k) && v > 0)
      if (hasRealItems) {
        rewardBreakdown += `\n📦 *Items:*`
        Object.entries(result.rewards.items).forEach(([item, count]) => {
          if (count > 0) {
            rewardBreakdown += `\n  • ${item}: ${count}x`
          }
        })
      }
    }

    const diamondUsed = result.rewards.diamondUsed || 0
    
    // Profitability suggestions
    let suggestionText = ''
    if (result.suggestion) {
      const sug = result.suggestion
      if (sug.recommendation) {
        suggestionText += `\n\n💡 *SUGGESTION:*`
        
        if (sug.recommendation === 'auto5d' && sug.profit5d) {
          const roi = sug.profit5d.estimatedProfit > 0 
            ? Math.round((sug.profit5d.estimatedProfit / sug.profit5d.diamondCost) * 100) 
            : 0
          suggestionText += `\n✅ Auto Fish 5 Days Recommended!`
          suggestionText += `\n  💎 Cost: ${sug.profit5d.diamondCost}`
          suggestionText += `\n  💰 Est. Value: ${sug.profit5d.estimatedValue.toLocaleString('id-ID')}+`
          suggestionText += `\n  📈 ROI: ${roi}%`
          suggestionText += `\n  🎯 Command: *!fish auto 5*`
        } else if (sug.recommendation === 'auto1d' && sug.profit1d) {
          const roi = sug.profit1d.estimatedProfit > 0 
            ? Math.round((sug.profit1d.estimatedProfit / sug.profit1d.diamondCost) * 100) 
            : 0
          suggestionText += `\n✅ Auto Fish 1 Day Recommended!`
          suggestionText += `\n  💎 Cost: ${sug.profit1d.diamondCost}`
          suggestionText += `\n  💰 Est. Value: ${sug.profit1d.estimatedValue.toLocaleString('id-ID')}+`
          suggestionText += `\n  📈 ROI: ${roi}%`
          suggestionText += `\n  🎯 Command: *!fish auto 1*`
        } else {
          suggestionText += `\n📊 ${sug.reason}`
        }
      }
    }

    return `
👤 *${userName}*
${result.message}${rewardBreakdown}

*═══════════════════════*
✨ *REWARDS:*
⭐ Exp: +${result.rewards.exp.toLocaleString('id-ID')}
🔮 Skill Exp: +${result.rewards.skillExp.toLocaleString('id-ID')}
💰 Money: +${result.rewards.money.toLocaleString('id-ID')}${diamondUsed > 0 ? `\n💎 Diamond Used: -${diamondUsed}` : ''}

📊 *STATS:*
*Level:* ${result.stats.level}
*Total Money:* 💹 ${result.stats.money.toLocaleString('id-ID')}${result.stats.diamond !== undefined ? `\n*Diamond:* 💎 ${result.stats.diamond}` : ''}${suggestionText}
    `
  }

  /**
   * Format combat status
   */
  static formatCombatStatus(combat) {
    const status = (combat && typeof combat.getStatus === 'function') ? combat.getStatus() : combat

    return `
*╔════════════════════╗*
*║     ⚔️  COMBAT     ║*
*╚════════════════════╝*

🆚 vs *${status.enemy.name}* Lv.${status.enemy.level}
   HP: ${status.enemy.hp}/${status.enemy.maxHp}

👤 *${status.players[0].name}* (You)
   HP: ${status.players[0].hp}/${status.players[0].maxHp}
   Skill: ${status.players[0].skill.name || 'None'}

*Turn:* ${status.turn}
*Difficulty:* ${status.difficulty}

*Recent Actions:*
${(status.recentLog || []).map(log => `• ${log}`).join('\n')}

*Commands:* !attack slash | !attack cleave | !flee
    `
  }

  /**
   * Get available skills
   */
  static getAvailableSkills() {
    return Object.entries(SKILL_DATABASE).map(([key, skill]) => ({
      name: key,
      display: `${skill.emoji} ${skill.name}`,
      description: skill.description
    }))
  }

  /**
   * Get player rank info
   */
  static async getPlayerRank(db, senderId) {
    if (!db.data.users) return { rank: -1, total: 0 }

    const sortedByLevel = Object.entries(db.data.users)
      .sort((a, b) => (b[1].level || 0) - (a[1].level || 0))
      .map(e => e[0])

    const rank = sortedByLevel.indexOf(senderId) + 1
    const total = sortedByLevel.length

    return { rank, total }
  }
}

export { RPGHandler }
