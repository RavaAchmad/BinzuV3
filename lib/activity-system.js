/**
 * ============================================
 * ACTIVITY SYSTEM v2.0
 * ============================================
 * Unified system for all RPG activities (hunt, fish, mine, work)
 * Skills integrated into all activities
 * Proper balance and progression
 */

import { GAME_CONFIG, GameBalance, SKILL_DATABASE } from './rpg-core-engine.js'

class ActivityManager {
  /**
   * Hunt activity with skill integration
   */
  static hunt(player, difficulty = 1) {
    if (!player.canPerformActivity('hunt')) {
      const remaining = player.getCooldownRemaining('hunt')
      return { error: `Hunt on cooldown. Wait ${remaining}s` }
    }

    // Skill bonus
    const agi_bonus = player.stats.agi * 0.2
    const crit_bonus = player.stats.crit * 0.3
    const success_chance = 50 + (agi_bonus * 0.5) + (crit_bonus * 2)

    // Experience gain
    const baseExpGain = GameBalance.calcActivityExp('hunt', player.level, player.skill.level, difficulty)
    const moneyGain = Math.floor(100 * difficulty * (1 + player.stats.luck * 0.1))
    
    // Random resource based on skill
    const resources = {
      kayu: Math.floor(5 * difficulty * (1 + player.stats.agi * 0.05)),
      daging: Math.floor(3 * difficulty * (1 + player.stats.crit * 0.08))
    }

    player.setActivityCooldown('hunt')
    player.addExperience(baseExpGain, false)
    player.addExperience(Math.floor(baseExpGain * 0.2), true) // Skill exp

    return {
      success: true,
      activity: 'hunt',
      rewards: {
        exp: baseExpGain,
        skillExp: Math.floor(baseExpGain * 0.2),
        money: moneyGain,
        resources
      },
      message: `🎯 Hunting successful! Gained ${baseExpGain} exp and ${moneyGain} money`
    }
  }

  /**
   * Fishing activity
   */
  static fish(player) {
    if (!player.canPerformActivity('fishing')) {
      const remaining = player.getCooldownRemaining('fishing')
      return { error: `Fishing on cooldown. Wait ${remaining}s` }
    }

    // Agility and luck based
    const baseExpGain = GameBalance.calcActivityExp('fishing', player.level, player.skill.level)
    const lucky_catch = Math.random() * 100 < (player.stats.luck * 10)
    
    const moneyGain = Math.floor(80 * (1 + player.stats.luck * 0.15))
    const fishCount = lucky_catch ? 5 : Math.floor(2 + Math.random() * 3)

    player.setActivityCooldown('fishing')
    player.addExperience(baseExpGain, false)
    player.addExperience(Math.floor(baseExpGain * 0.15), true)

    return {
      success: true,
      activity: 'fishing',
      rewards: {
        exp: baseExpGain,
        skillExp: Math.floor(baseExpGain * 0.15),
        money: moneyGain,
        fish: fishCount,
        lucky: lucky_catch
      },
      message: `🎣 Fishing successful! Caught ${fishCount} fish${lucky_catch ? ' 🌟 Jackpot!' : ''}`
    }
  }

  /**
   * Mining activity with tool durability
   */
  static mine(player) {
    if (!player.canPerformActivity('mining')) {
      const remaining = player.getCooldownRemaining('mining')
      return { error: `Mining on cooldown. Wait ${remaining}s` }
    }

    // STR and DEF based for mining
    const baseExpGain = GameBalance.calcActivityExp('mining', player.level, player.skill.level)
    const str_bonus = player.stats.str * 0.15
    const ore_quality = Math.min(4, Math.floor(1 + (str_bonus / 10)))

    const moneyGain = Math.floor(150 * (ore_quality / 4))
    const oresGained = {
      copper: Math.floor(5 * (1 + player.stats.str * 0.02)),
      iron: Math.floor(3 * (1 + player.stats.str * 0.03)),
      crystal: Math.floor(1 * (1 + player.stats.crit * 0.01))
    }

    player.setActivityCooldown('mining')
    player.addExperience(baseExpGain, false)
    player.addExperience(Math.floor(baseExpGain * 0.18), true)

    return {
      success: true,
      activity: 'mining',
      rewards: {
        exp: baseExpGain,
        skillExp: Math.floor(baseExpGain * 0.18),
        money: moneyGain,
        ores: oresGained,
        quality: ore_quality
      },
      message: `⛏️ Mining successful! Mined ore quality ${ore_quality}★`
    }
  }

  /**
   * Work/Job activity with skill bonuses
   */
  static work(player, jobType = 'default') {
    if (!player.canPerformActivity('work')) {
      const remaining = player.getCooldownRemaining('work')
      return { error: `Work cooldown. Wait ${remaining}s` }
    }

    // Different jobs have different requirements
    const jobs = {
      default: { exp: 100, money: 150, stat: 'str' },
      merchant: { exp: 120, money: 250, stat: 'mag' },
      guard: { exp: 110, money: 200, stat: 'def' },
      scout: { exp: 130, money: 180, stat: 'agi' },
      mage: { exp: 140, money: 200, stat: 'mag' }
    }

    const job = jobs[jobType] || jobs.default
    const statBonus = player.stats[job.stat] * 0.1
    
    const baseExpGain = GameBalance.calcActivityExp('work', player.level, player.skill.level)
    const moneyGain = Math.floor(job.money * (1 + statBonus))

    player.setActivityCooldown('work')
    player.addExperience(baseExpGain, false)
    player.addExperience(Math.floor(baseExpGain * 0.1), true)

    return {
      success: true,
      activity: 'work',
      job: jobType,
      rewards: {
        exp: baseExpGain,
        skillExp: Math.floor(baseExpGain * 0.1),
        money: moneyGain
      },
      message: `💼 ${jobType} job completed! Earned ${moneyGain} money`
    }
  }

