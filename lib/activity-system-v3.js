/**
 * ============================================
 * ACTIVITY SYSTEM v3.0 - ADVANCED
 * ============================================
 * Enhanced with detailed rewards, rarity systems, and auto-mechanics
 * Professional-grade activity management
 */

import { GAME_CONFIG, GameBalance, SKILL_DATABASE } from './rpg-core-engine.js'

// ============= FISHING RARITY SYSTEM (Fish It) =============
const FISHING_SYSTEM = {
  fish: {
    common: {
      rarity: 'COMMON',
      emoji: '🟦',
      names: ['Goldfish', 'Anchovy', 'Herring', 'Minnow', 'Perch'],
      weight: 60,
      value: 10,
      exp: 20
    },
    uncommon: {
      rarity: 'UNCOMMON',
      emoji: '🟩',
      names: ['Bass', 'Trout', 'Salmon', 'Catfish', 'Pike'],
      weight: 25,
      value: 50,
      exp: 60
    },
    rare: {
      rarity: 'RARE',
      emoji: '🟪',
      names: ['Carp', 'Tuna', 'Swordfish', 'Marlin', 'Shark'],
      weight: 10,
      value: 150,
      exp: 150
    },
    epic: {
      rarity: 'EPIC',
      emoji: '🟨',
      names: ['Bluefish', 'Grouper', 'Snapper', 'Barracuda', 'Wahoo'],
      weight: 4,
      value: 500,
      exp: 400
    },
    legend: {
      rarity: 'LEGEND',
      emoji: '🟧',
      names: ['Kraken', 'SeaDragon', 'Phoenix Fish', 'Leviathan', 'MysticFin'],
      weight: 0.8,
      value: 2000,
      exp: 1200
    },
    mythic: {
      rarity: 'MYTHIC',
      emoji: '⭐',
      names: ['Celestial Koi', 'Void Whale', 'Eternal Swimmer', 'Radiant Gill', 'StarManta'],
      weight: 0.15,
      value: 8000,
      exp: 3000
    },
    secret: {
      rarity: 'SECRET',
      emoji: '💎',
      names: ['Ancient Leviathan', 'Void Beast', 'Cosmic Guardian', 'Timeless Titan', 'MetaFish'],
      weight: 0.05,
      value: 20000,
      exp: 8000
    }
  }
}

// ============= HUNTING SYSTEM =============
const HUNTING_ITEMS = {
  prey: {
    common: [
      { name: 'Rabbit', value: 20, exp: 30, emoji: '🐰' },
      { name: 'Squirrel', value: 15, exp: 20, emoji: '🐿️' },
      { name: 'Bird', value: 18, exp: 28, emoji: '🦜' }
    ],
    uncommon: [
      { name: 'Deer', value: 100, exp: 80, emoji: '🦌' },
      { name: 'Wolf', value: 120, exp: 100, emoji: '🐺' },
      { name: 'Boar', value: 110, exp: 90, emoji: '🐗' }
    ],
    rare: [
      { name: 'Tiger', value: 400, exp: 300, emoji: '🐅' },
      { name: 'Bear', value: 450, exp: 350, emoji: '🐻' },
      { name: 'Lion', value: 500, exp: 400, emoji: '🦁' }
    ]
  }
}

// ============= MINING SYSTEM =============
const MINING_ITEMS = {
  ore: {
    copper: { value: 30, exp: 20, amount: 5, rarity: 'COMMON', emoji: '🟫' },
    iron: { value: 80, exp: 50, amount: 3, rarity: 'UNCOMMON', emoji: '⚪' },
    gold: { value: 300, exp: 150, amount: 1, rarity: 'RARE', emoji: '🟨' },
    diamond: { value: 1000, exp: 400, amount: 0.2, rarity: 'EPIC', emoji: '💎' },
    mithril: { value: 2500, exp: 800, amount: 0.05, rarity: 'MYTHIC', emoji: '⭐' }
  }
}

