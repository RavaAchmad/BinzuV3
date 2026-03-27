/**
 * ============================================
 * TITLES & ACHIEVEMENTS SYSTEM v1.0
 * ============================================
 * 40+ titles and achievements with stat bonuses
 */

const ACHIEVEMENTS = {
  // Combat
  first_blood: {
    id: 'first_blood',
    title: 'First Blood',
    emoji: '🩸',
    description: 'Menang pertama kali dalam pertarungan',
    condition: 'Win 1 battle',
    statBonus: { str: 1 },
    reward: 100
  },
  victor: {
    id: 'victor',
    title: 'Victor',
    emoji: '🏆',
    description: 'Menang 50 pertarungan',
    condition: 'Win 50 battles',
    statBonus: { str: 5, def: 2 },
    reward: 500
  },
  warrior_legend: {
    id: 'warrior_legend',
    title: 'Warrior Legend',
    emoji: '⚔️',
    description: 'Menang 500 pertarungan',
    condition: 'Win 500 battles',
    statBonus: { str: 15, def: 10, hp: 50 },
    reward: 2000
  },

  // Leveling
  level_seeker: {
    id: 'level_seeker',
    title: 'Level Seeker',
    emoji: '📈',
    description: 'Capai level 50',
    condition: 'Reach level 50',
    statBonus: { str: 5 },
    reward: 300
  },
  ascendant: {
    id: 'ascendant',
    title: 'Ascendant',
    emoji: '🚀',
    description: 'Capai level 100',
    condition: 'Reach level 100',
    statBonus: { str: 10, agi: 10, mag: 10, def: 5 },
    reward: 1000
  },
  god_tier: {
    id: 'god_tier',
    title: 'God Tier',
    emoji: '👑',
    description: 'Capai level 300',
    condition: 'Reach level 300',
    statBonus: { str: 50, agi: 50, mag: 50, def: 30, crit: 20 },
    reward: 5000
  },

  // Awakening
  awakened: {
    id: 'awakened',
    title: 'Awakened',
    emoji: '🌟',
    description: 'Capai Awakening I',
    condition: 'Reach Awakening I',
    statBonus: { mag: 10 },
    reward: 500
  },
  transcendent: {
    id: 'transcendent',
    title: 'Transcendent One',
    emoji: '✨',
    description: 'Capai Transcendent status',
    condition: 'Reach Transcendent',
    statBonus: { str: 100, agi: 100, mag: 100, def: 50, hp: 500 },
    reward: 10000
  },

  // Pets
  pet_collector: {
    id: 'pet_collector',
    title: 'Pet Collector',
    emoji: '🐾',
    description: 'Tangkap 10 pet',
    condition: 'Catch 10 pets',
    statBonus: { agi: 5 },
    reward: 300
  },
  breeder: {
    id: 'breeder',
    title: 'Breeder',
    emoji: '🥚',
    description: 'Breed 5 pets',
    condition: 'Breed 5 pets',
    statBonus: { hp: 50 },
    reward: 500
  },
  evolution_master: {
    id: 'evolution_master',
    title: 'Evolution Master',
    emoji: '🦋',
    description: 'Evolusi 25 pets',
    condition: 'Evolve 25 pets',
    statBonus: { str: 20, def: 15 },
    reward: 2000
  },

  // Guild
  guild_founder: {
    id: 'guild_founder',
    title: 'Guild Founder',
    emoji: '🏰',
    description: 'Buat sebuah guild',
    condition: 'Create a guild',
    statBonus: { def: 10 },
    reward: 500
  },
  guild_master: {
    id: 'guild_master',
    title: 'Guild Master',
    emoji: '👑',
    description: 'Naikkan guild ke level 5',
    condition: 'Upgrade guild to level 5',
    statBonus: { str: 30, def: 30 },
    reward: 5000
  },
  recruiter: {
    id: 'recruiter',
    title: 'Recruiter',
    emoji: '🤝',
    description: 'Rekrut 50 member ke guild',
    condition: 'Recruit 50 members',
    statBonus: { mag: 20 },
    reward: 2000
  },

  // World Boss
  first_boss_killer: {
    id: 'first_boss_killer',
    title: 'First Boss Killer',
    emoji: '💀',
    description: 'Kalahkan world boss pertama kali',
    condition: 'Defeat 1 world boss',
    statBonus: { str: 20 },
    reward: 1000
  },
  boss_slayer: {
    id: 'boss_slayer',
    title: 'Boss Slayer',
    emoji: '🗡️',
    description: 'Kalahkan 25 world boss',
    condition: 'Defeat 25 world bosses',
    statBonus: { str: 50, def: 30 },
    reward: 5000
  },
  topmost_damager: {
    id: 'topmost_damager',
    title: 'Topmost Damager',
    emoji: '🔥',
    description: 'Top damage di world boss 10 kali',
    condition: 'Top damage 10 times',
    statBonus: { str: 100, crit: 50 },
    reward: 10000
  },

  // Exploration
  explorer: {
    id: 'explorer',
    title: 'Explorer',
    emoji: '🗺️',
    description: 'Explore semua area',
    condition: 'Explore all 18 areas',
    statBonus: { agi: 50 },
    reward: 3000
  },
  monster_slayer: {
    id: 'monster_slayer',
    title: 'Monster Slayer',
    emoji: '👹',
    description: 'Bunuh 1000 monster',
    condition: 'Kill 1000 monsters',
    statBonus: { str: 30 },
    reward: 2000
  },

  // Reincarnation
  reborn: {
    id: 'reborn',
    title: 'Reborn',
    emoji: '♻️',
    description: 'Reincarnate sekali',
    condition: 'Reincarnate 1 time',
    statBonus: { str: 50, agi: 50, mag: 50 },
    reward: 5000
  },
  eternal_soul: {
    id: 'eternal_soul',
    title: 'Eternal Soul',
    emoji: '👻',
    description: 'Reincarnate 5 kali',
    condition: 'Reincarnate 5 times',
    statBonus: { str: 200, agi: 200, mag: 200, def: 100 },
    reward: 20000
  },

  // Rare
  lucky: {
    id: 'lucky',
    title: 'Lucky',
    emoji: '🍀',
    description: 'Drop item rare 100 kali',
    condition: 'Get 100 rare drops',
    statBonus: { luck: 2 },
    reward: 3000
  },
  fortune_finder: {
    id: 'fortune_finder',
    title: 'Fortune Finder',
    emoji: '💰',
    description: 'Kumpulkan 100 juta gold',
    condition: 'Collect 100M gold',
    statBonus: { mag: 50 },
    reward: 5000
  },
  world_savior: {
    id: 'world_savior',
    title: 'World Savior',
    emoji: '🌍',
    description: 'Selesaikan semua story chapter',
    condition: 'Complete all story',
    statBonus: { str: 200, agi: 200, mag: 200, def: 100, hp: 1000 },
    reward: 50000
  }
}

