/**
 * ============================================
 * AWAKENING & REINCARNATION SYSTEM v1.0
 * ============================================
 * Breakthrough system to reach higher power levels
 * Awakening III unlocks Transcendent mode → Reincarnation restart with bonus
 */

const AWAKENING_STAGES = {
  1: {
    level: 'Awakening I',
    emoji: '🌟',
    requirement: { playerLevel: 50, money: 1000000, itemsNeeded: { rare_core: 5 } },
    statMultiplier: 1.2,
    unlocksFeature: 'Advanced Skills',
    description: 'Mulai membuka potensi tersembunyi'
  },
  2: {
    level: 'Awakening II',
    emoji: '✨',
    requirement: { playerLevel: 100, money: 3000000, itemsNeeded: { epic_core: 10, ancient_stone: 5 } },
    statMultiplier: 1.5,
    unlocksFeature: 'Dual Job Mastery',
    description: 'Kekuatan yang sudah jauh melampaui manusia'
  },
  3: {
    level: 'Awakening III',
    emoji: '🔥',
    requirement: { playerLevel: 150, money: 8000000, itemsNeeded: { legendary_core: 20, divine_essence: 10, transcendent_stone: 1 } },
    statMultiplier: 2.0,
    unlocksFeature: 'Transcendent Form',
    description: 'Setara dengan seorang dewa'
  },
  4: {
    level: 'Perfect Awakening',
    emoji: '⚡',
    requirement: { playerLevel: 250, money: 20000000, itemsNeeded: { void_stone: 20, celestial_fragment: 15, god_essence: 5 } },
    statMultiplier: 3.0,
    unlocksFeature: 'Ultimate Power',
    description: 'Kekuatan yang melampaui segala batasan alam'
  }
}

const REINCARNATION_BENEFITS = {
  1: {
    statBonus: { str: 5, def: 5, agi: 5, mag: 5 },
    expMultiplier: 1.15,
    moneyMultiplier: 1.2,
    bonusSkillPoints: 3,
    description: '1st Life - Awal kehidupan baru'
  },
  2: {
    statBonus: { str: 10, def: 10, agi: 10, mag: 10 },
    expMultiplier: 1.3,
    moneyMultiplier: 1.35,
    bonusSkillPoints: 6,
    description: '2nd Life - Pengalaman kehidupan sebelumnya'
  },
  3: {
    statBonus: { str: 15, def: 15, agi: 15, mag: 15 },
    expMultiplier: 1.5,
    moneyMultiplier: 1.5,
    bonusSkillPoints: 10,
    description: '3rd Life - Ingatan dari masa lalu'
  },
  4: {
    statBonus: { str: 20, def: 20, agi: 20, mag: 20 },
    expMultiplier: 1.7,
    moneyMultiplier: 1.7,
    bonusSkillPoints: 15,
    description: '4th Life - Penyatuan semua kehidupan'
  },
  5: {
    statBonus: { str: 30, def: 30, agi: 30, mag: 30 },
    expMultiplier: 2.0,
    moneyMultiplier: 2.0,
    bonusSkillPoints: 20,
    description: '5th Life - Pertautan keilahian'
  }
}

class AwakeningSystem {
  /**
   * Check if player can perform awakening
   */
  static canAwaken(playerData, targetAwakeningLevel) {
    const requirement = AWAKENING_STAGES[targetAwakeningLevel]
    if (!requirement) return { canAwaken: false, reason: 'Tingkat awakening tidak valid' }

    const currentAwakening = playerData.awakening || 0
    if (currentAwakening >= targetAwakeningLevel) {
      return { canAwaken: false, reason: `Sudah di tingkat awakening ini atau lebih tinggi` }
    }

    const errors = []

    // Check level
    if (playerData.level < requirement.requirement.playerLevel) {
      errors.push(`Level minimal: ${requirement.requirement.playerLevel} (Anda: ${playerData.level})`)
    }

    // Check money
    if (playerData.money < requirement.requirement.money) {
      errors.push(`Uang minimal: ${requirement.requirement.money.toLocaleString('id-ID')}`)
    }

    // Check items
    for (const [item, count] of Object.entries(requirement.requirement.itemsNeeded)) {
      const hasItem = (playerData.inventory?.items || []).filter(i => i.name === item).length
      if (hasItem < count) {
        errors.push(`${item}: ${count} butir (Anda: ${hasItem})`)
      }
    }

    return {
      canAwaken: errors.length === 0,
      reason: errors.length > 0 ? errors.join('\n') : 'Siap untuk awakening!',
      errors
    }
  }

  /**
   * Perform awakening
   */
  static performAwakening(playerData, targetAwakeningLevel) {
    const check = this.canAwaken(playerData, targetAwakeningLevel)
    if (!check.canAwaken) return check

    const requirement = AWAKENING_STAGES[targetAwakeningLevel]

    // Deduct resources
    playerData.money -= requirement.requirement.money
    for (const [item, count] of Object.entries(requirement.requirement.itemsNeeded)) {
      playerData.inventory.items = playerData.inventory.items.filter(i => {
        if (i.name === item && count > 0) {
          count--
          return false
        }
        return true
      })
    }

    // Apply awakening
    playerData.awakening = targetAwakeningLevel
    playerData.lastAwakenTime = Date.now()

    // Apply stat multiplier
    const multiplier = requirement.statMultiplier
    for (const stat of ['hp', 'mana', 'str', 'agi', 'def', 'mag', 'crit']) {
      if (playerData.stats[stat]) {
        playerData.stats[stat] *= multiplier
      }
    }

    return {
      success: true,
      message: 'Awakening berhasil!',
      newAwakeningLevel: targetAwakeningLevel,
      unlocksFeature: requirement.unlocksFeature,
      description: requirement.description,
      statMultiplier: multiplier
    }
  }

