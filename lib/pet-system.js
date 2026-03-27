/**
 * ============================================
 * PET & FAMILIAR SYSTEM v1.0
 * ============================================
 * Catch, breed, and evolve pets to enhance combat
 * Wolf Pup → Fenrir, Slime → King Slime, Dragon variants
 */

const PET_DATABASE = {
  // COMMON PETS
  slime: {
    id: 'slime',
    name: 'Slime',
    emoji: '🟢',
    rarity: 'common',
    catchRate: 0.85,
    baseStats: { hp: 20, atk: 8, def: 5, sp: 3 },
    evolution: {
      nextForm: 'big_slime',
      requirement: { level: 15, exp: 500 }
    }
  },
  big_slime: {
    id: 'big_slime',
    name: 'Big Slime',
    emoji: '🟢🟢',
    rarity: 'uncommon',
    baseStats: { hp: 40, atk: 16, def: 12, sp: 6 },
    evolution: {
      nextForm: 'king_slime',
      requirement: { level: 40, exp: 3000 }
    }
  },
  king_slime: {
    id: 'king_slime',
    name: 'King Slime',
    emoji: '👑🟢',
    rarity: 'rare',
    baseStats: { hp: 80, atk: 40, def: 30, sp: 15 },
    evolution: null
  },

  // WOLF FAMILY
  wolf_pup: {
    id: 'wolf_pup',
    name: 'Wolf Pup',
    emoji: '🐺',
    rarity: 'common',
    catchRate: 0.70,
    baseStats: { hp: 25, atk: 15, def: 8, sp: 12 },
    evolution: {
      nextForm: 'wolf',
      requirement: { level: 20, exp: 1000 }
    }
  },
  wolf: {
    id: 'wolf',
    name: 'Wolf',
    emoji: '🐺🐺',
    rarity: 'uncommon',
    baseStats: { hp: 50, atk: 30, def: 15, sp: 20 },
    evolution: {
      nextForm: 'fenrir',
      requirement: { level: 50, exp: 5000 }
    }
  },
  fenrir: {
    id: 'fenrir',
    name: 'Fenrir',
    emoji: '🐺⚡',
    rarity: 'epic',
    baseStats: { hp: 120, atk: 80, def: 40, sp: 35 },
    evolution: null
  },

  // DRAGON FAMILY
  dragon_baby: {
    id: 'dragon_baby',
    name: 'Baby Dragon',
    emoji: '🐲',
    rarity: 'uncommon',
    catchRate: 0.40,
    baseStats: { hp: 30, atk: 25, def: 20, sp: 8 },
    evolution: {
      nextForm: 'young_dragon',
      requirement: { level: 35, exp: 3000 }
    }
  },
  young_dragon: {
    id: 'young_dragon',
    name: 'Young Dragon',
    emoji: '🐉',
    rarity: 'rare',
    baseStats: { hp: 70, atk: 55, def: 45, sp: 18 },
    evolution: {
      nextForm: 'ancient_dragon',
      requirement: { level: 80, exp: 10000 }
    }
  },
  ancient_dragon: {
    id: 'ancient_dragon',
    name: 'Ancient Dragon',
    emoji: '🐉👑',
    rarity: 'legendary',
    baseStats: { hp: 180, atk: 140, def: 100, sp: 40 },
    evolution: null
  },

  // MYTHICAL PETS
  phoenix: {
    id: 'phoenix',
    name: 'Phoenix',
    emoji: '🔥🐦',
    rarity: 'legendary',
    catchRate: 0.15,
    baseStats: { hp: 100, atk: 120, def: 60, sp: 50 },
    ability: 'rebirth',
    evolution: null
  },
  unicorn: {
    id: 'unicorn',
    name: 'Unicorn',
    emoji: '🦄',
    rarity: 'legendary',
    catchRate: 0.10,
    baseStats: { hp: 90, atk: 70, def: 80, sp: 45 },
    ability: 'heal_all',
    evolution: null
  },
  kitsune: {
    id: 'kitsune',
    name: 'Kitsune',
    emoji: '🦊✨',
    rarity: 'legendary',
    catchRate: 0.20,
    baseStats: { hp: 75, atk: 95, def: 55, sp: 60 },
    ability: 'trickster',
    evolution: null
  },
  celestial_beast: {
    id: 'celestial_beast',
    name: 'Celestial Beast',
    emoji: '⭐',
    rarity: 'mythical',
    catchRate: 0.05,
    baseStats: { hp: 200, atk: 200, def: 120, sp: 80 },
    ability: 'divine_protection',
    evolution: null
  }
}

