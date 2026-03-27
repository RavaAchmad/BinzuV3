/**
 * ============================================
 * JOB TIER ADVANCEMENT SYSTEM v1.0
 * ============================================
 * 4-Tier job advancement system with stat scaling
 * Warrior → Dragon Knight → Chaos Lord → Death God → Transcendent
 */

const JOB_TIERS = {
  // TIER 1 - Basic Jobs
  warrior: {
    tier: 1,
    emoji: '⚔️',
    name: 'Warrior',
    description: 'Basic melee fighter',
    statBonus: { str: 2.5, def: 1.5, hp: 1.2, crit: 0.8 },
    progressionReq: { level: 1, money: 0, awakening: 0 },
    nextAdvance: 'dragon_knight'
  },
  mage: {
    tier: 1,
    emoji: '🧙',
    name: 'Mage',
    description: 'Master of elemental magic',
    statBonus: { mag: 3, mana: 2, def: 1, crit: 1.2 },
    progressionReq: { level: 1, money: 0, awakening: 0 },
    nextAdvance: 'sorcerer'
  },
  archer: {
    tier: 1,
    emoji: '🏹',
    name: 'Archer',
    description: 'Swift ranged fighter',
    statBonus: { agi: 3, crit: 1.8, str: 1.2, def: 0.5 },
    progressionReq: { level: 1, money: 0, awakening: 0 },
    nextAdvance: 'ranger'
  },
  assassin: {
    tier: 1,
    emoji: '🗡️',
    name: 'Assassin',
    description: 'Stealth and precision fighter',
    statBonus: { agi: 3.2, crit: 2, def: 0.3, str: 1 },
    progressionReq: { level: 1, money: 0, awakening: 0 },
    nextAdvance: 'shadow_master'
  },

  // TIER 2 - Advanced Jobs
  dragon_knight: {
    tier: 2,
    emoji: '🐉',
    name: 'Dragon Knight',
    description: 'Warrior infused with dragon power',
    statBonus: { str: 4, def: 3, hp: 2, crit: 1.5 },
    progressionReq: { level: 50, money: 500000, awakening: 1 },
    nextAdvance: 'chaos_lord',
    bonusAbility: 'dragon_breath'
  },
  sorcerer: {
    tier: 2,
    emoji: '✨',
    name: 'Sorcerer',
    description: 'Master of advanced magic',
    statBonus: { mag: 5, mana: 4, def: 2, crit: 2 },
    progressionReq: { level: 50, money: 500000, awakening: 1 },
    nextAdvance: 'chaos_mage',
    bonusAbility: 'spell_amplify'
  },
  ranger: {
    tier: 2,
    emoji: '🦅',
    name: 'Ranger',
    description: 'Master tracker and archer',
    statBonus: { agi: 5, crit: 3, str: 2, def: 1 },
    progressionReq: { level: 50, money: 500000, awakening: 1 },
    nextAdvance: 'beast_master',
    bonusAbility: 'piercing_shot'
  },
  shadow_master: {
    tier: 2,
    emoji: '🌑',
    name: 'Shadow Master',
    description: 'Master of shadows and deception',
    statBonus: { agi: 5.5, crit: 3.5, def: 0.8, str: 1.5 },
    progressionReq: { level: 50, money: 500000, awakening: 1 },
    nextAdvance: 'phantom_lord',
    bonusAbility: 'shadow_clone'
  },

  // TIER 3 - Ultimate Jobs
  chaos_lord: {
    tier: 3,
    emoji: '💀',
    name: 'Chaos Lord',
    description: 'Warrior transcending into chaos',
    statBonus: { str: 6, def: 4, hp: 3, crit: 2, mag: 2 },
    progressionReq: { level: 100, money: 2000000, awakening: 2 },
    nextAdvance: 'death_god',
    bonusAbilityList: ['chaos_slash', 'infernal_wave']
  },
  chaos_mage: {
    tier: 3,
    emoji: '⚡',
    name: 'Chaos Mage',
    description: 'Mage harnessing chaotic energy',
    statBonus: { mag: 7, mana: 6, def: 3, crit: 2.5 },
    progressionReq: { level: 100, money: 2000000, awakening: 2 },
    nextAdvance: 'death_sage',
    bonusAbilityList: ['chaos_bolt', 'mana_explosion']
  },
  beast_master: {
    tier: 3,
    emoji: '🦁',
    name: 'Beast Master',
    description: 'Commander of wild beasts',
    statBonus: { agi: 6, crit: 4, str: 3, def: 2 },
    progressionReq: { level: 100, money: 2000000, awakening: 2 },
    nextAdvance: 'god_beast_tamer',
    bonusAbilityList: ['beast_summon', 'primal_roar']
  },
  phantom_lord: {
    tier: 3,
    emoji: '👻',
    name: 'Phantom Lord',
    description: 'Ultimate shadow manipulator',
    statBonus: { agi: 7, crit: 5, def: 1.5, str: 2 },
    progressionReq: { level: 100, money: 2000000, awakening: 2 },
    nextAdvance: 'void_walker',
    bonusAbilityList: ['phantom_strike', 'void_shift']
  },

  // TIER 4 - Transcendent Jobs
  death_god: {
    tier: 4,
    emoji: '⚰️',
    name: 'Death God',
    description: 'God of death and destruction',
    statBonus: { str: 8, def: 6, hp: 4, crit: 3, mag: 3, lifeSteal: 2 },
    progressionReq: { level: 150, money: 5000000, awakening: 3 },
    nextAdvance: 'transcendent',
    bonusAbilityList: ['death_mark', 'soul_reaper', 'apocalypse']
  },
  death_sage: {
    tier: 4,
    emoji: '📜',
    name: 'Death Sage',
    description: 'Sage of death and knowledge',
    statBonus: { mag: 9, mana: 8, def: 4, crit: 3 },
    progressionReq: { level: 150, money: 5000000, awakening: 3 },
    nextAdvance: 'transcendent',
    bonusAbilityList: ['death_curse', 'knowledge_of_death', 'eternal_wisdom']
  },
  god_beast_tamer: {
    tier: 4,
    emoji: '🌟',
    name: 'God Beast Tamer',
    description: 'Tamer of legendary creatures',
    statBonus: { agi: 8, crit: 5.5, str: 4, def: 3 },
    progressionReq: { level: 150, money: 5000000, awakening: 3 },
    nextAdvance: 'transcendent',
    bonusAbilityList: ['celestial_summon', 'god_blessing', 'alpha_roar']
  },
  void_walker: {
    tier: 4,
    emoji: '🌌',
    name: 'Void Walker',
    description: 'Traverser of the void',
    statBonus: { agi: 8.5, crit: 6, def: 2, str: 2.5, mag: 3 },
    progressionReq: { level: 150, money: 5000000, awakening: 3 },
    nextAdvance: 'transcendent',
    bonusAbilityList: ['void_step', 'reality_break', 'dimensional_slash']
  },

  // TIER 5 - Transcendent (Ultimate form - special status)
  transcendent: {
    tier: 5,
    emoji: '✨',
    name: 'Transcendent',
    description: 'Transcended beyond normal limits - Setara Dewa',
    statBonus: { str: 10, def: 8, hp: 5, crit: 4, mag: 5, agi: 8, mana: 5 },
    progressionReq: { level: 200, money: 10000000, awakening: 4 },
    nextAdvance: null,
    bonusAbilityList: ['god_mode', 'transcend_form', 'ultimate_power']
  }
}

