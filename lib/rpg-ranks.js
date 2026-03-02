/**
 * RPG Rank System - Dungeon Difficulty & Scaling
 * Menentukan tier difficulty dungeon berdasarkan level player
 */

const dungeonRanks = {
    BEGINNER: {
        name: '🟢 Beginner Dungeon',
        minLevel: 1,
        maxLevel: 20,
        multiplier: 0.5,
        healthScaling: 1,
        difficultyDesc: 'Mudah - Sempurna untuk pemula',
        enemyStats: {
            health: 50,
            damage: 5,
            defense: 1
        },
        rewards: {
            expMult: 1,
            moneyMult: 1,
            itemDropRate: 1
        }
    },
    NORMAL: {
        name: '🟡 Normal Dungeon',
        minLevel: 21,
        maxLevel: 50,
        multiplier: 1,
        healthScaling: 1.2,
        difficultyDesc: 'Sedang - Tantangan yang seimbang',
        enemyStats: {
            health: 100,
            damage: 10,
            defense: 3
        },
        rewards: {
            expMult: 1.5,
            moneyMult: 1.5,
            itemDropRate: 1.2
        }
    },
    HARD: {
        name: '🔴 Hard Dungeon',
        minLevel: 51,
        maxLevel: 100,
        multiplier: 1.5,
        healthScaling: 1.5,
        difficultyDesc: 'Sulit - Untuk pemain berpengalaman',
        enemyStats: {
            health: 200,
            damage: 20,
            defense: 7
        },
        rewards: {
            expMult: 2.5,
            moneyMult: 2.5,
            itemDropRate: 2
        }
    },
    NIGHTMARE: {
        name: '⚫ Nightmare Dungeon',
        minLevel: 101,
        maxLevel: 200,
        multiplier: 2,
        healthScaling: 2,
        difficultyDesc: 'Ekstrim - Hanya untuk legendary player',
        enemyStats: {
            health: 400,
            damage: 40,
            defense: 15
        },
        rewards: {
            expMult: 5,
            moneyMult: 5,
            itemDropRate: 3.5
        }
    },
    INFERNO: {
        name: '💀 Inferno Dungeon',
        minLevel: 201,
        maxLevel: Infinity,
        multiplier: 3,
        healthScaling: 3,
        difficultyDesc: 'Impossible - Untuk elite players saja',
        enemyStats: {
            health: 800,
            damage: 80,
            defense: 30
        },
        rewards: {
            expMult: 10,
            moneyMult: 10,
            itemDropRate: 5
        }
    }
}

export function getDungeonRank(level) {
    for (const [key, rank] of Object.entries(dungeonRanks)) {
        if (level >= rank.minLevel && level <= rank.maxLevel) {
            return { key, ...rank }
        }
    }
    return { key: 'INFERNO', ...dungeonRanks.INFERNO }
}

export function calculateScaledRewards(baseRewards, rank) {
    return {
        ...baseRewards,
        exp: Math.floor(baseRewards.exp * rank.rewards.expMult),
        money: Math.floor(baseRewards.money * rank.rewards.moneyMult),
        itemDropRate: rank.rewards.itemDropRate
    }
}

export function calculateDamage(baseDamage, rank) {
    return Math.floor(baseDamage * rank.multiplier)
}

export default { getDungeonRank, calculateScaledRewards, calculateDamage }
