/**
 * ============================================
 * ADVANCED RPG CORE ENGINE v2.0
 * ============================================
 * Unified game system for all RPG mechanics
 * Replaces fragmented skill/combat/leveling systems
 * 
 * Features:
 * - Single source of truth for player stats
 * - Integrated skill system across all activities
 * - Unified cooldown management
 * - Professional game balance
 * - Persistent state management
 */

// ============= GAME CONSTANTS =============
const GAME_CONFIG = {
  // Progression
  MIN_LEVEL: 1,
  MAX_LEVEL: 300,
  SKILL_MAX_LEVEL: 50,
  
  // Resources
  RESOURCES: ['kayu', 'batu', 'iron', 'crystal', 'gold'],
  CURRENCIES: ['money', 'diamond', 'emerald'],
  
  // Cooldowns (in milliseconds)
  COOLDOWNS: {
    dungeon: 600000,        // 10 minutes
    bosraid: 3600000,       // 1 hour
    hunt: 300000,           // 5 minutes
    mining: 300000,         // 5 minutes
    fishing: 300000,        // 5 minutes
    work: 300000,           // 5 minutes
    adventure: 600000,      // 10 minutes
    mission: 86400000,      // 24 hours
    steal: 600000           // 10 minutes
  }
}

// ============= SKILL DATABASE =============
const SKILL_DATABASE = {
  swordmaster: {
    name: 'Swordmaster',
    emoji: '⚔️',
    description: 'Master of swords and melee combat',
    type: 'warrior',
    statBonus: { str: 2.5, def: 1.5, hp: 1.2, crit: 0.8 },
    abilities: {
      slash: { name: 'Slash', dmgMult: 1.2, cooldown: 0 },
      cleave: { name: 'Cleave', dmgMult: 1.8, cooldown: 2, levelReq: 10 },
      execute: { name: 'Execute', dmgMult: 2.5, cooldown: 3, levelReq: 25, manaCost: 30 }
    }
  },
  archer: {
    name: 'Archer',
    emoji: '🏹',
    description: 'Swift and precise ranged attacks',
    type: 'ranger',
    statBonus: { agi: 3, crit: 1.8, str: 1.2, def: 0.5 },
    abilities: {
      pierce: { name: 'Pierce Shot', dmgMult: 1.1, cooldown: 0 },
      multishot: { name: 'Multi Shot', dmgMult: 1.5, cooldown: 2, levelReq: 10 },
      snipe: { name: 'Snipe', dmgMult: 2.2, cooldown: 3, levelReq: 25, manaCost: 25 }
    }
  },
  mage: {
    name: 'Mage',
    emoji: '🧙',
    description: 'Master of elemental magic',
    type: 'mage',
    statBonus: { mag: 3, mana: 2, def: 1, crit: 1.2 },
    abilities: {
      fireball: { name: 'Fireball', dmgMult: 1.3, cooldown: 0, manaCost: 20 },
      frostbolt: { name: 'Frostbolt', dmgMult: 1.2, cooldown: 0, manaCost: 15, effect: 'slow' },
      meteor: { name: 'Meteor', dmgMult: 2.0, cooldown: 3, levelReq: 20, manaCost: 50 }
    }
  },
  necromancer: {
    name: 'Necromancer',
    emoji: '💀',
    description: 'Command death and shadow magic',
    type: 'dark',
    statBonus: { mag: 3, def: 0.8, hp: 0.8, lifeSteal: 1.5 },
    abilities: {
      darkbolt: { name: 'Dark Bolt', dmgMult: 1.4, cooldown: 0, manaCost: 20 },
      lifedrain: { name: 'Life Drain', dmgMult: 1.0, cooldown: 1, manaCost: 25, effect: 'heal' },
      deathstrike: { name: 'Death Strike', dmgMult: 2.3, cooldown: 3, levelReq: 25, manaCost: 60 }
    }
  },
  paladin: {
    name: 'Paladin',
    emoji: '⛑️',
    description: 'Holy warrior with healing power',
    type: 'hybrid',
    statBonus: { str: 2, def: 2.5, mana: 1.5, heal: 1.8 },
    abilities: {
      smite: { name: 'Smite', dmgMult: 1.3, cooldown: 0, manaCost: 15 },
      shield: { name: 'Holy Shield', dmgMult: 0, cooldown: 2, manaCost: 20, effect: 'shield' },
      holyblast: { name: 'Holy Blast', dmgMult: 1.8, cooldown: 2, levelReq: 15, manaCost: 35 }
    }
  }
}