const PET_ABILITIES = {
  rebirth: {
    name: 'Rebirth',
    description: 'Kembali ke pertempuran dengan 50% HP jika kalah',
    effect: 'resurrect_at_50hp'
  },
  heal_all: {
    name: 'Heal All',
    description: 'Penyembuhan pada semua anggota tim setiap giliran',
    effect: 'heal_team_every_turn'
  },
  trickster: {
    name: 'Trickster',
    description: 'Bypass musuh dengan dodge rate 40%',
    effect: 'high_dodge_rate'
  },
  divine_protection: {
    name: 'Divine Protection',
    description: 'Lindungi tim dari serangan dahsyat',
    effect: 'damage_reduction_team'
  }
}

class PetSystem {
  /**
   * Attempt to catch a pet
   */
  static attemptCatch(petName, playerLuck = 1) {
    const petInfo = Object.values(PET_DATABASE).find(p => p.name.toLowerCase() === petName.toLowerCase())
    if (!petInfo) return { success: false, reason: 'Pet tidak ditemukan' }

    const catchRate = Math.min(petInfo.catchRate * playerLuck, 0.95)
    const caught = Math.random() < catchRate

    return {
      success: caught,
      catchRate: Math.round(catchRate * 100),
      petInfo: petInfo,
      message: caught ? `Berhasil menangkap ${petInfo.name}!` : `${petInfo.name} lolos...`
    }
  }

