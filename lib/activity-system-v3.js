/**
 * ============================================
 * ACTIVITY SYSTEM v3.0 - ADVANCED
 * ============================================
 * Enhanced with detailed rewards, rarity systems, and auto-mechanics
 * Professional-grade activity management
 * Integrated with Tool Upgrade System
 */

import { GAME_CONFIG, GameBalance, SKILL_DATABASE, EQUIPMENT_DATABASE } from './rpg-core-engine.js'
import toolSystem from './tool-system.js'

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

// ============= TOOL SYSTEM INTEGRATION HELPERS =============
/**
 * Get tool stats for a player
 * Integrates tool-system level progression with activities
 */
function getPlayerToolStats(player, toolName) {
  const toolLevel = player[toolName] || 0
  const toolData = toolSystem.tools[toolName]
  
  if (!toolData || toolLevel === 0) {
    return {
      hasOwnTool: false,
      level: 0,
      stats: {},
      durability: 0,
      maxDurability: 0
    }
  }

  const stats = toolSystem.getStats(toolName, toolLevel)
  const maxDurability = toolData.baseStats.durability + (toolData.statGrowth.durability * toolLevel)
  const currentDurability = player[`${toolName}durability`] || maxDurability

  return {
    hasOwnTool: true,
    level: toolLevel,
    name: toolData.name,
    emoji: toolData.emoji,
    stats,
    durability: currentDurability,
    maxDurability,
    tier: toolSystem.getTierEmoji(toolLevel, toolData.maxLevel)
  }
}

/**
 * Apply tool durability wear after activity
 */
function applyToolDurabilityWear(player, toolName, wearAmount) {
  const current = player[`${toolName}durability`] || 0
  player[`${toolName}durability`] = Math.max(0, current - wearAmount)
}

class ActivityManager {
  /**
   * Calculate auto-fishing delay (random, prevents economy breaking)
   * Higher investment = smaller random delays
   */
  static calculateAutoFishingDelay(autoDays, rodBonus = 1) {
    // Base delay: 30-60 seconds per day
    const baseDelay = (30000 + Math.random() * 30000) * autoDays
    // Rod bonus reduces delay (better rod = faster catches but still random)
    const rodReduction = Math.max(0.3, 1 - (rodBonus * 0.15))
    const totalDelay = Math.floor(baseDelay * rodReduction)
    return totalDelay
  }

  /**
   * Calculate auto-fishing profitability with tool wear
   */
  static calculateAutoFishingProfitability(player, autoDays, rodBonus = 1) {
    const diamondCost = 50 * autoDays
    const rodWearPerDay = 20 * (1 / rodBonus) // Better rod = less wear
    const estimatedCatches = 5 + (autoDays * 2)
    
    // Estimate average fish value (conservative)
    const avgFishValue = 150 * rodBonus
    const estimatedProfit = (estimatedCatches * avgFishValue) - diamondCost
    
    return {
      diamondCost,
      estimatedProfit,
      estimatedValue: Math.floor(estimatedCatches * avgFishValue),
      rodWear: Math.floor(rodWearPerDay * autoDays),
      isProfitable: estimatedProfit > 0,
      roi: Math.round((estimatedProfit / diamondCost) * 100) // Return on investment %
    }
  }

  /**
   * Suggest auto-fishing or manual based on economics
   */
  static suggestFishingMode(player, manualResult) {
    if (!player) return null
    
    const hasRod = player.equipment && player.equipment.fishingRod
    const rodBonus = hasRod ? (player.equipment.fishingRodBonus || 1) : 1
    const diamond = player.diamond || 0
    
    // Calculate if player should auto-fish
    const auto1d = this.calculateAutoFishingProfitability(player, 1, rodBonus)
    const auto5d = this.calculateAutoFishingProfitability(player, 5, rodBonus)
    
    const suggestion = {
      hasEnoughDiamond1d: diamond >= 50,
      hasEnoughDiamond5d: diamond >= 250,
      profit1d: auto1d,
      profit5d: auto5d,
      recommendation: null,
      reason: null
    }
    
    // Smart recommendation
    if (diamond >= 250 && auto5d.isProfitable && auto5d.roi > 100) {
      suggestion.recommendation = 'auto5d'
      suggestion.reason = `ROI: ${auto5d.roi}% profit on 5d auto (${auto5d.estimatedValue} value - ${auto5d.diamondCost} cost)`
    } else if (diamond >= 50 && auto1d.isProfitable && auto1d.roi > 50) {
      suggestion.recommendation = 'auto1d'
      suggestion.reason = `ROI: ${auto1d.roi}% profit on 1d auto`
    } else if (diamond >= 50) {
      suggestion.recommendation = 'auto1d'
      const manualProfit = (manualResult && manualResult.rewards && manualResult.rewards.money) ? manualResult.rewards.money : 0
      suggestion.reason = `Can afford auto. Manual profit: ${manualProfit}`
    }
    
    return suggestion
  }