// ============= EQUIPMENT DATABASE =============
const EQUIPMENT_DATABASE = {
  weapons: {
    copper_sword: { name: 'Copper Sword', dmgBonus: 5, costMult: 1, rarity: 'common' },
    iron_sword: { name: 'Iron Sword', dmgBonus: 15, costMult: 1.8, rarity: 'uncommon' },
    steel_sword: { name: 'Steel Sword', dmgBonus: 30, costMult: 3.2, rarity: 'rare' },
    diamond_sword: { name: 'Diamond Sword', dmgBonus: 60, costMult: 5.5, rarity: 'epic' },
    runeblade: { name: 'Runeblade', dmgBonus: 100, costMult: 9, rarity: 'legendary' }
  },
  armor: {
    leather_armor: { name: 'Leather Armor', defBonus: 5, hpBonus: 20, costMult: 1, rarity: 'common' },
    iron_armor: { name: 'Iron Armor', defBonus: 15, hpBonus: 50, costMult: 1.8, rarity: 'uncommon' },
    steel_armor: { name: 'Steel Armor', defBonus: 30, hpBonus: 100, costMult: 3.2, rarity: 'rare' },
    diamond_armor: { name: 'Diamond Armor', defBonus: 60, hpBonus: 200, costMult: 5.5, rarity: 'epic' },
    runepact: { name: 'Runepact Armor', defBonus: 100, hpBonus: 350, costMult: 9, rarity: 'legendary' }
  }
}

// ============= GAME BALANCE FORMULAS =============
class GameBalance {
  /**
   * Calculate required exp for level (smooth exponential growth)
   */
  static expForLevel(level, multiplier = 1) {
    const baseExp = 1000
    const growthRate = 1.12  // 12% per level - reasonable scaling
    return Math.floor(baseExp * Math.pow(growthRate, level - 1) * multiplier)
  }

  /**
   * Calculate player's total health
   */
  static calcMaxHP(level, defStat, baseHP = 100) {
    return Math.floor(baseHP + (level * 5) + (defStat * 2))
  }

  /**
   * Calculate player's total mana
   */
  static calcMaxMana(level, magStat, baseMana = 100) {
    return Math.floor(baseMana + (level * 3) + (magStat * 1.5))
  }

  /**
   * Calculate damage with all modifiers
   */
  static calcDamage(attacker, defender, baseWeaponDmg, abilityMult = 1) {
    const strMod = attacker.str * 1.5
    const weaponBonus = baseWeaponDmg || 10
    const skillBonus = attacker.skillLevel ? (attacker.skillLevel * 2) : 0
    const baseAttack = strMod + weaponBonus + skillBonus

    // Crit calculation
    let finalDmg = baseAttack * abilityMult
    const critChance = Math.min(attacker.crit * 0.5, 50) // 50% max crit
    const defReduction = defender.def * 0.8 // Defense reduces damage

    finalDmg -= defReduction
    
    if (Math.random() * 100 < critChance) {
      finalDmg *= 1.5 // 50% crit multiplier
      return { damage: Math.max(1, finalDmg), isCrit: true }
    }

    return { damage: Math.max(1, finalDmg), isCrit: false }
  }

  /**
   * Calculate experience gain from activity
   */
  static calcActivityExp(activity, level, skillLevel, difficulty = 1) {
    const baseExp = {
      hunt: 150,
      fishing: 120,
      mining: 140,
      work: 100,
      dungeon: 200,
      bosraid: 500
    }

    const expAmount = (baseExp[activity] || 100) * difficulty
    const skillBonus = skillLevel ? (skillLevel * 2) : 0
    return Math.floor(expAmount + skillBonus)
  }

  /**
   * Calculate equipment upgrade cost
   */
  static calcUpgradeCost(level, baseCost = 100, costMult = 1.5) {
    // Soft capping: slower growth after level 20
    const softCapMult = level > 20 ? 1 + (Math.sqrt(level - 20) * 0.05) : 1
    return Math.floor(baseCost * Math.pow(costMult, level) * softCapMult)
  }

  /**
   * Calculate drop rate for items
   */
  static getDropRate(difficulty, luck = 1) {
    const baseRate = 0.15 // 15% base drop rate
    const difficultyMult = difficulty * 0.1
    return Math.min((baseRate * luck + difficultyMult) * 100, 100)
  }
}

// ============= PLAYER PROFILE CLASS =============
class RPGPlayer {
  constructor(userId) {
    this.userId = userId
    this.initialized = false
    this.lastUpdated = Date.now()
  }

  /**
   * Initialize new player profile with proper defaults
   */
  initializeProfile() {
    return {
      // Basic Info
      userId: this.userId,
      registered: Date.now(),
      lastActive: Date.now(),

      // Core Stats
      level: 1,
      exp: 0,
      skill: {
        name: 'swordmaster',
        level: 1,
        exp: 0
      },

      // Attributes (calculated from level + equipment)
      stats: {
        hp: 120,
        mana: 80,
        str: 10,      // Strength - physical damage
        agi: 10,      // Agility - evasion & attack speed
        def: 10,      // Defense - damage reduction
        mag: 10,      // Magic - spell damage & mana
        crit: 5,      // Critical strike chance
        luck: 1       // Item drop luck multiplier
      },

      // Currencies
      money: 0,
      diamond: 0,
      emerald: 0,

      // Equipment & Inventory
      equipment: {
        weapon: 'copper_sword',
        armor: 'leather_armor',
        weaponLevel: 1,
        armorLevel: 1
      },
      inventory: {
        items: [],
        maxSlots: 20
      },
      resources: {
        kayu: 0,
        batu: 0,
        iron: 0,
        crystal: 0,
        gold: 0
      },

      // State & Cooldowns
      stateFlags: {
        inDungeon: false,
        inRaid: false,
        inCombat: false,
        isDead: false
      },
      cooldowns: {
        dungeon: 0,
        bosraid: 0,
        hunt: 0,
        mining: 0,
        fishing: 0,
        work: 0,
        adventure: 0,
        mission: 0,
        steal: 0
      },

      // Progression
      completedMissions: [],
      achievements: [],
      totalPlayTime: 0,
      defeatsInRow: 0,
      winsInRow: 0,

      // Misc
      premium: false,
      premiumUntil: 0,
      notes: ''
    }
  }

