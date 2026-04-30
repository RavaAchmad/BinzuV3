export const RPG_NS = {
  players: 'rpg_players',
  battles: 'rpg_battles',
  sessions: 'rpg_sessions',
  meta: 'rpg_meta'
}

export const ENERGY_REGEN_MS = 5 * 60 * 1000
export const BATTLE_EXPIRE_MS = 30 * 60 * 1000

export const CLASSES = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    description: 'Tebal dan stabil untuk battle awal.',
    stats: { atk: 25, def: 12, int: 3, agi: 6, luk: 5 },
    growth: { maxHp: 15, atk: 3, def: 2 }
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    description: 'Magic damage tinggi, MP besar.',
    stats: { atk: 10, def: 6, int: 18, agi: 7, luk: 6 },
    growth: { maxMp: 15, int: 4, atk: 1 }
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    description: 'Cepat, crit lebih sering, drop lebih terasa.',
    stats: { atk: 18, def: 8, int: 5, agi: 16, luk: 12 },
    growth: { atk: 2, agi: 3, luk: 2 }
  },
  cleric: {
    id: 'cleric',
    name: 'Cleric',
    description: 'Lebih aman, sustain bagus untuk farming.',
    stats: { atk: 12, def: 10, int: 14, agi: 5, luk: 7 },
    growth: { maxHp: 8, maxMp: 10, int: 2, def: 1 }
  }
}

export const ITEMS = {
  potion: {
    id: 'potion',
    name: 'Potion',
    type: 'consumable',
    rarity: 'Common',
    price: 60,
    sellPrice: 18,
    use: { hp: 40 }
  },
  mana_potion: {
    id: 'mana_potion',
    name: 'Mana Potion',
    type: 'consumable',
    rarity: 'Common',
    price: 70,
    sellPrice: 20,
    use: { mp: 25 }
  },
  energy_potion: {
    id: 'energy_potion',
    name: 'Energy Potion',
    type: 'consumable',
    rarity: 'Uncommon',
    price: 180,
    sellPrice: 45,
    use: { energy: 5 }
  },
  slime_gel: {
    id: 'slime_gel',
    name: 'Slime Gel',
    type: 'material',
    rarity: 'Common',
    sellPrice: 8
  },
  wolf_fang: {
    id: 'wolf_fang',
    name: 'Wolf Fang',
    type: 'material',
    rarity: 'Uncommon',
    sellPrice: 18
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Iron Ore',
    type: 'material',
    rarity: 'Common',
    sellPrice: 14
  },
  wooden_sword: {
    id: 'wooden_sword',
    name: 'Wooden Sword',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'Common',
    price: 120,
    sellPrice: 30,
    stats: { atk: 3 }
  },
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'Uncommon',
    price: 450,
    sellPrice: 120,
    stats: { atk: 8 }
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'Leather Armor',
    type: 'equipment',
    slot: 'armor',
    rarity: 'Common',
    price: 140,
    sellPrice: 35,
    stats: { def: 3, maxHp: 10 }
  },
  iron_armor: {
    id: 'iron_armor',
    name: 'Iron Armor',
    type: 'equipment',
    slot: 'armor',
    rarity: 'Uncommon',
    price: 520,
    sellPrice: 140,
    stats: { def: 8, maxHp: 25 }
  }
}

export const SHOP_ITEMS = ['potion', 'mana_potion', 'wooden_sword', 'leather_armor', 'energy_potion']

export const MONSTERS = {
  slime: {
    id: 'slime',
    name: 'Slime',
    level: 1,
    hp: 30,
    atk: 5,
    def: 1,
    exp: 20,
    gold: 10,
    drops: [{ itemId: 'slime_gel', min: 1, max: 2, chance: 70 }, { itemId: 'potion', min: 1, max: 1, chance: 12 }]
  },
  forest_rat: {
    id: 'forest_rat',
    name: 'Forest Rat',
    level: 2,
    hp: 45,
    atk: 8,
    def: 2,
    exp: 30,
    gold: 15,
    drops: [{ itemId: 'slime_gel', min: 1, max: 1, chance: 30 }, { itemId: 'potion', min: 1, max: 1, chance: 10 }]
  },
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    level: 3,
    hp: 60,
    atk: 12,
    def: 4,
    exp: 45,
    gold: 25,
    drops: [{ itemId: 'iron_ore', min: 1, max: 2, chance: 35 }, { itemId: 'iron_sword', min: 1, max: 1, chance: 4 }]
  },
  wolf: {
    id: 'wolf',
    name: 'Wolf',
    level: 4,
    hp: 75,
    atk: 15,
    def: 5,
    exp: 60,
    gold: 35,
    drops: [{ itemId: 'wolf_fang', min: 1, max: 2, chance: 45 }, { itemId: 'leather_armor', min: 1, max: 1, chance: 5 }]
  }
}

export const QUESTS = {
  tutorial_slime: {
    id: 'tutorial_slime',
    name: 'Slime Problem',
    description: 'Kalahkan Slime 3x.',
    objective: { type: 'kill', target: 'slime', required: 3 },
    reward: { exp: 100, gold: 150, items: { potion: 3 } }
  },
  daily_hunter: {
    id: 'daily_hunter',
    name: 'Daily Hunt',
    description: 'Kalahkan monster apa saja 3x hari ini.',
    objective: { type: 'kill', target: 'any', required: 3 },
    reward: { exp: 80, gold: 120, items: { mana_potion: 1 } }
  }
}

export const EQUIPMENT_SLOTS = ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet', 'pet']