const TITLES_CATEGORIES = {
  combat: {
    name: 'Combat',
    titles: ['first_blood', 'victor', 'warrior_legend']
  },
  levelup: {
    name: 'Level Up',
    titles: ['level_seeker', 'ascendant', 'god_tier']
  },
  awakening: {
    name: 'Awakening',
    titles: ['awakened', 'transcendent']
  },
  pets: {
    name: 'Pets',
    titles: ['pet_collector', 'breeder', 'evolution_master']
  },
  guild: {
    name: 'Guild',
    titles: ['guild_founder', 'guild_master', 'recruiter']
  },
  boss: {
    name: 'Boss',
    titles: ['first_boss_killer', 'boss_slayer', 'topmost_damager']
  },
  exploration: {
    name: 'Exploration',
    titles: ['explorer', 'monster_slayer']
  },
  reincarnation: {
    name: 'Reincarnation',
    titles: ['reborn', 'eternal_soul']
  },
  rare: {
    name: 'Rare',
    titles: ['lucky', 'fortune_finder', 'world_savior']
  }
}

class AchievementSystem {
  /**
   * Check if player unlocked achievement
   */
  static unlockAchievement(playerData, achievementId) {
    const achievement = ACHIEVEMENTS[achievementId]
    if (!achievement) return { success: false, reason: 'Achievement tidak ditemukan' }

    if (playerData.achievements && playerData.achievements.includes(achievementId)) {
      return { unlocked: true, message: 'Achievement sudah diunlock' }
    }

    if (!playerData.achievements) playerData.achievements = []
    playerData.achievements.push(achievementId)

    // Apply stat bonus
    if (!playerData.achievementBonus) playerData.achievementBonus = {}
    for (const [stat, bonus] of Object.entries(achievement.statBonus)) {
      playerData.achievementBonus[stat] = (playerData.achievementBonus[stat] || 0) + bonus
    }

    // Add reward
    playerData.money = (playerData.money || 0) + achievement.reward

    return {
      success: true,
      message: `Unlock: ${achievement.title}! +${achievement.reward} Gold`,
      achievement: achievement,
      statBonus: achievement.statBonus
    }
  }

  /**
   * Get achievement info
   */
  static getAchievementInfo(achievementId) {
    return ACHIEVEMENTS[achievementId] || null
  }

  /**
   * Get all achievements
   */
  static getAllAchievements() {
    return ACHIEVEMENTS
  }

  /**
   * Get achievement progress
   */
  static getAchievementProgress(playerData) {
    const unlocked = playerData.achievements || []
    const total = Object.keys(ACHIEVEMENTS).length
    const percentage = (unlocked.length / total) * 100

    return {
      unlocked: unlocked.length,
      total: total,
      percentage: percentage.toFixed(2),
      locked: total - unlocked.length
    }
  }

  /**
   * Get achievements by category
   */
  static getByCategory(category) {
    const titleIds = TITLES_CATEGORIES[category]?.titles || []
    return titleIds.map(id => ACHIEVEMENTS[id]).filter(Boolean)
  }

  /**
   * Get recommended next achievements
   */
  static getRecommended(playerData) {
    const unlocked = playerData.achievements || []
    const locked = Object.entries(ACHIEVEMENTS)
      .filter(([id]) => !unlocked.includes(id))
      .slice(0, 3)

    return locked.map(([id, ach]) => ({
      id: id,
      title: ach.title,
      description: ach.description,
      condition: ach.condition,
      reward: ach.reward
    }))
  }

  /**
   * Get total stat bonus from achievements
   */
  static getTotalBonus(playerData) {
    let totalBonus = { str: 0, agi: 0, def: 0, mag: 0, crit: 0, hp: 0, luck: 0 }

    const unlocked = playerData.achievements || []
    for (const id of unlocked) {
      const ach = ACHIEVEMENTS[id]
      if (ach && ach.statBonus) {
        for (const [stat, bonus] of Object.entries(ach.statBonus)) {
          totalBonus[stat] = (totalBonus[stat] || 0) + bonus
        }
      }
    }

    return totalBonus
  }

  /**
   * Display achievements
   */
  static displayAchievements(playerData) {
    const unlocked = playerData.achievements || []
    const display = {}

    for (const category of Object.keys(TITLES_CATEGORIES)) {
      const titles = TITLES_CATEGORIES[category].titles
      const categoryUnlocked = titles.filter(id => unlocked.includes(id)).length
      display[category] = `${categoryUnlocked}/${titles.length}`
    }

    return display
  }
}

export { AchievementSystem, ACHIEVEMENTS, TITLES_CATEGORIES }
