/**
 * ============================================
 * PLAYER DATA MANAGER v2.0
 * ============================================
 * Handles player initialization, data validation, 
 * migration, and persistent storage
 */

import { RPGPlayer, GAME_CONFIG } from './rpg-core-engine.js'

/**
 * Attach player methods to a plain object
 * This allows plain player objects from the database to have the required methods
 */
function attachPlayerMethods(player) {
  if (!player.canPerformActivity) {
    player.canPerformActivity = function(activity) {
      const cooldownKey = activity.toLowerCase()
      if (!GAME_CONFIG.COOLDOWNS[cooldownKey]) return true
      if (!this.cooldowns) this.cooldowns = {}
      
      const lastUse = this.cooldowns[cooldownKey]
      // If -1, it's never been used - always allow
      if (lastUse === -1 || lastUse < 0) return true
      
      const timeSinceLastUse = Date.now() - lastUse
      return timeSinceLastUse >= GAME_CONFIG.COOLDOWNS[cooldownKey]
    }
  }

  if (!player.setActivityCooldown) {
    player.setActivityCooldown = function(activity) {
      const cooldownKey = activity.toLowerCase()
      if (!this.cooldowns) this.cooldowns = {}
      this.cooldowns[cooldownKey] = Date.now()
    }
  }

  if (!player.getCooldownRemaining) {
    player.getCooldownRemaining = function(activity) {
      const cooldownKey = activity.toLowerCase()
      if (!this.cooldowns) this.cooldowns = {}
      
      const lastUse = this.cooldowns[cooldownKey]
      // If -1 or less, it's never been used - no wait time
      if (lastUse === -1 || lastUse < 0) return 0
      
      const cooldownDuration = GAME_CONFIG.COOLDOWNS[cooldownKey] || 0
      const timePassed = Date.now() - lastUse
      const remaining = Math.max(0, cooldownDuration - timePassed)
      return Math.ceil(remaining / 1000)
    }
  }

  if (!player.addExperience) {
    player.addExperience = function(amount) {
      if (!this.exp) this.exp = 0
      this.exp += amount
      
      // Simple level up check
      const expPerLevel = 1000 * Math.pow(1.12, this.level - 1)
      while (this.exp >= expPerLevel) {
        this.exp -= expPerLevel
        this.level += 1
        if (this.stats) {
          this.stats.hp = (this.stats.hp || 120) + 5
          this.stats.mana = (this.stats.mana || 80) + 3
        }
      }
    }
  }

  return player
}

class PlayerDataManager {
  /**
   * Initialize a new player with proper defaults
   */
  static initializeNewPlayer(userId, name = 'Adventurer') {
    const player = new RPGPlayer(userId)
    const profile = player.initializeProfile()
    
    return {
      ...profile,
      name,
      userId,
      registered: Date.now(),
      version: 2.0,
      migrated: false
    }
  }