  /**
   * Get current stats with equipment bonuses
   */
  getCurrentStats(equipment) {
    let stats = { ...this.stats }
    
    // Add equipment bonuses if exist
    if (equipment?.weapon) {
      const weaponData = EQUIPMENT_DATABASE.weapons[equipment.weapon]
      stats.str += (weaponData?.dmgBonus || 0) * 0.5
    }
    
    if (equipment?.armor) {
      const armorData = EQUIPMENT_DATABASE.armor[equipment.armor]
      stats.def += (armorData?.defBonus || 0)
      stats.hp += (armorData?.hpBonus || 0)
    }

    return stats
  }

  /**
   * Calculate character's total power level
   */
  calculatePower(stats, level, skillLevel) {
    return Math.floor(
      (stats.str * 2) +
      (stats.def * 1.5) +
      (stats.mag * 1.5) +
      (stats.agi * 1.5) +
      (level * 5) +
      (skillLevel * 3)
    )
  }

  /**
   * Add experience and handle level up
   */
  addExperience(amount, skill = false) {
    if (skill && this.skill) {
      this.skill.exp += amount
      const maxExpForSkillLevel = GameBalance.expForLevel(this.skill.level, 0.5)
      
      while (this.skill.exp >= maxExpForSkillLevel && this.skill.level < GAME_CONFIG.SKILL_MAX_LEVEL) {
        this.skill.exp -= maxExpForSkillLevel
        this.skill.level++
        this.updateStatsFromSkill()
      }
    } else {
      this.exp += amount
      const maxExpForLevel = GameBalance.expForLevel(this.level)
      
      while (this.exp >= maxExpForLevel && this.level < GAME_CONFIG.MAX_LEVEL) {
        this.exp -= maxExpForLevel
        this.level++
        this.updateStatsFromLevel()
      }
    }
  }

  /**
   * Update base stats when level increases
   */
  updateStatsFromLevel() {
    const skillBonus = SKILL_DATABASE[this.skill.name]?.statBonus || {}
    
    this.stats.hp = GameBalance.calcMaxHP(this.level, this.stats.def)
    this.stats.mana = GameBalance.calcMaxMana(this.level, this.stats.mag)
    this.stats.str += 1.5 + (skillBonus.str || 0) * 0.1
    this.stats.def += 1.2 + (skillBonus.def || 0) * 0.1
    this.stats.agi += 1 + (skillBonus.agi || 0) * 0.1
    this.stats.mag += 1 + (skillBonus.mag || 0) * 0.1
  }

  /**
   * Update stats when skill level increases
   */
  updateStatsFromSkill() {
    const skillData = SKILL_DATABASE[this.skill.name]
    if (!skillData) return

    const bonus = skillData.statBonus
    this.stats.str = 10 + (this.level * 1.5) + (bonus.str || 0) * this.skill.level
    this.stats.def = 10 + (this.level * 1.2) + (bonus.def || 0) * this.skill.level
    this.stats.mag = 10 + (this.level * 1) + (bonus.mag || 0) * this.skill.level
    this.stats.crit = 5 + (this.skill.level * 0.5) + (bonus.crit || 0) * this.skill.level
  }

  /**
   * Check if can perform activity (cooldown check)
   */
  canPerformActivity(activity) {
    const cooldownKey = activity.toLowerCase()
    if (!GAME_CONFIG.COOLDOWNS[cooldownKey]) return true
    
    const timeSinceLastUse = Date.now() - (this.cooldowns[cooldownKey] || 0)
    return timeSinceLastUse >= GAME_CONFIG.COOLDOWNS[cooldownKey]
  }

  /**
   * Set cooldown for activity
   */
  setActivityCooldown(activity) {
    const cooldownKey = activity.toLowerCase()
    this.cooldowns[cooldownKey] = Date.now()
  }

  /**
   * Get cooldown remaining time (in seconds)
   */
  getCooldownRemaining(activity) {
    const cooldownKey = activity.toLowerCase()
    const lastUse = this.cooldowns[cooldownKey] || 0
    const cooldownDuration = GAME_CONFIG.COOLDOWNS[cooldownKey] || 0
    const timePassed = Date.now() - lastUse
    const remaining = Math.max(0, cooldownDuration - timePassed)
    return Math.ceil(remaining / 1000)
  }
}

// ============= EXPORTS =============
export {
  GAME_CONFIG,
  SKILL_DATABASE,
  EQUIPMENT_DATABASE,
  GameBalance,
  RPGPlayer
}