  /**
   * Hunt with detailed itemized rewards
   */
  static hunt(player, difficulty = 1) {
    if (!player.canPerformActivity('hunt')) {
      const remaining = player.getCooldownRemaining('hunt')
      return { error: `Hunt on cooldown. Wait ${remaining}s` }
    }

    // Get sword tool stats from tool system
    const swordTool = getPlayerToolStats(player, 'sword')
    const weaponName = swordTool.hasOwnTool ? swordTool.name : 'Bare Hands'
    const weaponEmoji = swordTool.hasOwnTool ? swordTool.emoji : '👊'

    // Calculate bonuses from sword
    let damageBonus = 1.0
    let critMultiplier = 1.0
    let durabilityUsed = 0

    if (swordTool.hasOwnTool) {
      const toolStats = swordTool.stats
      // Damage bonus from tool level
      damageBonus = 1.0 + (toolStats.damage * 0.02) // 2% per damage point
      // Crit chance bonus (already capped at 20% in tool-system)
      const toolCritBonus = Math.max(0, toolStats.critChance - 5) / 100 // Additional crit chance
      critMultiplier = 1.0 + toolCritBonus

      // Check durability
      if (swordTool.durability < 1) {
        return { 
          error: `Sword broken! Durability: ${swordTool.durability}. Repair your sword to continue hunting.`,
          activity: 'hunt'
        }
      }
    }

    const agi_bonus = player.stats.agi * 0.2
    const crit_bonus = (player.stats.crit * critMultiplier) * 0.3
    const success_chance = Math.min(95, 50 + (agi_bonus * 0.5) + (crit_bonus * 2))
    const is_success = Math.random() * 100 < success_chance

    if (!is_success) {
      return { 
        error: 'Hunt failed, prey escaped!',
        activity: 'hunt'
      }
    }

    const baseExpGain = GameBalance.calcActivityExp('hunt', player.level, player.skill.level, difficulty)
    let baseMoneyGain = 100 * difficulty * (1 + player.stats.luck * 0.1)

    // Apply damage bonus to money gain
    baseMoneyGain *= damageBonus

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
    let finalMoney = Math.floor(baseMoneyGain + prey.value * (isCrit ? 1.5 : 1))
    let meat = Math.floor(2 + Math.random() * 3) * (isCrit ? 1.3 : 1)

    // Apply sword durability bonus (better sword = weapon lasts longer)
    if (swordTool.hasOwnTool) {
      meat *= (1 + (swordTool.stats.damageBonus || 0) * 0.01) // Extra meat from tool bonus
      durabilityUsed = 1 // Hunting uses 1 durability
      applyToolDurabilityWear(player, 'sword', durabilityUsed)
    }

    player.setActivityCooldown('hunt')

    return {
      success: true,
      activity: 'hunt',
      toolLevel: swordTool.level,
      weaponUsed: weaponName,
      weaponEmoji: weaponEmoji,
      weaponDamageBonus: damageBonus,
      weaponDurability: { current: swordTool.durability - durabilityUsed, max: swordTool.maxDurability, used: durabilityUsed },
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
   * Advanced Fishing with Rarity System & Auto Fish dengan Tool System Integration
   */
  static fish(player, autoMode = false, autoDays = 1) {
    // Check cooldown for manual fishing (auto not affected by cooldown)
    if (!autoMode && !player.canPerformActivity('fishing')) {
      const remaining = player.getCooldownRemaining('fishing')
      return { error: `Fishing on cooldown. Wait ${remaining}s` }
    }

    // Get fishing rod tool stats from new tool system
    const rodTool = getPlayerToolStats(player, 'fishingrod')
    const rodName = rodTool.hasOwnTool ? rodTool.name : 'Bare Hands'
    const rodEmoji = rodTool.hasOwnTool ? rodTool.emoji : '🎣'
    
    // Calculate bonuses from BOTH systems:
    // 1. Tool level stats (from tool-system.js)
    // 2. Legacy equipment bonus (for compatibility)
    let totalCatchBonus = 1.0
    let totalRarityBonus = 0
    let totalSpeedBonus = 1.0
    
    if (rodTool.hasOwnTool) {
      // Apply tool-system bonuses
      const toolStats = rodTool.stats
      // catchRate is directly a multiplier (35-base +5-per level = 1.0-2.5x multiplier effect)
      totalCatchBonus = 1.0 + (toolStats.catchRate * 0.01)
      // Speed bonus already multiplier scaled
      totalSpeedBonus = toolStats.speedBonus || 1.0
      // Rarity bonus from tool level
      totalRarityBonus = (totalCatchBonus - 1.0) * 0.3 // 30% of catch bonus converts to rarity
    }

    // Auto fishing requires diamonds
    let diamondCost = 0
    if (autoMode) {
      diamondCost = 50 * autoDays
      if ((player.diamond || 0) < diamondCost) {
        return { error: `Need ${diamondCost} 💎 for ${autoDays}d auto fishing. You have ${player.diamond || 0}` }
      }
      
      // Check durability before auto-fish
      if (rodTool.hasOwnTool) {
        const wearNeeded = Math.floor(20 * autoDays * (1 / totalSpeedBonus))
        if (rodTool.durability < wearNeeded) {
          return { 
            error: `Rod durability insufficient. Need ${wearNeeded}, have ${rodTool.durability}. Repair your fishing rod to continue.` 
          }
        }
      }
      
      player.diamond -= diamondCost
    } else {
      // Manual fishing just costs 1 durability
      if (rodTool.hasOwnTool && rodTool.durability < 1) {
        return { error: `Rod broken! Durability: ${rodTool.durability}. Craft or repair a new rod.` }
      }
    }

    const baseExpGain = GameBalance.calcActivityExp('fishing', player.level, player.skill.level)
    const luckBonus = player.stats.luck * 0.1
    const catches = []
    const totalValue = { exp: 0, money: 0, skillExp: 0 }

    // Generate catches dengan tool bonuses applied
    const baseCount = autoMode ? Math.floor((5 + autoDays * 2)) : 1
    const catchCount = Math.floor(baseCount * totalCatchBonus)

    for (let i = 0; i < catchCount; i++) {
      const rarity = this.rollFishRarity(luckBonus + totalRarityBonus)
      const fishData = FISHING_SYSTEM.fish[rarity]
      const fish = fishData.names[Math.floor(Math.random() * fishData.names.length)]
      const fishValue = Math.floor(fishData.value * totalCatchBonus) // Tool bonus increases value

      catches.push({
        name: fish,
        rarity,
        emoji: fishData.emoji,
        value: fishValue,
        exp: fishData.exp
      })

      totalValue.money += fishValue
      totalValue.exp += fishData.exp
    }

    if (!autoMode) {
      player.setActivityCooldown('fishing')
    }
    player.addExperience(baseExpGain, false)
    player.addExperience(Math.floor(baseExpGain * 0.15), true)

    // Apply rod durability wear
    let durabilityUsed = 0
    if (rodTool.hasOwnTool) {
      durabilityUsed = autoMode ? Math.floor(20 * autoDays * (1 / totalSpeedBonus)) : 1
      applyToolDurabilityWear(player, 'fishingrod', durabilityUsed)
    }

    // Build detailed fish inventory
    const fishInventory = {}
    catches.forEach(catch_ => {
      const key = `${catch_.name.toLowerCase()}_${catch_.rarity.toLowerCase()}`
      fishInventory[key] = (fishInventory[key] || 0) + 1
    })

    const finalMoney = Math.floor(totalValue.money * (1 + luckBonus))
    
    return {
      success: true,
      activity: 'fishing',
      autoMode,
      autoDays: autoMode ? autoDays : 0,
      catches: catches.length,
      toolLevel: rodTool.level,
      rodUsed: rodName,
      rodEmoji: rodEmoji,
      rodCatchBonus: totalCatchBonus,
      rodDurability: { current: rodTool.durability - durabilityUsed, max: rodTool.maxDurability, used: durabilityUsed },
      rewards: {
        exp: baseExpGain,
        skillExp: Math.floor(baseExpGain * 0.15),
        money: finalMoney,
        items: fishInventory,
        diamondUsed: diamondCost
      },
      catchDetails: catches,
      message: `${rodEmoji} ${autoMode ? `Auto fished ${autoDays}d! Caught ${catches.length} fish (${rodName} Lv.${rodTool.level})` : `Caught ${catches.length} fish (${rodName} Lv.${rodTool.level})`}`
    }
  }

  /**
   * Roll fish rarity based on luck dan rod bonus
   */
  static rollFishRarity(luckMult = 0, rodBonus = 0) {
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

    // Rod bonus affects rarity pull
    if (rodBonus > 0) {
      adjusted.rare *= (1 + rodBonus * 0.3)
      adjusted.epic *= (1 + rodBonus * 0.25)
      adjusted.legend *= (1 + rodBonus * 0.15)
      adjusted.common *= Math.max(0.5, 1 - (rodBonus * 0.2))
    }

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