  /**
   * Update/migrate old player data to new format
   * Preserves ALL existing fields from handler.js for backward compatibility
   */
  static migratePlayerData(oldUser) {
    // Start with base new user
    const newUser = this.initializeNewPlayer(oldUser.userId, oldUser.name || 'Adventurer')

    // Preserve ALL legacy fields from handler.js (backward compatibility)
    // Copy all numeric and string properties that exist in oldUser
    for (const [key, value] of Object.entries(oldUser)) {
      // Skip system fields we handle separately
      if (['userId', 'stats', 'skill', 'cooldowns', 'equipment', 'resources', 'version', 'migrated'].includes(key)) {
        continue
      }
      // Copy all other fields (items, currencies, counters, etc)
      if (newUser[key] === undefined) {
        newUser[key] = value
      }
    }

    // Migrate core RPG stats to new system
    newUser.level = oldUser.level || oldUser.hero || 1
    newUser.exp = oldUser.exp || oldUser.expg || oldUser.exphero || 0
    newUser.money = oldUser.money || oldUser.uang || 0
    
    // Currencies: preserve all variants for backward compatibility
    newUser.diamond = oldUser.diamond || oldUser.berlian || 0
    newUser.emerald = oldUser.emerald || oldUser.emeral || 0
    newUser.gold = oldUser.gold || 0
    newUser.gems = oldUser.gems || 0
    newUser.coin = oldUser.coin || 0
    
    // Health/Stats migration
    newUser.stats.hp = oldUser.health || oldUser.healt || oldUser.healtmonster || 100
    newUser.stats.mana = oldUser.mana || 0

    // Core stats from old system (agility, intelligence, etc.)
    newUser.stats.str = Math.max(newUser.stats.str, oldUser.strength || oldUser.kekuatan || 0)
    newUser.stats.agi = Math.max(newUser.stats.agi, oldUser.agility || oldUser.kelincahan || 0)
    newUser.stats.def = Math.max(newUser.stats.def, oldUser.defense || 0)
    newUser.stats.mag = Math.max(newUser.stats.mag, oldUser.intelligence || oldUser.magic || 0)

    // Migrate skills - preserve old skill system too
    if (oldUser.skill) {
      newUser.skill = {
        name: oldUser.skill.name || oldUser.skill || 'swordmaster',
        level: oldUser.skill.level || 1,
        exp: oldUser.skill.exp || 0
      }
    } else if (oldUser.job) {
      newUser.skill = {
        name: oldUser.job,
        level: oldUser.jobl || 1,
        exp: oldUser.jobexp || 0
      }
    }

    // Migrate equipment with durability
    if (oldUser.sword || oldUser.armor || oldUser.bow) {
      newUser.equipment.weaponLevel = oldUser.sword || oldUser.arc || oldUser.bow || 1
      newUser.equipment.armorLevel = oldUser.armor || 1
      // Preserve durability data
      newUser.equipment.weaponDurability = oldUser.sworddurability || oldUser.arcdurability || 100
      newUser.equipment.armorDurability = oldUser.armordurability || 100
    }

    // Preserve ALL resources/items from legacy system
    const itemCategories = {
      // Harvest items
      resources: ['kayu', 'batu', 'iron', 'crystal', 'gold', 'coal', 'clay', 'brick', 'glass', 'emas'],
      // Cooked/processed
      cooked: ['ikanbakar', 'ayambakar', 'babipanggang', 'kepitingbakar', 'bawalbakar', 'jagungbakar', 'kentanggoreng'],
      // Fruits
      fruits: ['apel', 'jeruk', 'mangga', 'pisang', 'semangka', 'stroberi', 'anggur'],
      // Foods
      foods: ['makanan', 'roti', 'gulai', 'gadodado', 'esteh'],
      // Fishing items
      fish: ['ikan', 'bawal', 'dory', 'cumi', 'gurita', 'kepiting', 'lobster', 'udang', 'buntal', 'orca', 'lumba', 'paus', 'hiu'],
      // Hunting items
      animals: ['banteng', 'harimau', 'gajah', 'kambing', 'panda', 'buaya', 'kerbau', 'sapi', 'monyet', 'babihutan', 'babi', 'ayam'],
      // Pets/Mounts
      pets: ['dog', 'dogexp', 'cat', 'catexp', 'horse', 'horseexp', 'griffin', 'griffinexp', 'centaur', 'centaurexp', 'fox', 'foxexp', 'dragon', 'dragonexp'],
      // Tools/Equipment
      tools: ['bow', 'axe', 'pickaxe', 'rod', 'fishingrod', 'arc', 'katana', 'kapak']
    }

    // Copy all item/resource fields
    for (const category of Object.values(itemCategories)) {
      for (const item of category) {
        if (item in oldUser && !newUser.resources[item]) {
          newUser.resources[item] = oldUser[item]
        }
      }
    }

    // Preserve cooldown/timing data
    newUser.cooldowns.dungeon = oldUser.lastdungeon || oldUser.lastmisi || 0
    newUser.cooldowns.mission = oldUser.lastclaim || 0
    newUser.cooldowns.work = oldUser.lastkerja || 0
    newUser.cooldowns.hunt = oldUser.lastberburu || 0
    newUser.cooldowns.fishing = oldUser.lastmancing || 0

    // Preserve user meta info
    newUser.registered = oldUser.registered || oldUser.regTime || Date.now()
    newUser.premium = oldUser.premium || false
    newUser.premiumDate = oldUser.premiumDate || -1
    newUser.banned = oldUser.banned || oldUser.Banneduser || false
    newUser.role = oldUser.role || 'Beginner'
    newUser.title = oldUser.title || ''
    newUser.pasangan = oldUser.pasangan || ''

    // Migration metadata
    newUser.migrated = true
    newUser.migratedFrom = oldUser.version || 1.0
    newUser.migratedAt = Date.now()

    return newUser
  }

