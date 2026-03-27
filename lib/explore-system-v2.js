/**
 * ============================================
 * ADVANCED EXPLORE SYSTEM v2.0
 * ============================================
 * 18 Progressive exploring areas with level-based monsters
 * Base rewards: Gold, EXP, Rare Items, Monster Corpses
 */

const EXPLORE_AREAS = {
  1: {
    name: 'Goblin Settlement',
    emoji: '🟢',
    color: 'GREEN',
    minLevel: 1,
    maxLevel: 5,
    monsters: [
      { name: 'Goblin', rarity: 'common', hp: 20, damage: 5, goldReward: 100, expReward: 50 },
      { name: 'Slime', rarity: 'common', hp: 15, damage: 3, goldReward: 80, expReward: 40 },
      { name: 'Nymph', rarity: 'uncommon', hp: 25, damage: 8, goldReward: 150, expReward: 75 }
    ],
    rareDropRate: 0.05
  },
  2: {
    name: 'Dark Forest',
    emoji: '🟡',
    color: 'YELLOW',
    minLevel: 6,
    maxLevel: 10,
    monsters: [
      { name: 'Creeper', rarity: 'common', hp: 35, damage: 10, goldReward: 200, expReward: 100 },
      { name: 'Skeleton', rarity: 'common', hp: 40, damage: 12, goldReward: 220, expReward: 110 },
      { name: 'Spider', rarity: 'uncommon', hp: 50, damage: 15, goldReward: 300, expReward: 150 }
    ],
    rareDropRate: 0.08
  },
  3: {
    name: 'Demon Cavern',
    emoji: '🟠',
    color: 'ORANGE',
    minLevel: 11,
    maxLevel: 15,
    monsters: [
      { name: 'Baby Demon', rarity: 'uncommon', hp: 60, damage: 18, goldReward: 400, expReward: 200 },
      { name: 'Ghost', rarity: 'uncommon', hp: 55, damage: 16, goldReward: 380, expReward: 190 },
      { name: 'Ghoul', rarity: 'rare', hp: 80, damage: 25, goldReward: 550, expReward: 275 }
    ],
    rareDropRate: 0.10
  },
  4: {
    name: 'Witch Tower',
    emoji: '🔴',
    color: 'RED',
    minLevel: 16,
    maxLevel: 20,
    monsters: [
      { name: 'Imp', rarity: 'uncommon', hp: 70, damage: 22, goldReward: 500, expReward: 250 },
      { name: 'Witch', rarity: 'rare', hp: 90, damage: 30, goldReward: 700, expReward: 350 },
      { name: 'Vampire', rarity: 'rare', hp: 100, damage: 35, goldReward: 800, expReward: 400 }
    ],
    rareDropRate: 0.12
  },
  5: {
    name: 'Toxic Swamp',
    emoji: '🟣',
    color: 'PURPLE',
    minLevel: 21,
    maxLevel: 25,
    monsters: [
      { name: 'Snake', rarity: 'uncommon', hp: 80, damage: 28, goldReward: 600, expReward: 300 },
      { name: 'Giant Scorpion', rarity: 'rare', hp: 110, damage: 40, goldReward: 900, expReward: 450 },
      { name: 'Bee', rarity: 'rare', hp: 95, damage: 38, goldReward: 850, expReward: 425 }
    ],
    rareDropRate: 0.15
  },
  6: {
    name: 'Phantom City',
    emoji: '🟤',
    color: 'BROWN',
    minLevel: 26,
    maxLevel: 30,
    monsters: [
      { name: 'Phantom', rarity: 'rare', hp: 120, damage: 45, goldReward: 1000, expReward: 500 },
      { name: 'Sorcerer', rarity: 'rare', hp: 130, damage: 50, goldReward: 1100, expReward: 550 },
      { name: 'Dracula', rarity: 'epic', hp: 180, damage: 70, goldReward: 1500, expReward: 750 }
    ],
    rareDropRate: 0.18
  },
  7: {
    name: 'Ocean Deep',
    emoji: '🟦',
    color: 'BLUE',
    minLevel: 31,
    maxLevel: 35,
    monsters: [
      { name: 'Shark', rarity: 'rare', hp: 140, damage: 55, goldReward: 1200, expReward: 600 },
      { name: 'Giant Piranha', rarity: 'rare', hp: 150, damage: 60, goldReward: 1300, expReward: 650 },
      { name: 'Mermaid', rarity: 'epic', hp: 200, damage: 80, goldReward: 1800, expReward: 900 }
    ],
    rareDropRate: 0.20
  },
  8: {
    name: 'Swamp Jungle',
    emoji: '🟧',
    color: 'ORANGE_RED',
    minLevel: 36,
    maxLevel: 40,
    monsters: [
      { name: 'Giant Crocodile', rarity: 'rare', hp: 160, damage: 65, goldReward: 1400, expReward: 700 },
      { name: 'Komodo', rarity: 'epic', hp: 210, damage: 90, goldReward: 1900, expReward: 950 },
      { name: 'Lamp Fish', rarity: 'epic', hp: 190, damage: 85, goldReward: 1800, expReward: 900 }
    ],
    rareDropRate: 0.22
  },
  9: {
    name: 'Infernal Pit',
    emoji: '⚫',
    color: 'BLACK',
    minLevel: 41,
    maxLevel: 45,
    monsters: [
      { name: 'Demon', rarity: 'epic', hp: 230, damage: 100, goldReward: 2000, expReward: 1000 },
      { name: 'Harpy', rarity: 'epic', hp: 210, damage: 95, goldReward: 1900, expReward: 950 },
      { name: 'Devil', rarity: 'legendary', hp: 300, damage: 130, goldReward: 2500, expReward: 1250 }
    ],
    rareDropRate: 0.25
  },
  10: {
    name: 'Celestial Realm',
    emoji: '💎',
    color: 'CYAN',
    minLevel: 46,
    maxLevel: 50,
    monsters: [
      { name: 'Dullahan', rarity: 'epic', hp: 250, damage: 110, goldReward: 2200, expReward: 1100 },
      { name: 'Manticore', rarity: 'epic', hp: 270, damage: 120, goldReward: 2300, expReward: 1150 },
      { name: 'Cerberus', rarity: 'legendary', hp: 350, damage: 150, goldReward: 3000, expReward: 1500 }
    ],
    rareDropRate: 0.28
  },
  11: {
    name: 'Young Dragon Nest',
    emoji: '🔥',
    color: 'RED',
    minLevel: 51,
    maxLevel: 55,
    monsters: [
      { name: 'Baby Dragon', rarity: 'epic', hp: 300, damage: 130, goldReward: 2500, expReward: 1250 },
      { name: 'Young Dragon', rarity: 'legendary', hp: 400, damage: 160, goldReward: 3200, expReward: 1600 },
      { name: 'Scaled Baby Dragon', rarity: 'epic', hp: 320, damage: 140, goldReward: 2700, expReward: 1350 }
    ],
    rareDropRate: 0.30
  },
  12: {
    name: 'Dragon Lair',
    emoji: '🐲',
    color: 'YELLOW_GREEN',
    minLevel: 56,
    maxLevel: 60,
    monsters: [
      { name: 'Kid Dragon', rarity: 'legendary', hp: 450, damage: 180, goldReward: 3500, expReward: 1750 },
      { name: 'Not so young Dragon', rarity: 'legendary', hp: 480, damage: 190, goldReward: 3700, expReward: 1850 },
      { name: 'Scaled Kid Dragon', rarity: 'legendary', hp: 460, damage: 185, goldReward: 3600, expReward: 1800 }
    ],
    rareDropRate: 0.32
  },
  13: {
    name: 'Ancient Dragon Domain',
    emoji: '🐉',
    color: 'PURPLE',
    minLevel: 61,
    maxLevel: 65,
    monsters: [
      { name: 'Definitely not so young Dragon', rarity: 'mythical', hp: 550, damage: 220, goldReward: 4000, expReward: 2000 },
      { name: 'Teen Dragon', rarity: 'mythical', hp: 570, damage: 230, goldReward: 4200, expReward: 2100 },
      { name: 'Scaled Teen Dragon', rarity: 'mythical', hp: 560, damage: 225, goldReward: 4100, expReward: 2050 }
    ],
    rareDropRate: 0.35
  },
  14: {
    name: 'Minecraft Overworld',
    emoji: '👽',
    color: 'LIME_GREEN',
    minLevel: 66,
    maxLevel: 70,
    monsters: [
      { name: 'Chicken Jockey', rarity: 'legendary', hp: 300, damage: 140, goldReward: 2800, expReward: 1400 },
      { name: 'Chicken Lava', rarity: 'epic', hp: 280, damage: 130, goldReward: 2600, expReward: 1300 },
      { name: 'Steve', rarity: 'mythical', hp: 600, damage: 250, goldReward: 4500, expReward: 2250 }
    ],
    rareDropRate: 0.37
  },
  15: {
    name: 'Lunar Sanctuary',
    emoji: '🌙',
    color: 'SILVER',
    minLevel: 71,
    maxLevel: 75,
    monsters: [
      { name: 'Squirrel with a Gun', rarity: 'epic', hp: 350, damage: 160, goldReward: 3200, expReward: 1600 },
      { name: 'Moon Goddess', rarity: 'mythical', hp: 650, damage: 270, goldReward: 4800, expReward: 2400 },
      { name: 'Alien', rarity: 'mythical', hp: 680, damage: 280, goldReward: 5000, expReward: 2500 }
    ],
    rareDropRate: 0.40
  },
  16: {
    name: 'Mechanical Wasteland',
    emoji: '🤖',
    color: 'GRAY',
    minLevel: 76,
    maxLevel: 80,
    monsters: [
      { name: 'Mecha Rhino', rarity: 'mythical', hp: 700, damage: 300, goldReward: 5200, expReward: 2600 },
      { name: 'Robo Raptor', rarity: 'mythical', hp: 720, damage: 310, goldReward: 5400, expReward: 2700 },
      { name: 'Metal Rex', rarity: 'divine', hp: 800, damage: 350, goldReward: 6000, expReward: 3000 }
    ],
    rareDropRate: 0.42
  },
  17: {
    name: 'Mythical Mountain',
    emoji: '🦊',
    color: 'ORANGE',
    minLevel: 81,
    maxLevel: 85,
    monsters: [
      { name: 'Kitsune', rarity: 'mythical', hp: 750, damage: 330, goldReward: 5600, expReward: 2800 },
      { name: 'Houou', rarity: 'divine', hp: 850, damage: 370, goldReward: 6200, expReward: 3100 },
      { name: 'Inugami', rarity: 'divine', hp: 820, damage: 360, goldReward: 6000, expReward: 3000 }
    ],
    rareDropRate: 0.45
  },
  18: {
    name: 'Transcendent Realm',
    emoji: '✨',
    color: 'GOLD',
    minLevel: 125,
    maxLevel: 999,
    monsters: [
      { name: 'Mythical Dragon', rarity: 'divine', hp: 1000, damage: 400, goldReward: 7000, expReward: 3500 },
      { name: 'Phoenix', rarity: 'divine', hp: 1100, damage: 420, goldReward: 7200, expReward: 3600 },
      { name: 'Celestial Beast', rarity: 'celestial', hp: 1200, damage: 450, goldReward: 8000, expReward: 4000 }
    ],
    rareDropRate: 0.50
  }
}