class JobTierSystem {
  /**
   * Check if player can advance to next tier
   */
  static canAdvanceJob(playerData, nextJob) {
    const jobInfo = JOB_TIERS[nextJob]
    if (!jobInfo) return { canAdvance: false, reason: 'Job tidak ditemukan' }

    const requirements = jobInfo.progressionReq
    const errors = []

    if (playerData.level < requirements.level) {
      errors.push(`Level minimal: ${requirements.level} (Anda: ${playerData.level})`)
    }
    if (playerData.money < requirements.money) {
      errors.push(`Uang minimal: ${requirements.money.toLocaleString('id-ID')}`)
    }
    if (!playerData.awakening || playerData.awakening < requirements.awakening) {
      errors.push(`Awakening minimal: ${requirements.awakening}`)
    }

    return {
      canAdvance: errors.length === 0,
      reason: errors.length > 0 ? errors.join('\n') : 'Bisa naik tier!',
      errors
    }
  }

  /**
   * Perform job advancement
   */
  static advanceJob(playerData, newJob) {
    const check = this.canAdvanceJob(playerData, newJob)
    if (!check.canAdvance) return check

    const jobInfo = JOB_TIERS[newJob]
    const requirements = jobInfo.progressionReq

    // Deduct requirements
    playerData.money -= requirements.money

    // Update job
    playerData.jobTier = newJob
    playerData.jobTierLevel = jobInfo.tier
    playerData.lastJobAdvance = Date.now()

    // Apply stat bonuses
    const bonusMultiplier = 1 + (jobInfo.tier * 0.1) // Additional bonus per tier
    for (const [stat, bonus] of Object.entries(jobInfo.statBonus)) {
      playerData.stats[stat] = (playerData.stats[stat] || 0) + (bonus * bonusMultiplier)
    }

    return {
      success: true,
      message: 'Berhasil naik tier!',
      oldJob: playerData.skill?.name,
      newJob: jobInfo.name,
      newTier: jobInfo.tier,
      bonusReceived: jobInfo.statBonus
    }
  }

  /**
   * Get job info display
   */
  static getJobInfo(jobName) {
    return JOB_TIERS[jobName] || null
  }

  /**
   * Get all available jobs to advance
   */
  static getAvailableAdvances(playerData) {
    const currentJob = playerData.jobTier || playerData.skill?.name
    const currentJobInfo = JOB_TIERS[currentJob]

    if (!currentJobInfo || !currentJobInfo.nextAdvance) {
      return { completed: true, message: 'Sudah mencapai tier maksimal!' }
    }

    const nextJob = currentJobInfo.nextAdvance
    const requirements = JOB_TIERS[nextJob].progressionReq

    return {
      completed: false,
      nextJob: nextJob,
      nextJobInfo: JOB_TIERS[nextJob],
      requirements: requirements,
      progress: {
        level: `${playerData.level}/${requirements.level}`,
        money: `${playerData.money.toLocaleString('id-ID')}/${requirements.money.toLocaleString('id-ID')}`,
        awakening: `${playerData.awakening || 0}/${requirements.awakening}`
      }
    }
  }

  /**
   * Get job tier progression info
   */
  static getAllTiers() {
    return JOB_TIERS
  }

  /**
   * Calculate effective stats with job tier multiplier
   */
  static calculateEffectiveStats(baseStats, jobTier) {
    const tierMultiplier = 1 + ((JOB_TIERS[jobTier]?.tier || 1) * 0.15)
    const effectiveStats = {}

    for (const [key, value] of Object.entries(baseStats)) {
      effectiveStats[key] = value * tierMultiplier
    }

    return effectiveStats
  }
}

export { JobTierSystem, JOB_TIERS }