class ActivityManager {
  /**
   * Hunt with detailed itemized rewards
   */
  static hunt(player, difficulty = 1) {
    if (!player.canPerformActivity('hunt')) {
      const remaining = player.getCooldownRemaining('hunt')
      return { error: `Hunt on cooldown. Wait ${remaining}s` }
    }

    const agi_bonus = player.stats.agi * 0.2
    const crit_bonus = player.stats.crit * 0.3
    const success_chance = Math.min(95, 50 + (agi_bonus * 0.5) + (crit_bonus * 2))
    const is_success = Math.random() * 100 < success_chance

    if (!is_success) {
      return { 
        error: 'Hunt failed, prey escaped!',
        activity: 'hunt'
      }
    }

    const baseExpGain = GameBalance.calcActivityExp('hunt', player.level, player.skill.level, difficulty)
    const baseMoneyGain = 100 * difficulty * (1 + player.stats.luck * 0.1)

    // Determine prey rarity
    const rand = Math.random() * 100
    let preyList, preyData
    if (rand < 70) {
      preyList = HUNTING_ITEMS.prey.common
    } else if (rand < 95) {
      preyList = HUNTING_ITEMS.prey.uncommon
      baseMoneyGain *= 1.3
    } else {
      preyList = HUNTING_ITEMS.prey.rare
      baseMoneyGain *= 2.5
    }

    const prey = preyList[Math.floor(Math.random() * preyList.length)]
    const isCrit = Math.random() < (player.stats.crit * 0.01)
    const finalMoney = Math.floor(baseMoneyGain + prey.value * (isCrit ? 1.5 : 1))
    const meat = Math.floor(2 + Math.random() * 3) * (isCrit ? 1.3 : 1)

    player.setActivityCooldown('hunt')

    return {
      success: true,
      activity: 'hunt',
      prey: prey.name,
      emoji: prey.emoji,
      isCrit,
      rewards: {
        exp: baseExpGain,
        skillExp: Math.floor(baseExpGain * 0.2),
        money: finalMoney,
        items: {
          [`${prey.name.toLowerCase()}_meat`]: Math.floor(meat),
          kayu: Math.floor(3 * (1 + player.stats.agi * 0.05)),
          kulit: Math.floor(1 + Math.random() * 2)
        }
      },
      message: `🎯 ${prey.emoji} Hunted a *${prey.name}*! ${isCrit ? '🎯 Critical hit!' : ''}`
    }
  }

  /**
   * Advanced Fishing with Rarity System & Auto Fish
   */
  static fish(player, autoMode = false, autoDays = 1) {
    // Check cooldown for manual fishing
    if (!autoMode && !player.canPerformActivity('fishing')) {
      const remaining = player.getCooldownRemaining('fishing')
      return { error: `Fishing on cooldown. Wait ${remaining}s` }
    }

    // Auto fishing requires diamonds
    if (autoMode) {
      const diamondCost = 50 * autoDays
      if ((player.diamond || 0) < diamondCost) {
        return { error: `Need ${diamondCost} 💎 for ${autoDays}d auto fishing. You have ${player.diamond || 0}` }
      }
      player.diamond -= diamondCost
    }

    const baseExpGain = GameBalance.calcActivityExp('fishing', player.level, player.skill.level)
    const luckBonus = player.stats.luck * 0.1
    const catches = []
    const totalValue = { exp: 0, money: 0, skillExp: 0 }

    // Generate catches (1 manual, multiple for auto)
    const catchCount = autoMode ? Math.floor(5 + autoDays * 2) : 1 + (Math.random() < 0.3 ? 1 : 0)

    for (let i = 0; i < catchCount; i++) {
      const rarity = this.rollFishRarity(luckBonus)
      const fishData = FISHING_SYSTEM.fish[rarity]
      const fish = fishData.names[Math.floor(Math.random() * fishData.names.length)]

      catches.push({
        name: fish,
        rarity,
        emoji: fishData.emoji,
        value: fishData.value,
        exp: fishData.exp
      })

      totalValue.money += fishData.value
      totalValue.exp += fishData.exp
    }

    if (!autoMode) {
      player.setActivityCooldown('fishing')
    }
    player.addExperience(baseExpGain, false)
    player.addExperience(Math.floor(baseExpGain * 0.15), true)

    // Build detailed fish inventory
    const fishInventory = {}
    catches.forEach(catch_ => {
      const key = `${catch_.name.toLowerCase()}_${catch_.rarity.toLowerCase()}`
      fishInventory[key] = (fishInventory[key] || 0) + 1
    })

    return {
      success: true,
      activity: 'fishing',
      autoMode,
      autoDays: autoMode ? autoDays : 0,
      catches: catches.length,
      rewards: {
        exp: baseExpGain,
        skillExp: Math.floor(baseExpGain * 0.15),
        money: Math.floor(totalValue.money * (1 + luckBonus)),
        items: fishInventory,
        diamondUsed: autoMode ? 50 * autoDays : 0
      },
      catchDetails: catches,
      message: `🎣 ${autoMode ? `Auto fished ${autoDays}d! Caught ${catches.length} fish` : `Caught ${catches.length} fish`}`
    }
  }