const RARE_ITEMS = {
  ancient_sword: { name: 'Ancient Sword', emoji: '⚔️', value: 5000 },
  sacred_ring: { name: 'Sacred Ring', emoji: '💍', value: 8000 },
  mage_staff: { name: 'Mage Staff', emoji: '🔮', value: 6000 },
  healing_potion: { name: 'Healing Potion', emoji: '🧪', value: 2000 },
  rare_gem: { name: 'Rare Gem', emoji: '💎', value: 10000 },
  ancient_scroll: { name: 'Ancient Scroll', emoji: '📜', value: 7000 }
}

class ExploreSystem {
  /**
   * Get area info
   */
  static getAreaInfo(areaNumber) {
    return EXPLORE_AREAS[areaNumber] || null
  }

  /**
   * Get available areas for player level
   */
  static getAvailableAreas(playerLevel) {
    return Object.entries(EXPLORE_AREAS)
      .filter(([_, area]) => playerLevel >= area.minLevel)
      .map(([num, area]) => ({
        number: num,
        ...area
      }))
  }

  /**
   * Explore an area and encounter monster
   */
  static exploreArea(areaNumber, playerLevel) {
    const area = EXPLORE_AREAS[areaNumber]
    if (!area) return { success: false, reason: 'Area tidak ditemukan' }

    if (playerLevel < area.minLevel) {
      return { success: false, reason: `Level minimal: ${area.minLevel}` }
    }

    // Random monster selection
    const monster = area.monsters[Math.floor(Math.random() * area.monsters.length)]
    const scaledHp = monster.hp + (playerLevel * 2)
    const scaledDamage = monster.damage + Math.floor(playerLevel * 1.5)

    // Calculate rewards based on level difference
    let goldMultiplier = 1
    let expMultiplier = 1

    const levelDiff = playerLevel - area.minLevel
    if (levelDiff > 0) {
      goldMultiplier = 1 + (levelDiff * 0.05)
      expMultiplier = 1 + (levelDiff * 0.03)
    }

    // Check for rare drop
    let rareDrop = null
    if (Math.random() < area.rareDropRate) {
      const rareKeys = Object.keys(RARE_ITEMS)
      const rareKey = rareKeys[Math.floor(Math.random() * rareKeys.length)]
      rareDrop = { key: rareKey, ...RARE_ITEMS[rareKey] }
    }

    return {
      success: true,
      encounter: {
        areaNumber: areaNumber,
        areaName: area.name,
        areaEmoji: area.emoji,
        monster: monster.name,
        monsterRarity: monster.rarity,
        hp: scaledHp,
        damage: scaledDamage,
        baseGold: Math.floor(monster.goldReward * goldMultiplier),
        baseExp: Math.floor(monster.expReward * expMultiplier),
        rareDrop: rareDrop
      }
    }
  }

