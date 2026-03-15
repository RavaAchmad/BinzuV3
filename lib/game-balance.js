/**
 * ============================================
 * RPG GAME BALANCE MODULE v2.0
 * ============================================
 * Comprehensive balance formulas and tuning parameters
 * All game mechanics use formulas from this module
 */

// ============= BALANCE CONSTANTS =============
const BALANCE_CONFIG = {
  // Experience formulas
  EXPERIENCE: {
    BASE_EXP_PER_LEVEL: 1000,
    GROWTH_RATE: 1.12,           // 12% growth per level
    SKILL_EXP_MULTIPLIER: 0.2,   // Skill exp is 20% of activity exp
    LEVEL_UP_BONUS_EXP: 500      // Bonus exp on level up
  },

  // Equipment progression
  EQUIPMENT: {
    BASE_UPGRADE_COST: 100,
    COST_GROWTH_RATE: 1.45,      // 45% cost increase per level
    SOFT_CAP_LEVEL: 20,          // Slower growth after level 20
    SOFT_CAP_MODIFIER: 0.05,     // 5% per sqrt level
    STAT_BONUS_PER_LEVEL: 1.5,   // Stats increase per equipment level
    DURABILITY_REDUCTION: 2       // Durability loss per use
  },

  // Combat balance
  COMBAT: {
    BASE_PLAYER_HP: 120,
    BASE_PLAYER_MANA: 80,
    HP_PER_LEVEL: 5,
    MANA_PER_LEVEL: 3,
    BASE_CRIT_CHANCE: 5,
    CRIT_CAP: 50,                // Maximum crit % (50%)
    CRIT_MULTIPLIER: 1.5,        // Crit deals 50% more damage
    DEF_REDUCTION_RATE: 0.8,     // Defense blocks 80% of stat value
    ENEMY_DAMAGE_VARIANCE: 0.25  // ±25% enemy damage variance
  },

  // Difficulty scaling
  DIFFICULTY: {
    EASY: {
      multiplier: 0.7,
      expMult: 0.7,
      moneyMult: 0.7,
      dropMult: 0.5
    },
    NORMAL: {
      multiplier: 1.0,
      expMult: 1.0,
      moneyMult: 1.0,
      dropMult: 1.0
    },
    HARD: {
      multiplier: 1.8,
      expMult: 1.8,
      moneyMult: 1.8,
      dropMult: 1.5
    },
    NIGHTMARE: {
      multiplier: 3.0,
      expMult: 3.0,
      moneyMult: 3.0,
      dropMult: 2.5
    },
    INFERNO: {
      multiplier: 5.0,
      expMult: 5.0,
      moneyMult: 5.0,
      dropMult: 4.0
    }
  },

  // Activity rewards
  ACTIVITIES: {
    hunt: {
      baseExp: 150,
      baseMoney: 100,
      skillExpMult: 0.2
    },
    fishing: {
      baseExp: 120,
      baseMoney: 80,
      skillExpMult: 0.15
    },
    mining: {
      baseExp: 140,
      baseMoney: 150,
      skillExpMult: 0.18
    },
    work: {
      baseExp: 100,
      baseMoney: 150,
      skillExpMult: 0.1
    },
    adventure: {
      baseExp: 200,
      baseMoney: 300,
      skillExpMult: 0.25
    },
    dungeon: {
      baseExp: 200,
      baseMoney: 200,
      skillExpMult: 0.3
    }
  },

  // Drop rates
  DROP_RATES: {
    COMMON: 0.50,      // 50%
    UNCOMMON: 0.25,    // 25%
    RARE: 0.15,        // 15%
    EPIC: 0.08,        // 8%
    LEGENDARY: 0.02    // 2%
  },

  // Cooldown times (milliseconds)
  COOLDOWNS: {
    hunt: 300000,      // 5 minutes
    fishing: 300000,   // 5 minutes
    mining: 300000,    // 5 minutes
    work: 300000,      // 5 minutes
    adventure: 600000, // 10 minutes
    dungeon: 600000,   // 10 minutes
    bosraid: 3600000,  // 1 hour
    steal: 600000,     // 10 minutes
    training: 0,       // No cooldown
    rest: 0            // No cooldown
  }
}

