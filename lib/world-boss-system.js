/**
 * ============================================
 * WORLD BOSS SYSTEM v1.0
 * ============================================
 * Shared boss fights with damage tracking and team rewards
 */

const WORLD_BOSSES = {
  'shadow_lord': {
    name: 'Shadow Lord',
    emoji: '👤🌑',
    hp: 500000,
    spawnInterval: 3600000, // 1 hour
    despawnTime: 1800000, // 30 minutes
    baseReward: 50000,
    rareDropRate: 0.15,
    description: 'Ancient entity of darkness'
  },
  'flame_titan': {
    name: 'Flame Titan',
    emoji: '🔥👹',
    hp: 600000,
    spawnInterval: 3600000,
    despawnTime: 1800000,
    baseReward: 60000,
    rareDropRate: 0.15,
    description: 'Gigantic being of pure fire'
  },
  'frost_dragon': {
    name: 'Frost Dragon',
    emoji: '❄️🐉',
    hp: 700000,
    spawnInterval: 7200000, // 2 hours
    despawnTime: 1800000,
    baseReward: 75000,
    rareDropRate: 0.20,
    description: 'Dragon of eternal ice'
  },
  'void_lich': {
    name: 'Void Lich',
    emoji: '💀🌌',
    hp: 800000,
    spawnInterval: 14400000, // 4 hours
    despawnTime: 1800000,
    baseReward: 100000,
    rareDropRate: 0.25,
    description: 'Undead sorcerer from the void'
  }
}

const RARE_DROPS = {
  'legendary_core': {
    name: 'Legendary Core',
    emoji: '💎',
    use: 'Awakening material',
    value: 50000
  },
  'divine_essence': {
    name: 'Divine Essence',
    emoji: '✨',
    use: 'Awakening material',
    value: 75000
  },
  'transcendent_stone': {
    name: 'Transcendent Stone',
    emoji: '🔮',
    use: 'Ultimate Awakening',
    value: 150000
  },
  'boss_weapon_chest': {
    name: 'Boss Weapon Chest',
    emoji: '🎁',
    use: 'Random legendary weapon',
    value: 200000
  }
}