 /**
   * Get area progression display
   */
  static getAreaProgression(playerLevel) {
    const areas = Object.entries(EXPLORE_AREAS).map(([num, area]) => {
      const explored = playerLevel >= area.minLevel
      const current = playerLevel >= area.minLevel && playerLevel < area.minLevel + 5

      return {
        number: parseInt(num),
        name: area.name,
        emoji: area.emoji,
        minLevel: area.minLevel,
        explored: explored,
        current: current,
        monsters: area.monsters.map(m => `${m.name}(${m.rarity})`)
      }
    })

    return areas
  }

  /**
   * Verify monster defeat and calculate rewards
   */
  static calculateRewards(monster, playerStats, area, areaNumber) {
    let gold = monster.baseGold || 100
    let exp = monster.baseExp || 50

    // Stat bonus (higher damage = better rewards)
    const damageBonus = 1 + (playerStats.str / 100)
    gold = Math.floor(gold * damageBonus)
    exp = Math.floor(exp * damageBonus)

    // Luck bonus (chance for extra gold)
    if (Math.random() < (playerStats.luck || 1) * 0.05) {
      gold = Math.floor(gold * 1.5)
    }

    return {
      gold: gold,
      exp: exp,
      area: area.name,
      areaNumber: areaNumber
    }
  }
}

export { ExploreSystem, EXPLORE_AREAS, RARE_ITEMS }