  /**
   * Adventure activity (long activity, high reward)
   */
  static adventure(player, days = 1) {
    if (!player.canPerformActivity('adventure')) {
      const remaining = player.getCooldownRemaining('adventure')
      return { error: `Adventure on cooldown. Wait ${remaining}s` }
    }

    // All-around activity
    const baseExpGain = GameBalance.calcActivityExp('dungeon', player.level, player.skill.level, 0.8) * days
    const moneyGain = Math.floor(300 * days * (1 + player.stats.luck * 0.1))
    
    const discoveries = {
      treasure: Math.floor(Math.random() * 5),
      artifacts: Math.floor(Math.random() * 2)
    }

    player.setActivityCooldown('adventure')
    player.addExperience(baseExpGain, false)
    player.addExperience(Math.floor(baseExpGain * 0.25), true)

    return {
      success: true,
      activity: 'adventure',
      rewards: {
        exp: baseExpGain,
        skillExp: Math.floor(baseExpGain * 0.25),
        money: moneyGain,
        discoveries
      },
      message: `🗺️ Adventure completed! Found ${discoveries.treasure} treasures and ${discoveries.artifacts} artifacts`
    }
  }

  /**
   * Skill training - train a specific skill
   */
  static trainSkill(player, hours = 1) {
    const baseSkillExp = 150 * hours
    const intelligenceBonus = player.stats.mag * 0.1
    const totalSkillExp = Math.floor(baseSkillExp * (1 + intelligenceBonus))

    player.addExperience(totalSkillExp, true)

    return {
      success: true,
      activity: 'training',
      rewards: {
        skillExp: totalSkillExp
      },
      message: `📚 Trained for ${hours}h! Gained ${totalSkillExp} skill exp`
    }
  }

  /**
   * Rest - restore HP and Mana
   */
  static rest(player) {
    const maxHp = player.stats.hp
    const maxMana = player.stats.mana
    
    player.currentHp = maxHp
    player.currentMana = maxMana

    return {
      success: true,
      activity: 'rest',
      restored: {
        hp: maxHp,
        mana: maxMana
      },
      message: `😴 Rested well! HP and Mana fully restored`
    }
  }

  /**
   * Stealing/Robbery activity (high risk, high reward)
   */
  static steal(player, target = {}) {
    if (!player.canPerformActivity('steal')) {
      const remaining = player.getCooldownRemaining('steal')
      return { error: `Cooldown. Wait ${remaining}s` }
    }

    // Based on AGI and CRIT
    const successChance = 30 + (player.stats.agi * 0.5) + (player.stats.crit * 0.3)
    const criticalSuccess = Math.random() < 0.2 // 20% chance of critical steal
    
    const targetMoney = target.money || 500
    const stolenAmount = criticalSuccess 
      ? Math.floor(targetMoney * 1.5)
      : Math.floor(targetMoney * 0.7)

    const isSuccess = Math.random() * 100 < successChance

    player.setActivityCooldown('steal')

    if (isSuccess) {
      player.addExperience(Math.floor(GameBalance.calcActivityExp('dungeon', player.level, player.skill.level, 1.2)), false)
      
      return {
        success: true,
        activity: 'steal',
        stole: true,
        amount: stolenAmount,
        message: `💰 Stole ${stolenAmount} money!${criticalSuccess ? ' 🎯 Critical success!' : ''}`
      }
    } else {
      const penalty = Math.floor(stolenAmount * 0.5)
      player.money = Math.max(0, player.money - penalty)

      return {
        success: false,
        activity: 'steal',
        stole: false,
        penalty,
        message: `⛔ Caught! Lost ${penalty} money as penalty`
      }
    }
  }

  /**
   * Get available activities for player
   */
  static getAvailableActivities(player) {
    const activities = []
    
    const activitiesData = [
      { name: 'hunt', cooldown: GAME_CONFIG.COOLDOWNS.hunt, minLevel: 1 },
      { name: 'fishing', cooldown: GAME_CONFIG.COOLDOWNS.fishing, minLevel: 1 },
      { name: 'mining', cooldown: GAME_CONFIG.COOLDOWNS.mining, minLevel: 5 },
      { name: 'work', cooldown: GAME_CONFIG.COOLDOWNS.work, minLevel: 1 },
      { name: 'adventure', cooldown: GAME_CONFIG.COOLDOWNS.adventure, minLevel: 10 },
      { name: 'steal', cooldown: GAME_CONFIG.COOLDOWNS.steal, minLevel: 15 }
    ]

    for (const activity of activitiesData) {
      if (player.level >= activity.minLevel) {
        activities.push({
          ...activity,
          available: player.canPerformActivity(activity.name),
          cooldownRemaining: player.getCooldownRemaining(activity.name)
        })
      }
    }

    return activities
  }
}

export { ActivityManager }
