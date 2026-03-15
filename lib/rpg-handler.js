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
import { ActivityManager } from './activity-system.js'

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
   * Handle hunt activity
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
    
    if (result.rewards.resources) {
      for (const [key, val] of Object.entries(result.rewards.resources)) {
        user.resources[key] = (user.resources[key] || 0) + val
      }
    }

    await PlayerDataManager.savePlayer(db, senderId, user)

    return {
      success: true,
      message: `🎯 ${result.message}`,
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
   * Handle fishing activity
   */
  static async handleFish(db, senderId, senderName) {
    const user = await this.initializeUser(db, senderId, senderName)
    const result = ActivityManager.fish(user)
    
    if (result.error) {
      return { error: result.error }
    }

    user.money = (user.money || 0) + result.rewards.money
    user.addExperience(result.rewards.exp, false)
    user.addExperience(result.rewards.skillExp, true)

    await PlayerDataManager.savePlayer(db, senderId, user)

    return {
      success: true,
      message: `🎣 ${result.message}`,
      rewards: result.rewards,
      stats: { level: user.level, money: user.money }
    }
  }

  /**
   * Handle mining activity
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
    
    if (result.rewards.ores) {
      for (const [ore, amount] of Object.entries(result.rewards.ores)) {
        user.resources[ore] = (user.resources[ore] || 0) + amount
      }
    }

    await PlayerDataManager.savePlayer(db, senderId, user)

    return {
      success: true,
      message: `⛏️ ${result.message}`,
      rewards: result.rewards,
      stats: { level: user.level, money: user.money }
    }
  }

  /**
   * Handle work activity
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
      message: `💼 ${result.message}`,
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
   * Format activity result untuk display
   */
  static formatActivityResult(result, userName) {
    if (result.error) {
      return `⏳ *${userName}*\n${result.error}`
    }

    return `
👤 *${userName}*

${result.message}

*═══════════════════*
💰 Money: +${result.rewards.money.toLocaleString('id-ID')}
⭐ Exp: +${result.rewards.exp.toLocaleString('id-ID')}
🔮 Skill Exp: +${result.rewards.skillExp || 0}

*Level:* ${result.stats.level}
*HP:* ${result.stats.hp}
*Total Money:* 💹 ${result.stats.money.toLocaleString('id-ID')}
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
