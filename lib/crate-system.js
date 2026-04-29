/**
 * Enhanced Crate System with Luck, Pity, and Smart Drops
 * Features: Luck multiplier, Guaranteed pity counter, Daily bonuses
 */

const crateSystem = {
    playerLuck: {},
    playerPity: {},
    playerDaily: {},

    /**
     * Initialize player luck tracking
     */
    initLuck(userId) {
        if (!this.playerLuck[userId]) {
            this.playerLuck[userId] = {
                streak: 0,
                multiplier: 1.0,
                lastOpenTime: 0,
                totalOpens: 0
            }
        }
        return this.playerLuck[userId]
    },

    /**
     * Initialize pity counter for guaranteed rewards
     */
    initPity(userId) {
        if (!this.playerPity[userId]) {
            this.playerPity[userId] = {
                common: 0,
                uncommon: 0,
                mythic: 0,
                legendary: 0,
                guaranteeThresholds: {
                    common: 15,
                    uncommon: 25,
                    mythic: 60,
                    legendary: 200
                }
            }
        }
        return this.playerPity[userId]
    },

    /**
     * Initialize daily bonus tracking
     */
    initDaily(userId) {
        if (!this.playerDaily[userId]) {
            this.playerDaily[userId] = {
                lastDailyBonus: 0,
                dailyOpenCount: 0,
                hasClaimedBonus: false
            }
        }
        return this.playerDaily[userId]
    },

    normalizeOpenCount(count = 1) {
        const parsed = parseInt(count, 10)
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
    },

    /**
     * Update luck multiplier based on consecutive opens
     */
    updateLuck(userId, count = 1) {
        const luck = this.initLuck(userId)
        const now = Date.now()
        const openCount = this.normalizeOpenCount(count)
        
        // Reset streak if 45 minutes have passed
        if (now - luck.lastOpenTime > 2700000) {
            luck.streak = 0
            luck.multiplier = 1.0
        }

        luck.streak += openCount
        luck.lastOpenTime = now
        luck.totalOpens += openCount

        // Luck multiplier: max 2.5x at 50 streak
        luck.multiplier = Math.min(2.5, 1.0 + (luck.streak * 0.03))

        return luck
    },

    /**
     * Check and apply pity guarantee
     */
    checkPityGuarantee(userId, crateType) {
        const pity = this.initPity(userId)
        pity[crateType] = (pity[crateType] || 0) + 1

        const threshold = pity.guaranteeThresholds[crateType]
        
        if (pity[crateType] >= threshold) {
            pity[crateType] = 0
            
            const guarantees = {
                common: { type: 'crate_drop', item: crateType, amount: 3 },
                uncommon: { type: 'crate_drop', item: crateType, amount: 2 },
                mythic: { type: 'mix', items: { mythic: 1, diamond: 5, emerald: 3 } },
                legendary: { type: 'mix', items: { legendary: 1, diamond: 10, emerald: 5 } }
            }
            
            return guarantees[crateType]
        }
        
        return null
    },

    /**
     * Get daily first-open bonus
     */
    getDailyBonus(userId) {
        const daily = this.initDaily(userId)
        const now = Date.now()
        const lastDaily = daily.lastDailyBonus
        
        // Reset daily counter at midnight
        const today = new Date().toDateString()
        
        if (!daily.lastDate || daily.lastDate !== today) {
            daily.lastDate = today
            daily.dailyOpenCount = 0
            daily.hasClaimedBonus = false
        }

        // First open of the day gets 100% bonus
        if (daily.dailyOpenCount === 0 && !daily.hasClaimedBonus) {
            daily.hasClaimedBonus = true
            daily.dailyOpenCount += 1
            return {
                bonus: 1.5,
                message: '🎉 FIRST OPEN BONUS: +50% rewards!',
                type: 'daily'
            }
        }

        return null
    },

    /**
     * Calculate reward with all multipliers
     */
    calculateReward(baseAmount, userId) {
        const luck = this.initLuck(userId)
        const daily = this.getDailyBonus(userId)
        
        let multiplier = luck.multiplier
        if (daily && daily.bonus) {
            multiplier *= daily.bonus
        }
        
        return Math.floor(baseAmount * multiplier)
    },

    /**
     * Format luck status display
     */
    getLuckStatusDisplay(userId) {
        const luck = this.initLuck(userId)
        const streakPercent = (luck.streak / 50) * 100
        const bars = '█'.repeat(Math.min(10, Math.floor(streakPercent / 10))) + 
                    '░'.repeat(Math.max(0, 10 - Math.floor(streakPercent / 10)))
        
        return `
🍀 *Luck Status:*
├─ Streak: ${luck.streak}/50
├─ Multiplier: ${luck.multiplier.toFixed(2)}x
├─ Total Opens: ${luck.totalOpens}
└─ ${bars} ${Math.min(100, Math.floor(streakPercent))}%
`
    },

    /**
     * Format pity counter display
     */
    getPityStatusDisplay(userId, crateType) {
        const pity = this.initPity(userId)
        const current = pity[crateType] || 0
        const guarantee = pity.guaranteeThresholds[crateType]
        const progress = Math.floor((current / guarantee) * 100)
        const bars = '█'.repeat(Math.floor(progress / 10)) + 
                    '░'.repeat(10 - Math.floor(progress / 10))
        
        return `
📊 *Pity Counter* (${crateType}):
├─ Progress: ${current}/${guarantee}
├─ ${bars} ${progress}%
└─ Guaranteed in: ${Math.max(0, guarantee - current)} more opens
`
    },

    /**
     * Get rarity tier emoji
     */
    getRarityEmoji(rarity) {
        const emojis = {
            'trash': '🗑️',
            'common': '⚪',
            'uncommon': '🟢',
            'rare': '🔵',
            'mythic': '⚫',
            'legendary': '👑',
            'diamond': '💎',
            'emerald': '💚',
            'gold': '🟡'
        }
        return emojis[rarity] || '📦'
    },

    /**
     * Compatibility alias for instant opening status.
     */
    getOpeningSummary(count, crateType = '') {
        const openCount = this.normalizeOpenCount(count)
        const label = crateType ? `${crateType} crate` : 'crate'
        return `Instant open: ${openCount}x ${label} diproses sekaligus tanpa animasi.`
    },

    getOpeningAnimation(count, crateType = '') {
        return this.getOpeningSummary(count, crateType)
    }
}

export default crateSystem