  /**
   * Roll fish rarity based on luck
   */
  static rollFishRarity(luckMult = 0) {
    const rand = Math.random() * 100
    const rarityRates = {
      common: 60,
      uncommon: 25,
      rare: 10,
      epic: 3.5,
      legend: 1.3,
      mythic: 0.15,
      secret: 0.05
    }

    // Adjust rates based on luck
    const adjusted = Object.entries(rarityRates).reduce((acc, [key, val]) => {
      acc[key] = Math.max(0.01, val * (1 - luckMult * 0.5)) // Luck makes rare more likely
      return acc
    }, {})

    // Special luck boost: higher chance of rare+ for every 10 luck
    if (luckMult > 0) {
      adjusted.rare *= (1 + luckMult * 0.2)
      adjusted.epic *= (1 + luckMult * 0.15)
    }

    let cumulative = 0
    for (const [rarity, weight] of Object.entries(adjusted)) {
      cumulative += weight
      if (rand < cumulative) return rarity
    }
    return 'secret' // Should be extremely rare
  }

  /**
   * Mining with detailed ore extraction
   */
  static mine(player) {
    if (!player.canPerformActivity('mining')) {
      const remaining = player.getCooldownRemaining('mining')
      return { error: `Mining on cooldown. Wait ${remaining}s` }
    }

    const baseExpGain = GameBalance.calcActivityExp('mining', player.level, player.skill.level)
    const str_bonus = player.stats.str * 0.15
    const critmult = Math.max(1, 1 + (player.stats.crit * 0.05))

    const mined = {}
    const mineSequence = []

    // Guarantee some ores, bonus based on STR
    Object.entries(MINING_ITEMS.ore).forEach(([ore, data]) => {
      let amount = Math.floor(data.amount * (1 + str_bonus))
      if (Math.random() < (player.stats.crit * 0.01)) {
        amount = Math.floor(amount * critmult)
      }
      if (amount > 0) {
        mined[ore] = amount
        mineSequence.push({ ore, amount, emoji: data.emoji, rarity: data.rarity })
      }
    })

    player.setActivityCooldown('mining')

    return {
      success: true,
      activity: 'mining',
      rewards: {
        exp: baseExpGain,
        skillExp: Math.floor(baseExpGain * 0.18),
        money: Math.floor(200 * (1 + str_bonus)),
        items: mined
      },
      oreSequence: mineSequence,
      message: `⛏️ Mined beautifully!`
    }
  }