  /**
   * Validate player data integrity
   */
  static validatePlayer(user) {
    const errors = []

    // Check required fields
    if (!user.userId) errors.push('Missing userId')
    if (user.level < GAME_CONFIG.MIN_LEVEL || user.level > GAME_CONFIG.MAX_LEVEL) {
      errors.push(`Invalid level: ${user.level}`)
    }
    if (!user.skill || !user.skill.name) errors.push('Missing skill data')

    // Check stats
    const requiredStats = ['hp', 'mana', 'str', 'agi', 'def', 'mag', 'crit', 'luck']
    for (const stat of requiredStats) {
      if (typeof user.stats[stat] !== 'number' || user.stats[stat] < 0) {
        errors.push(`Invalid stat: ${stat}`)
      }
    }

    // Check currencies
    const requiredCurrency = ['money', 'diamond', 'emerald']
    for (const cur of requiredCurrency) {
      if (typeof user[cur] !== 'number' || user[cur] < 0) {
        errors.push(`Invalid currency: ${cur}`)
      }
    }

    // Check cooldowns
    if (!user.cooldowns || typeof user.cooldowns !== 'object') {
      errors.push('Missing cooldowns object')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Repair broken player data
   */
  static repairPlayer(user) {
    const fixed = { ...user }

    // Fix negative values
    if (fixed.level < GAME_CONFIG.MIN_LEVEL) fixed.level = GAME_CONFIG.MIN_LEVEL
    if (fixed.level > GAME_CONFIG.MAX_LEVEL) fixed.level = GAME_CONFIG.MAX_LEVEL

    // Ensure all stats exist and are positive
    const stats = ['hp', 'mana', 'str', 'agi', 'def', 'mag', 'crit', 'luck']
    for (const stat of stats) {
      if (!fixed.stats[stat] || fixed.stats[stat] < 0) {
        fixed.stats[stat] = 10
      }
    }

    // Ensure currencies
    ['money', 'diamond', 'emerald'].forEach(cur => {
      if (fixed[cur] < 0) fixed[cur] = 0
    })

    // Ensure cooldowns
    if (!fixed.cooldowns) fixed.cooldowns = {}
    for (const key of Object.keys(GAME_CONFIG.COOLDOWNS)) {
      if (!fixed.cooldowns[key]) fixed.cooldowns[key] = 0
    }

    // Ensure skill
    if (!fixed.skill) {
      fixed.skill = {
        name: 'swordmaster',
        level: 1,
        exp: 0
      }
    }

    return fixed
  }

  /**
   * Save player data to database
   */
  static async savePlayer(db, userId, userData) {
    try {
      if (!db.data.users) db.data.users = {}
      
      db.data.users[userId] = {
        ...db.data.users[userId],
        ...userData,
        lastUpdated: Date.now()
      }

      await db.write()
      return { success: true, data: db.data.users[userId] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get or create player profile
   */
  static async getOrCreatePlayer(db, userId, name = 'Adventurer') {
    try {
      if (!db.data.users) db.data.users = {}

      let user = db.data.users[userId]

      if (!user) {
        // Create new player
        user = this.initializeNewPlayer(userId, name)
        db.data.users[userId] = user
        await db.write()
      } else if (user.version !== 2.0) {
        // Migrate old player
        user = this.migratePlayerData(user)
        db.data.users[userId] = user
        await db.write()
      }

      // Validate and repair if needed
      const validation = this.validatePlayer(user)
      if (!validation.valid) {
        user = this.repairPlayer(user)
        db.data.users[userId] = user
        await db.write()
      }

      // Attach methods to player object
      return attachPlayerMethods(user)
    } catch (error) {
      console.error('Error in getOrCreatePlayer:', error)
      // Return basic player on error
      const fallbackPlayer = this.initializeNewPlayer(userId, name)
      return attachPlayerMethods(fallbackPlayer)
    }
  }

  /**
   * Batch update players
   */
  static async batchUpdatePlayers(db, updates) {
    try {
      if (!db.data.users) db.data.users = {}

      for (const [userId, userData] of Object.entries(updates)) {
        if (db.data.users[userId]) {
          db.data.users[userId] = {
            ...db.data.users[userId],
            ...userData,
            lastUpdated: Date.now()
          }
        }
      }

      await db.write()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Reset player progress
   */
  static resetPlayerProgress(user) {
    user.level = 1
    user.exp = 0
    user.skill.level = 1
    user.skill.exp = 0
    user.stats = {
      hp: 120,
      mana: 80,
      str: 10,
      agi: 10,
      def: 10,
      mag: 10,
      crit: 5,
      luck: 1
    }
    user.equipment.weaponLevel = 1
    user.equipment.armorLevel = 1
    user.money = Math.floor(user.money * 0.5) // Keep 50% money
    
    return user
  }

  /**
   * Get player stats card
   */
  static getStatsCard(user) {
    return {
      level: user.level,
      exp: user.exp,
      hp: user.stats.hp,
      mana: user.stats.mana,
      str: Math.floor(user.stats.str),
      agi: Math.floor(user.stats.agi),
      def: Math.floor(user.stats.def),
      mag: Math.floor(user.stats.mag),
      crit: Math.floor(user.stats.crit),
      money: user.money,
      diamond: user.diamond,
      emerald: user.emerald,
      skill: user.skill
    }
  }

  /**
   * Calculate player power level
   */
  static calculatePowerLevel(user) {
    return Math.floor(
      (user.stats.str * 2) +
      (user.stats.def * 1.5) +
      (user.stats.mag * 1.5) +
      (user.stats.agi * 1.5) +
      (user.level * 5) +
      (user.skill.level * 3)
    )
  }
}

export { PlayerDataManager }