// ============= ECONOMY BALANCE =============
const ECONOMY = {
  // Base prices for items/services
  PRICES: {
    hp_potion: 50,
    mana_potion: 50,
    revive_scroll: 200,
    stat_boost: 300
  },

  // Money sinks (where money disappears)
  MONEY_SINKS: {
    repair_equipment: (level) => Math.floor(50 * Math.pow(1.3, level)),
    teleport: 100,
    inn_sleep: 25,
    merchant_tax: 0.05  // 5% tax on trades
  },

  // Money sources (where money comes from)
  MONEY_SOURCES: {
    defeat_enemy: 50,
    complete_quest: 200,
    daily_bonus: 100,
    weekly_bonus: 500,
    achievement_reward: 300
  }
}

// ============= PROGRESSION BALANCE =============
const PROGRESSION = {
  // Level thresholds for dungeons
  DUNGEON_LEVELS: {
    BEGINNER: { min: 1, max: 20, multiplier: 0.5 },
    NORMAL: { min: 21, max: 50, multiplier: 1.0 },
    HARD: { min: 51, max: 100, multiplier: 1.8 },
    NIGHTMARE: { min: 101, max: 200, multiplier: 3.0 },
    INFERNO: { min: 201, max: 300, multiplier: 5.0 }
  },

  // Skill level progression
  SKILL_LEVELS: {
    MIN: 1,
    MAX: 50,
    EXP_PER_LEVEL: (level) => 500 * Math.pow(1.08, level)
  },

  // Player level ranges
  LEVEL_RANGES: {
    NOVICE: { min: 1, max: 30 },
    VETERAN: { min: 31, max: 80 },
    HERO: { min: 81, max: 150 },
    LEGEND: { min: 151, max: 250 },
    IMMORTAL: { min: 251, max: 300 }
  }
}

// ============= DEBUG/TUNING =============
const DEVELOPER_MODE = {
  ENABLED: false,
  MULTIPLIERS: {
    EXP: 1.0,           // Change to 2.0 for 2x exp in testing
    MONEY: 1.0,         // Change to 2.0 for 2x money in testing
    DROP_RATE: 1.0,     // Change to 2.0 for double drops
    COOLDOWN: 1.0       // Change to 0.1 for faster cooldowns
  }
}

// ============= HELPER FUNCTIONS =============
function getExpForLevel(level) {
  return Math.floor(
    BALANCE_CONFIG.EXPERIENCE.BASE_EXP_PER_LEVEL *
    Math.pow(BALANCE_CONFIG.EXPERIENCE.GROWTH_RATE, level - 1)
  )
}

function getUpgradeCost(level) {
  const baseCost = BALANCE_CONFIG.EQUIPMENT.BASE_UPGRADE_COST
  const growthRate = BALANCE_CONFIG.EQUIPMENT.COST_GROWTH_RATE
  const softCapLevel = BALANCE_CONFIG.EQUIPMENT.SOFT_CAP_LEVEL

  if (level <= softCapLevel) {
    return Math.floor(baseCost * Math.pow(growthRate, level))
  } else {
    const softCapMult = 1 + (Math.sqrt(level - softCapLevel) * BALANCE_CONFIG.EQUIPMENT.SOFT_CAP_MODIFIER)
    return Math.floor(baseCost * Math.pow(growthRate, softCapLevel) * softCapMult)
  }
}

function getDifficultyMultiplier(difficulty) {
  return (BALANCE_CONFIG.DIFFICULTY[difficulty] && BALANCE_CONFIG.DIFFICULTY[difficulty].multiplier) || 1.0
}

function getActivityExp(activity, level, skillLevel = 1) {
  const activityConfig = BALANCE_CONFIG.ACTIVITIES[activity] || BALANCE_CONFIG.ACTIVITIES.hunt
  const baseExp = activityConfig.baseExp
  const skillBonus = skillLevel * 2
  return Math.floor((baseExp + skillBonus) * (DEVELOPER_MODE.ENABLED ? DEVELOPER_MODE.MULTIPLIERS.EXP : 1))
}

function applyDeveloperMode(value, type = 'EXP') {
  if (!DEVELOPER_MODE.ENABLED) return value
  const multiplier = DEVELOPER_MODE.MULTIPLIERS[type] || 1.0
  return Math.floor(value * multiplier)
}

// ============= EXPORTS =============
export {
  BALANCE_CONFIG,
  ECONOMY,
  PROGRESSION,
  DEVELOPER_MODE,
  getExpForLevel,
  getUpgradeCost,
  getDifficultyMultiplier,
  getActivityExp,
  applyDeveloperMode
}