  /**
   * Work with multiple job types and detailed breakdown
   */
  static work(player, jobType = 'default') {
    if (!player.canPerformActivity('work')) {
      const remaining = player.getCooldownRemaining('work')
      return { error: `Work cooldown. Wait ${remaining}s` }
    }

    const jobs = {
      default: { exp: 100, money: 150, stat: 'str', desc: 'General Labor', emoji: '👷' },
      merchant: { exp: 120, money: 250, stat: 'mag', desc: 'Merchant Deal', emoji: '🏪' },
      guard: { exp: 110, money: 200, stat: 'def', desc: 'Security Guard', emoji: '🛡️' },
      scout: { exp: 130, money: 180, stat: 'agi', desc: 'Reconnaissance', emoji: '🔍' },
      mage: { exp: 140, money: 200, stat: 'mag', desc: 'Mage Tower', emoji: '🧙' },
      blacksmith: { exp: 135, money: 280, stat: 'str', desc: 'Blacksmith', emoji: '🔨' }
    }

    const job = jobs[jobType.toLowerCase()] || jobs.default
    const statBonus = player.stats[job.stat] * 0.15
    const baseExpGain = GameBalance.calcActivityExp('work', player.level, player.skill.level)
    const finalMoney = Math.floor(job.money * (1 + statBonus))

    player.setActivityCooldown('work')

    return {
      success: true,
      activity: 'work',
      job: jobType,
      jobDesc: job.desc,
      jobEmoji: job.emoji,
      rewards: {
        exp: baseExpGain,
        skillExp: Math.floor(baseExpGain * 0.12),
        money: finalMoney
      },
      message: `${job.emoji} *${job.desc}* completed! Earned ${finalMoney} 💰`
    }
  }

  /**
   * Adventure with treasure discovery
   */
  static adventure(player, days = 1) {
    if (!player.canPerformActivity('adventure')) {
      const remaining = player.getCooldownRemaining('adventure')
      return { error: `Adventure on cooldown. Wait ${remaining}s` }
    }

    const baseExpGain = GameBalance.calcActivityExp('dungeon', player.level, player.skill.level, 0.8) * days
    const treasureChance = 20 * days * (1 + player.stats.luck * 0.1)
    const loot = {
      gold_coins: Math.floor(300 * days * (1 + player.stats.luck * 0.1)),
      gems: Math.floor(Math.random() * (days + 1)),
      artifacts: []
    }

    if (Math.random() * 100 < treasureChance) {
      loot.artifacts.push('Ancient Artifact')
      loot.gold_coins *= 1.5
    }

    player.setActivityCooldown('adventure')

    return {
      success: true,
      activity: 'adventure',
      days,
      rewards: {
        exp: baseExpGain,
        skillExp: Math.floor(baseExpGain * 0.25),
        money: Math.floor(loot.gold_coins),
        items: {
          gems: loot.gems,
          artifacts: loot.artifacts.length
        }
      },
      loot,
      message: `🗺️ ${days}d adventure completed! Found ${loot.artifacts.length} artifact(s)`
    }
  }

  /**
   * Get available activities
   */
  static getAvailableActivities(player) {
    const activities = []
    const activitiesData = [
      { name: 'hunt', cooldown: GAME_CONFIG.COOLDOWNS.hunt, minLevel: 1, cost: 0 },
      { name: 'fishing', cooldown: GAME_CONFIG.COOLDOWNS.fishing, minLevel: 1, cost: 0 },
      { name: 'mining', cooldown: GAME_CONFIG.COOLDOWNS.mining, minLevel: 5, cost: 0 },
      { name: 'work', cooldown: GAME_CONFIG.COOLDOWNS.work, minLevel: 1, cost: 0 },
      { name: 'adventure', cooldown: GAME_CONFIG.COOLDOWNS.adventure, minLevel: 10, cost: 0 }
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

export { ActivityManager, FISHING_SYSTEM, HUNTING_ITEMS, MINING_ITEMS }