  /**
   * Create new pet instance
   */
  static createPetInstance(petName, playerData) {
    const petTemplate = Object.values(PET_DATABASE).find(p => p.name.toLowerCase() === petName.toLowerCase())
    if (!petTemplate) return null

    return {
      id: `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: petTemplate.name,
      emoji: petTemplate.emoji,
      rarity: petTemplate.rarity,
      level: 1,
      exp: 0,
      stats: { ...petTemplate.baseStats },
      caughtDate: Date.now(),
      currentForm: petTemplate.id,
      ability: petTemplate.ability || null,
      loyalty: 50,
      health: petTemplate.baseStats.hp
    }
  }

  /**
   * Check if pet can evolve
   */
  static canEvolve(petInstance) {
    const petTemplate = PET_DATABASE[petInstance.currentForm]
    if (!petTemplate || !petTemplate.evolution) {
      return { canEvolve: false, reason: 'Pet sudah maksimal atau tidak bisa evolve' }
    }

    const req = petTemplate.evolution.requirement
    const errors = []

    if (petInstance.level < req.level) {
      errors.push(`Level minimal: ${req.level} (Pet: ${petInstance.level})`)
    }
    if (petInstance.exp < req.exp) {
      errors.push(`Exp minimal: ${req.exp} (Pet: ${petInstance.exp})`)
    }

    return {
      canEvolve: errors.length === 0,
      reason: errors.length > 0 ? errors.join(', ') : 'Siap evolve!',
      nextForm: petTemplate.evolution.nextForm
    }
  }

  /**
   * Evolve pet to next form
   */
  static evolvePet(petInstance) {
    const check = this.canEvolve(petInstance)
    if (!check.canEvolve) return check

    const newFormData = PET_DATABASE[check.nextForm]
    petInstance.currentForm = check.nextForm
    petInstance.name = newFormData.name
    petInstance.emoji = newFormData.emoji
    petInstance.rarity = newFormData.rarity

    // Apply new base stats with level scaling
    for (const [stat, value] of Object.entries(newFormData.baseStats)) {
      petInstance.stats[stat] = value + (petInstance.level * 2)
    }

    if (newFormData.ability && !petInstance.ability) {
      petInstance.ability = newFormData.ability
    }

    return {
      success: true,
      newForm: newFormData.name,
      newStats: petInstance.stats,
      ability: petInstance.ability
    }
  }

  /**
   * Get pet's combat power
   */
  static getPetPower(petInstance) {
    const stats = petInstance.stats
    const power = (stats.atk * 2) + (stats.def * 1.5) + stats.hp + (stats.sp * 1.5)
    return Math.floor(power * (petInstance.level / 10))
  }

  /**
   * Gain experience
   */
  static gainExp(petInstance, amount) {
    petInstance.exp += amount
    const levelUpReq = 500 * petInstance.level
    let leveledUp = 0

    while (petInstance.exp >= levelUpReq) {
      petInstance.exp -= levelUpReq
      petInstance.level += 1
      leveledUp += 1

      // Stat growth
      petInstance.stats.hp += 5
      petInstance.stats.atk += 3
      petInstance.stats.def += 2
      petInstance.stats.sp += 2
      petInstance.health = petInstance.stats.hp
    }

    return { gained: amount, levelsUp: leveledUp, newLevel: petInstance.level }
  }

  /**
   * Get pet info for display
   */
  static getPetInfo(petInstance) {
    return {
      name: petInstance.name,
      emoji: petInstance.emoji,
      level: petInstance.level,
      exp: `${petInstance.exp}/${500 * petInstance.level}`,
      rarity: petInstance.rarity,
      stats: petInstance.stats,
      health: petInstance.health,
      maxHealth: petInstance.stats.hp,
      power: this.getPetPower(petInstance),
      loyalty: petInstance.loyalty,
      ability: petInstance.ability ? PET_ABILITIES[petInstance.ability] : null,
      canEvolve: this.canEvolve(petInstance).canEvolve
    }
  }

  /**
   * Get all catchable pets at level
   */
  static getCatchableAt(playerLevel) {
    const catchable = Object.values(PET_DATABASE).filter(pet => {
      const minLevel = pet.minLevel || 1
      return playerLevel >= minLevel && pet.catchRate
    })
    return catchable
  }

  /**
   * Breeding system - create new pet from two parents
   */
  static breedPets(parent1, parent2, playerData) {
    if (!parent1 || !parent2) return { success: false, reason: 'Kedua parent diperlukan' }

    if (parent1.loyalty < 50 || parent2.loyalty < 50) {
      return { success: false, reason: 'Pet loyalty minimal 50 untuk breeding' }
    }

    const cost = 100000
    if (playerData.money < cost) {
      return { success: false, reason: `Biaya breeding: ${cost.toLocaleString('id-ID')}` }
    }

    playerData.money -= cost

    // Create offspring
    const offspring = this.createPetInstance(parent1.name, playerData)
    offspring.level = Math.floor((parent1.level + parent2.level) / 2)

    // Combine stats
    for (const stat of ['hp', 'atk', 'def', 'sp']) {
      offspring.stats[stat] = Math.floor((parent1.stats[stat] + parent2.stats[stat]) / 1.8)
    }

    // Reset loyalty of parents
    parent1.loyalty = Math.max(0, parent1.loyalty - 20)
    parent2.loyalty = Math.max(0, parent2.loyalty - 20)

    return {
      success: true,
      offspring: offspring,
      message: `Breeding berhasil! ${offspring.emoji} ${offspring.name} lahir!`
    }
  }
}

export { PetSystem, PET_DATABASE, PET_ABILITIES }
