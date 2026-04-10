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
  
  // Cooldowns (in milliseconds) - Dioptimasi agar lebih nyaman dimainkan
  COOLDOWNS: {
    dungeon: 120000,        // 2 minutes
    bosraid: 600000,        // 10 minutes
    hunt: 60000,            // 1 minute - Basic activity
    mining: 60000,          // 1 minute - Basic activity
    fishing: 60000,         // 1 minute - Basic activity
    work: 60000,            // 1 minute - Basic activity
    adventure: 120000,      // 2 minutes
    mission: 86400000,      // 24 hours (no change)
    steal: 120000           // 2 minutes
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
    // === R (Common/Uncommon) ===
    copper_sword: { name: 'Copper Sword', dmgBonus: 5, costMult: 1, rarity: 'common' },
    iron_sword: { name: 'Iron Sword', dmgBonus: 15, costMult: 1.8, rarity: 'uncommon' },
    shotgun_rounder: { name: '🔫 Shotgun Rounder', dmgBonus: 18, costMult: 2.0, rarity: 'R' },
    shadow_dagger: { name: '🗡️ Shadow Dagger', dmgBonus: 16, costMult: 1.9, rarity: 'R' },
    wooden_staff: { name: '🔮 Wooden Staff', dmgBonus: 14, costMult: 1.7, rarity: 'R' },
    // === SR (Rare) ===
    steel_sword: { name: 'Steel Sword', dmgBonus: 30, costMult: 3.2, rarity: 'rare' },
    steel_sword_sr: { name: '🌑 Steel Sword', dmgBonus: 32, costMult: 3.5, rarity: 'SR' },
    flame_axe: { name: '🪓 Flame Axe', dmgBonus: 35, costMult: 3.8, rarity: 'SR' },
    void_wand: { name: '🌌 Void Wand', dmgBonus: 33, costMult: 3.6, rarity: 'SR' },
    // === SSR (Epic) ===
    diamond_sword: { name: 'Diamond Sword', dmgBonus: 60, costMult: 5.5, rarity: 'epic' },
    duality_sword: { name: '⚔️ Duality Sword', dmgBonus: 65, costMult: 6.0, rarity: 'SSR' },
    thunder_spear: { name: '⚡ Thunder Spear', dmgBonus: 62, costMult: 5.8, rarity: 'SSR' },
    hell_bow: { name: '🏹 Hell Bow', dmgBonus: 68, costMult: 6.2, rarity: 'SSR' },
    // === UR (Legendary) ===
    runeblade: { name: 'Runeblade', dmgBonus: 100, costMult: 9, rarity: 'legendary' },
    excalibur: { name: '🗡️ Excalibur', dmgBonus: 120, costMult: 12, rarity: 'UR' },
    // === SP (Special — event only) ===
    egg_hunter: { name: '🥚🗡️ Egg Hunter', dmgBonus: 80, costMult: 0, rarity: 'SP', description: 'Senjata Pemburu Telur Legendaris!', obtainedFrom: 'Easter Egg Event' }
  },
  armor: {
    // === R (Common/Uncommon) ===
    leather_armor: { name: 'Leather Armor', defBonus: 5, hpBonus: 20, costMult: 1, rarity: 'common' },
    iron_armor: { name: 'Iron Armor', defBonus: 15, hpBonus: 50, costMult: 1.8, rarity: 'uncommon' },
    bone_wither: { name: '💀 Bone Wither', defBonus: 14, hpBonus: 45, costMult: 1.7, rarity: 'R' },
    shadow_robe: { name: '🌒 Shadow Robe', defBonus: 13, hpBonus: 40, costMult: 1.6, rarity: 'R' },
    // === SR (Rare) ===
    steel_armor: { name: 'Steel Armor', defBonus: 30, hpBonus: 100, costMult: 3.2, rarity: 'rare' },
    chain_mail: { name: '🦺 Chain Mail', defBonus: 28, hpBonus: 90, costMult: 3.0, rarity: 'SR' },
    storm_zex: { name: '⚡ Storm Zex', defBonus: 32, hpBonus: 110, costMult: 3.5, rarity: 'SR' },
    ice_crystal: { name: '❄️ Ice Crystal', defBonus: 34, hpBonus: 115, costMult: 3.7, rarity: 'SR' },
    // === SSR (Epic) ===
    diamond_armor: { name: 'Diamond Armor', defBonus: 60, hpBonus: 200, costMult: 5.5, rarity: 'epic' },
    black_dragon: { name: '🐉 Black Dragon', defBonus: 65, hpBonus: 220, costMult: 6.0, rarity: 'SSR' },
    angel_wings: { name: '🪽 Angel Wings', defBonus: 62, hpBonus: 210, costMult: 5.8, rarity: 'SSR' },
    phoenix_mail: { name: '🔥 Phoenix Mail', defBonus: 68, hpBonus: 230, costMult: 6.2, rarity: 'SSR' },
    // === UR (Legendary) ===
    runepact: { name: 'Runepact Armor', defBonus: 100, hpBonus: 350, costMult: 9, rarity: 'legendary' },
    titan_armor: { name: '🗿 Titan Armor', defBonus: 120, hpBonus: 400, costMult: 12, rarity: 'UR' }
  },
  trinkets: {
    // === R ===
    copper_ring: { name: '💍 Copper Ring', statBonus: { str: 3, def: 2 }, rarity: 'R' },
    wolf_fang: { name: '🐺 Wolf Fang', statBonus: { str: 5, agi: 3 }, rarity: 'R' },
    lucky_coin: { name: '🪙 Lucky Coin', statBonus: { luck: 5 }, rarity: 'R' },
    // === SR ===
    silver_amulet: { name: '📿 Silver Amulet', statBonus: { def: 8, mag: 5 }, rarity: 'SR' },
    eagle_talon: { name: '🦅 Eagle Talon', statBonus: { agi: 10, str: 5 }, rarity: 'SR' },
    star_pendant: { name: '⭐ Star Pendant', statBonus: { mag: 10, luck: 3 }, rarity: 'SR' },
    // === SSR ===
    dragon_eye: { name: '👁️ Dragon Eye', statBonus: { str: 15, mag: 10 }, rarity: 'SSR' },
    phoenix_tear: { name: '💧 Phoenix Tear', statBonus: { mag: 15, def: 10 }, rarity: 'SSR' },
    void_crystal: { name: '💠 Void Crystal', statBonus: { mag: 20, agi: 8 }, rarity: 'SSR' },
    // === UR ===
    ethernal_ring: { name: '♾️ Ethernal Ring', statBonus: { str: 25, def: 20, mag: 15, luck: 10 }, rarity: 'UR' }
  },
  relics: {
    // === R ===
    old_compass: { name: '🧭 Old Compass', effectBonus: { expMult: 1.05 }, rarity: 'R' },
    earth_dust: { name: '🪨 Earth Dust', effectBonus: { defMult: 1.05 }, rarity: 'R' },
    water_talisman: { name: '💧 Water Talisman', effectBonus: { hpRegen: 2 }, rarity: 'R' },
    // === SR ===
    energy_core: { name: '🔋 Energy Core', effectBonus: { expMult: 1.10 }, rarity: 'SR' },
    wind_charge: { name: '🍃 Wind Charge', effectBonus: { agiMult: 1.10 }, rarity: 'SR' },
    despair_diamond: { name: '💎 Despair Diamond', effectBonus: { goldMult: 1.15 }, rarity: 'SR' },
    // === SSR ===
    ancient_totem: { name: '⚜️ Ancient Totem', effectBonus: { expMult: 1.20, goldMult: 1.10 }, rarity: 'SSR' },
    orb_hope: { name: '✨ Orb Hope', effectBonus: { hpRegen: 10, expMult: 1.15 }, rarity: 'SSR' },
    // === UR ===
    world_of_hope: { name: '🌍 World Of Hope', effectBonus: { expMult: 1.30, goldMult: 1.25, hpRegen: 15 }, rarity: 'UR' }
  },
  tools: {
    wooden_rod: { name: 'Wooden Rod', rarity: 'common', fishBonus: 1.0, durability: 100, cost: 50, rarityMult: 1 },
    bamboo_rod: { name: 'Bamboo Rod', rarity: 'uncommon', fishBonus: 1.2, durability: 150, cost: 200, rarityMult: 1.1 },
    gold_rod: { name: 'Gold Rod', rarity: 'rare', fishBonus: 1.5, durability: 250, cost: 800, rarityMult: 1.3 },
    crystal_rod: { name: 'Crystal Rod', rarity: 'epic', fishBonus: 1.9, durability: 400, cost: 3000, rarityMult: 1.6 },
    celestial_rod: { name: 'Celestial Rod', rarity: 'legendary', fishBonus: 2.5, durability: 600, cost: 10000, rarityMult: 2.0 }
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

      // State & Cooldowns - Initialize with negative values to indicate never used
      stateFlags: {
        inDungeon: false,
        inRaid: false,
        inCombat: false,
        isDead: false
      },
      cooldowns: {
        dungeon: -1,
        bosraid: -1,
        hunt: -1,
        mining: -1,
        fishing: -1,
        work: -1,
        adventure: -1,
        mission: -1,
        steal: -1
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
    if (equipment && equipment.weapon) {
      const weaponData = EQUIPMENT_DATABASE.weapons[equipment.weapon]
      stats.str += ((weaponData && weaponData.dmgBonus) || 0) * 0.5
    }
    
    if (equipment && equipment.armor) {
      const armorData = EQUIPMENT_DATABASE.armor[equipment.armor]
      stats.def += ((armorData && armorData.defBonus) || 0)
      stats.hp += ((armorData && armorData.hpBonus) || 0)
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
    const skillBonus = (SKILL_DATABASE[this.skill.name] && SKILL_DATABASE[this.skill.name].statBonus) || {}
    
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