  /**
   * Get next awakening info
   */
  static getNextAwakeningInfo(playerData) {
    const currentAwakening = playerData.awakening || 0
    const nextLevel = currentAwakening + 1

    if (!AWAKENING_STAGES[nextLevel]) {
      return { completed: true, message: 'Sudah mencapai Perfect Awakening!' }
    }

    const nextRequirement = AWAKENING_STAGES[nextLevel]
    return {
      level: nextLevel,
      info: nextRequirement,
      canAwaken: this.canAwaken(playerData, nextLevel).canAwaken,
      progress: this.getAwakeningProgress(playerData, nextLevel)
    }
  }

  /**
   * Get awakening progress towards next level
   */
  static getAwakeningProgress(playerData, targetLevel) {
    const requirement = AWAKENING_STAGES[targetLevel]
    if (!requirement) return null

    const progress = {
      level: `${playerData.level}/${requirement.requirement.playerLevel}`,
      money: `${playerData.money.toLocaleString('id-ID')}/${requirement.requirement.money.toLocaleString('id-ID')}`,
      items: {}
    }

    for (const [item, needed] of Object.entries(requirement.requirement.itemsNeeded)) {
      const hasItem = (playerData.inventory?.items || []).filter(i => i.name === item).length
      progress.items[item] = `${hasItem}/${needed}`
    }

    return progress
  }

  /**
   * Get awakening stage info
   */
  static getAwakeningInfo(level) {
    return AWAKENING_STAGES[level] || null
  }
}

class ReincarnationSystem {
  /**
   * Check if player can reincarnate
   */
  static canReincarnate(playerData) {
    const currentAwakening = playerData.awakening || 0
    if (currentAwakening < 3) {
      return { canReincarnate: false, reason: 'Harus mencapai Awakening III terlebih dahulu' }
    }

    if (playerData.level < 200) {
      return { canReincarnate: false, reason: `Level minimal: 200 (Anda: ${playerData.level})` }
    }

    return { canReincarnate: true, reason: 'Siap untuk reinkarnasi!' }
  }

  /**
   * Perform reincarnation - Reset level but keep bonuses
   */
  static reincarnate(playerData) {
    const check = this.canReincarnate(playerData)
    if (!check.canReincarnate) return check

    const currentLives = (playerData.reincarnationCount || 0) + 1
    const benefits = REINCARNATION_BENEFITS[Math.min(currentLives, 5)]

    if (!benefits) {
      return { success: false, reason: 'Sudah mencapai batas reinkarnasi' }
    }

    // Store pre-reincarnation stats
    const preReincStats = { ...playerData.stats }

    // Reset to level 1 but apply benefits
    playerData.level = 1
    playerData.exp = 0
    playerData.reincarnationCount = currentLives
    playerData.lastReincarnationTime = Date.now()
    playerData.awakening = 0 // Reset awakening, can re-awaken

    // Apply permanent stat bonuses
    for (const [stat, bonus] of Object.entries(benefits.statBonus)) {
      playerData.stats[stat] = (playerData.stats[stat] || 0) + bonus
    }

    // Store multipliers
    if (!playerData.reincarnationMultipliers) {
      playerData.reincarnationMultipliers = {}
    }
    playerData.reincarnationMultipliers.expMult = benefits.expMultiplier
    playerData.reincarnationMultipliers.moneyMult = benefits.moneyMultiplier

    return {
      success: true,
      message: 'Reinkarnasi berhasil!',
      life: currentLives,
      description: benefits.description,
      statBonus: benefits.statBonus,
      expMultiplier: benefits.expMultiplier,
      moneyMultiplier: benefits.moneyMultiplier,
      bonusSkillPoints: benefits.bonusSkillPoints,
      preReincStats: preReincStats
    }
  }

  /**
   * Get reincarnation info
   */
  static getReincarnationInfo(playerData) {
    const currentLives = (playerData.reincarnationCount || 0) + 1

    return {
      currentLife: currentLives,
      benefits: REINCARNATION_BENEFITS[Math.min(currentLives, 5)] || null,
      canReincarnate: this.canReincarnate(playerData).canReincarnate,
      nextLifeBenefits: currentLives < 5 ? REINCARNATION_BENEFITS[Math.min(currentLives + 1, 5)] : null
    }
  }

  /**
   * Get reincarnation progress
   */
  static getReincarnationProgress(playerData) {
    const check = this.canReincarnate(playerData)
    return {
      level: `${playerData.level}/200`,
      awakening: `${playerData.awakening || 0}/3 (Minimum)`,
      canReincarnate: check.canReincarnate,
      reason: check.reason
    }
  }
}

export { AwakeningSystem, ReincarnationSystem, AWAKENING_STAGES, REINCARNATION_BENEFITS }