class WorldBossSystem {
  /**
   * Initialize a world boss event
   */
  static spawnWorldBoss(bossType) {
    if (!WORLD_BOSSES[bossType]) {
      return { success: false, reason: 'Boss tidak ditemukan' }
    }

    const bossInfo = WORLD_BOSSES[bossType]
    return {
      id: `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: bossType,
      name: bossInfo.name,
      emoji: bossInfo.emoji,
      currentHp: bossInfo.hp,
      maxHp: bossInfo.hp,
      spawnTime: Date.now(),
      despawnTime: Date.now() + bossInfo.despawnTime,
      damageTracker: {},
      defeated: false,
      defeatedBy: null,
      totalDamage: 0
    }
  }

  /**
   * Attack world boss
   */
  static attackBoss(bossEvent, userId, damage) {
    if (bossEvent.defeated) {
      return { success: false, reason: 'Boss sudah dikalahkan' }
    }

    if (Date.now() > bossEvent.despawnTime) {
      bossEvent.defeated = false
      return { success: false, reason: 'Boss sudah hilang' }
    }

    // Add damage
    bossEvent.currentHp -= damage
    bossEvent.totalDamage += damage

    if (!bossEvent.damageTracker[userId]) {
      bossEvent.damageTracker[userId] = 0
    }
    bossEvent.damageTracker[userId] += damage

    const bossDefeated = bossEvent.currentHp <= 0

    return {
      success: true,
      damage: damage,
      currentHp: Math.max(0, bossEvent.currentHp),
      maxHp: bossEvent.maxHp,
      healthPercent: Math.max(0, (bossEvent.currentHp / bossEvent.maxHp) * 100),
      bossDefeated: bossDefeated,
      message: bossDefeated ? `${bossEvent.name} dikalahkan!` : `${bossEvent.name} HP: ${bossEvent.currentHp}/${bossEvent.maxHp}`
    }
  }

  /**
   * Complete world boss fight and distribute rewards
   */
  static completeBossFight(bossEvent) {
    if (!bossEvent.defeated && bossEvent.currentHp > 0) {
      return { success: false, reason: 'Boss belum dikalahkan' }
    }

    const bossInfo = WORLD_BOSSES[bossEvent.type]
    const damageRanking = Object.entries(bossEvent.damageTracker)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    const rewards = {}

    for (let i = 0; i < damageRanking.length; i++) {
      const [userId, damage] = damageRanking[i]
      const damagePercent = damage / bossEvent.totalDamage
      let reward = Math.floor(bossInfo.baseReward * damagePercent)

      // Bonus untuk top damage
      if (i === 0) reward = Math.floor(reward * 1.5)
      if (i === 1) reward = Math.floor(reward * 1.25)
      if (i === 2) reward = Math.floor(reward * 1.1)

      // Random rare drop chance
      let rareDrop = null
      if (Math.random() < bossInfo.rareDropRate) {
        const dropKeys = Object.keys(RARE_DROPS)
        rareDrop = dropKeys[Math.floor(Math.random() * dropKeys.length)]
      }

      rewards[userId] = {
        money: reward,
        topDamage: damage,
        rank: i + 1,
        rareDrop: rareDrop
      }
    }

    return {
      success: true,
      bossDefeated: bossEvent.name,
      totalDamage: bossEvent.totalDamage,
      topDamagers: damageRanking,
      rewards: rewards
    }
  }

  /**
   * Get world boss status
   */
  static getBossStatus(bossEvent) {
    const bossInfo = WORLD_BOSSES[bossEvent.type]
    const timeRemaining = Math.max(0, bossEvent.despawnTime - Date.now())

    return {
      name: bossEvent.name,
      emoji: bossEvent.emoji,
      hp: `${Math.max(0, bossEvent.currentHp)}/${bossEvent.maxHp}`,
      healthPercent: Math.max(0, (bossEvent.currentHp / bossEvent.maxHp) * 100),
      timeRemaining: Math.floor(timeRemaining / 1000),
      participants: Object.keys(bossEvent.damageTracker).length,
      totalDamage: bossEvent.totalDamage,
      topDamager: this.getTopDamager(bossEvent),
      defeated: bossEvent.currentHp <= 0
    }
  }

  /**
   * Get top damager
   */
  static getTopDamager(bossEvent) {
    let topUserId = null
    let topDamage = 0

    for (const [userId, damage] of Object.entries(bossEvent.damageTracker)) {
      if (damage > topDamage) {
        topDamage = damage
        topUserId = userId
      }
    }

    return { userId: topUserId, damage: topDamage }
  }

  /**
   * Get damage ranking
   */
  static getDamageRanking(bossEvent, limit = 10) {
    return Object.entries(bossEvent.damageTracker)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([userId, damage], index) => ({
        rank: index + 1,
        userId: userId,
        damage: damage,
        percent: ((damage / bossEvent.totalDamage) * 100).toFixed(2)
      }))
  }

  /**
   * Get personal contribution
   */
  static getPersonalContribution(bossEvent, userId) {
    const damage = bossEvent.damageTracker[userId] || 0
    const percent = bossEvent.totalDamage > 0 ? (damage / bossEvent.totalDamage) * 100 : 0

    return {
      userId: userId,
      damage: damage,
      percent: percent.toFixed(2),
      contributed: damage > 0
    }
  }

  /**
   * Check if player can attack boss
   */
  static canAttack(bossEvent, playerData, lastAttackTime) {
    const errors = []

    if (bossEvent.defeated) {
      errors.push('Boss sudah dikalahkan')
    }

    if (Date.now() > bossEvent.despawnTime) {
      errors.push('Boss sudah hilang')
    }

    if (playerData.stats.hp <= 0) {
      errors.push('Player sudah mati')
    }

    // Cooldown check (5 second between attacks)
    if (lastAttackTime && Date.now() - lastAttackTime < 5000) {
      errors.push('Tunggu beberapa detik untuk serangan berikutnya')
    }

    return {
      canAttack: errors.length === 0,
      errors: errors,
      reason: errors.length > 0 ? errors.join(', ') : 'Siap menyerang!'
    }
  }
}

export { WorldBossSystem, WORLD_BOSSES, RARE_DROPS }
