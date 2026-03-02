/**
 * Enhanced Tool & Item Upgrade System
 * Better scaling, visible stat improvements, exponential progression
 */

const toolSystem = {
    tools: {
        fishingrod: {
            name: 'Fishing Rod',
            emoji: '🎣',
            maxLevel: 10,
            baseStats: {
                catchRate: 35,    // % chance to catch
                speedBonus: 1.0,   // speed multiplier
                durability: 100,
                successExpBonus: 0
            },
            statGrowth: {
                catchRate: 5,      // +5% per level
                speedBonus: 0.08,  // +8% per level
                durability: 80,    // +80 per level
                successExpBonus: 50 // +50 exp per level
            },
            description: 'Catch more fish with higher success rate'
        },
        pickaxe: {
            name: 'Pickaxe',
            emoji: '⛏️',
            maxLevel: 10,
            baseStats: {
                mineRate: 40,
                speedBonus: 1.0,
                durability: 120,
                damageBonus: 0
            },
            statGrowth: {
                mineRate: 6,
                speedBonus: 0.1,
                durability: 100,
                damageBonus: 8
            },
            description: 'Mine rocks faster and get better ore quality'
        },
        sword: {
            name: 'Sword',
            emoji: '⚔️',
            maxLevel: 10,
            baseStats: {
                damage: 50,
                critChance: 5,
                durability: 150,
                healBonus: 0
            },
            statGrowth: {
                damage: 15,        // +15 damage per level (1-5), then +8 (6-10)
                critChance: 2,     // +2% crit per level (1-5), then +0.5% (6-10) - CAPS AT 20%
                durability: 120,
                healBonus: 10      // +10 per level (1-5), +0.5% per level (6-10) - SOFT CAP 50 HP
            },
            description: 'Stronger combat with high damage and critical strikes'
        },
        armor: {
            name: 'Armor',
            emoji: '🛡️',
            maxLevel: 10,
            baseStats: {
                defense: 20,
                damageReduction: 5,  // % damage reduction
                durability: 200,
                blockChance: 0
            },
            statGrowth: {
                defense: 8,
                damageReduction: 1.5,
                durability: 150,
                blockChance: 2       // +2% block chance per level
            },
            description: 'Protect yourself with better defense and damage reduction'
        },
        atm: {
            name: 'ATM',
            emoji: '🏧',
            maxLevel: 100,
            baseStats: {
                moneyCapacity: 500000000,    // Base max money
                interestRate: 2,              // % interest per hour - CAPPED AT 5% MAX
                withdrawSpeed: 1.0,
                bonusMoneyMultiplier: 1.0
            },
            statGrowth: {
                moneyCapacity: 50000000,      // +50M per level
                interestRate: 0.025,          // +0.025% per level (CAPPED - diminishing after lvl 120)
                withdrawSpeed: 0.03,          // +3% per level
                bonusMoneyMultiplier: 0.005  // +0.5% per level (DIMINISHING - max 1.5x)
            },
            description: 'Store more money with better interest rates and faster withdrawals'
        }
    },

    /**
     * Calculate upgrade cost with PROGRESSIVE exponential scaling
     * Level 1-5: 1.4x per level
     * Level 6-10: 1.6x per level
     * Level 11+: 1.8x per level
     */
    getUpgradeCost(tool, currentLevel) {
        const data = this.tools[tool]
        if (!data) return null

        // Determine multiplier based on level band
        let multiplier
        if (currentLevel < 5) {
            multiplier = Math.pow(1.4, currentLevel)
        } else if (currentLevel < 10) {
            // Levels 6-10: continue from level 5's cost with 1.6x
            const level5Cost = Math.pow(1.4, 5)
            multiplier = level5Cost * Math.pow(1.6, currentLevel - 5)
        } else {
            // Levels 11+: continue from level 10's cost with 1.8x
            const level5Cost = Math.pow(1.4, 5)
            const level10Cost = level5Cost * Math.pow(1.6, 5)
            multiplier = level10Cost * Math.pow(1.8, currentLevel - 10)
        }

        const costs = {
            fishingrod: {
                wood: Math.floor(150 * multiplier),
                string: Math.floor(150 * multiplier),
                money: Math.floor(2000000 * multiplier)
            },
            pickaxe: {
                rock: Math.floor(300 * multiplier),
                wood: Math.floor(200 * multiplier),
                money: Math.floor(2500000 * multiplier)
            },
            sword: {
                iron: Math.floor(300 * multiplier),
                wood: Math.floor(200 * multiplier),
                money: Math.floor(2000000 * multiplier)
            },
            armor: {
                diamond: Math.floor(3 * multiplier),
                wood: Math.floor(200 * multiplier),
                money: Math.floor(2000000 * multiplier)
            },
            atm: {
                diamond: Math.floor(2 * multiplier),
                emerald: Math.floor(8 * multiplier),
                money: Math.floor(50000 * multiplier)
            }
        }

        return costs[tool] || null
    },

    /**
     * Calculate tool stats at specific level WITH CAPS & DIMINISHING RETURNS
     */
    getStats(tool, level) {
        const data = this.tools[tool]
        if (!data) return null

        const stats = { ...data.baseStats }
        
        // Apply growth for each level with tool-specific caps
        for (let i = 1; i < level; i++) {
            for (const [stat, growth] of Object.entries(data.statGrowth)) {
                if (tool === 'sword') {
                    // SWORD: Damage diminishes after level 5
                    if (stat === 'damage') {
                        stats[stat] += i <= 5 ? 15 : 8
                    }
                    // SWORD: Crit caps at 20% with diminishing return
                    else if (stat === 'critChance') {
                        const newVal = stats[stat] + (i <= 5 ? 2 : 0.5)
                        stats[stat] = Math.min(newVal, 20)
                    }
                    // SWORD: Heal steal soft cap at 50 HP (diminishing after 50)
                    else if (stat === 'healBonus') {
                        if (stats[stat] < 50) {
                            stats[stat] += i <= 5 ? 10 : Math.min(5, 50 - stats[stat])
                        } else {
                            // Already at soft cap, minimal growth
                            stats[stat] += 0.1
                        }
                    } else {
                        stats[stat] += growth
                    }
                } else if (tool === 'atm') {
                    // ATM: Interest CAPPED at 5% max
                    if (stat === 'interestRate') {
                        const newVal = stats[stat] + growth
                        stats[stat] = Math.min(newVal, 5)
                    }
                    // ATM: Money multiplier CAPPED at 1.5x max (diminishing return)
                    else if (stat === 'bonusMoneyMultiplier') {
                        const newVal = stats[stat] + growth
                        stats[stat] = Math.min(newVal, 1.5)
                    } else {
                        stats[stat] += growth
                    }
                } else {
                    // All other tools: normal growth
                    stats[stat] += growth
                }
            }
        }

        return stats
    },

    /**
     * Format tool upgrade preview
     */
    formatUpgradePreview(tool, currentLevel, user) {
        const data = this.tools[tool]
        if (!data) return null

        if (currentLevel >= data.maxLevel) {
            return `
${data.emoji} *${data.name}* - LEVEL MAX
Already at maximum level (${data.maxLevel})!
`
        }

        const cost = this.getUpgradeCost(tool, currentLevel)
        const currentStats = this.getStats(tool, currentLevel)
        const nextStats = this.getStats(tool, currentLevel + 1)

        let preview = `
${data.emoji} *${data.name} Upgrade Preview*
━━━━━━━━━━━━━━━━━━━
📊 Level ${currentLevel} → Level ${currentLevel + 1}

*Current Stats:*
`
        for (const [stat, value] of Object.entries(currentStats)) {
            preview += `├─ ${stat}: ${typeof value === 'number' ? value.toLocaleString('id-ID') : value}\n`
        }

        preview += '\n*After Upgrade:*\n'
        for (const [stat, value] of Object.entries(nextStats)) {
            const improvement = value - currentStats[stat]
            const percent = ((improvement / currentStats[stat]) * 100).toFixed(1)
            preview += `├─ ${stat}: ${value.toLocaleString('id-ID')} (+${improvement} / +${percent}%)\n`
        }

        preview += `
━━━━━━━━━━━━━━━━━━━
💰 *Upgrade Cost:*
`
        for (const [item, amount] of Object.entries(cost)) {
            const userHas = user[item] || 0
            const canAfford = userHas >= amount
            preview += `${canAfford ? '✅' : '❌'} ${item}: ${amount.toLocaleString('id-ID')} (${userHas.toLocaleString('id-ID')})\n`
        }

        preview += `
━━━━━━━━━━━━━━━━━━━
*Total Improvement Score: ${this.calculateImprovementScore(currentStats, nextStats).toFixed(2)}*
`
        return preview
    },

    /**
     * Calculate improvement score (0-100)
     */
    calculateImprovementScore(current, next) {
        let totalScore = 0
        for (const [stat, oldValue] of Object.entries(current)) {
            if (typeof oldValue === 'number') {
                const improvement = ((next[stat] - oldValue) / oldValue) * 100
                totalScore += Math.min(improvement, 50) // Cap at 50% per stat
            }
        }
        return totalScore / Object.keys(current).length
    },

    /**
     * Format tool stats display
     */
    formatToolStats(tool, level) {
        const data = this.tools[tool]
        if (!data) return null

        const stats = this.getStats(tool, level)
        const levelBar = '█'.repeat(Math.floor(level / 2)) + '░'.repeat(5 - Math.floor(level / 2))

        let display = `
${data.emoji} *${data.name}*
Level: ${level}/${data.maxLevel} ${levelBar}
${data.description}

📈 *Statistics:*
`
        for (const [stat, value] of Object.entries(stats)) {
            display += `├─ ${stat}: ${typeof value === 'number' ? value.toLocaleString('id-ID') : value}\n`
        }

        return display
    },

    /**
     * Get tier color/emoji for level
     */
    getTierEmoji(level, maxLevel) {
        const percent = (level / maxLevel) * 100
        if (percent >= 90) return '👑' // Legendary
        if (percent >= 70) return '💎' // Mythic
        if (percent >= 50) return '⚫' // Epic
        if (percent >= 25) return '🔵' // Rare
        return '🟢'                    // Common
    }
}

export default toolSystem
