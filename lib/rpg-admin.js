/**
 * RPG Admin Control System v2.0
 * Full season reset (wipe all RPG data) + MLBB-style tiered rewards
 */

const rpgAdmin = {
    settings: {
        rpgEnabled: true,
        seasonResetInterval: 2 * 30 * 24 * 60 * 60 * 1000, // 2 months
        lastSeasonReset: Date.now(),
        currentSeason: 1,
        diamondRateMultiplier: 1.0,
        expRateMultiplier: 1.0,
        moneyRateMultiplier: 1.0,
        eventActive: false,
        eventBonus: 1.0
    },

    // ==========================================
    // MLBB-Style Season Rewards (tiered by rank)
    // ==========================================
    seasonalRewards: {
        enabled: true,
        tiers: {
            // Rank 1 — "Mythical Glory" — Reward terbaik, eksklusif
            rank1: {
                title: '🏆 Mythical Glory',
                diamond: 500,
                emerald: 200,
                gold: 2000,
                legendary: 10,
                mythic: 15,
                potion: 50,
                money: 10000000,
                seasonTitle: 'Season Champion'
            },
            // Rank 2 — "Mythic"
            rank2: {
                title: '🥈 Mythic',
                diamond: 300,
                emerald: 100,
                gold: 1000,
                legendary: 5,
                mythic: 10,
                potion: 30,
                money: 5000000,
                seasonTitle: 'Season Elite'
            },
            // Rank 3 — "Legend"
            rank3: {
                title: '🥉 Legend',
                diamond: 150,
                emerald: 50,
                gold: 500,
                legendary: 3,
                mythic: 5,
                potion: 20,
                money: 2500000,
                seasonTitle: 'Season Legend'
            },
            // Top 10 — "Epic"
            top10: {
                title: '⭐ Epic',
                diamond: 75,
                emerald: 25,
                gold: 250,
                legendary: 1,
                mythic: 3,
                potion: 15,
                money: 1000000
            },
            // Top 25 — "Grandmaster"
            top25: {
                title: '🌟 Grandmaster',
                diamond: 40,
                emerald: 10,
                gold: 100,
                mythic: 2,
                potion: 10,
                money: 500000
            },
            // Top 50 — "Master"
            top50: {
                title: '✨ Master',
                diamond: 20,
                emerald: 5,
                gold: 50,
                uncommon: 3,
                potion: 5,
                money: 250000
            }
        }
    },

    // Properties that should NEVER be reset (identity & meta)
    PROTECTED_KEYS: new Set([
        'name', 'registered', 'regTime', 'age', 'banned', 'Banneduser',
        'BannedReason', 'premium', 'premiumTime', 'premiumDate', 'sewa',
        'warn', 'afk', 'afkReason', 'autolevelup', 'pasangan',
        // Season archive
        'seasonArchive', 'seasonRewards'
    ]),

    // Properties that reset to specific non-zero values
    RESET_DEFAULTS: {
        health: 100, healt: 100, stamina: 100, haus: 100, laper: 100,
        hero: 1, agility: 1, pancingan: 1, limit: 20, tigame: 50,
        fullatm: Infinity, lbars: '[▒▒▒▒▒▒▒▒▒]', rtrofi: 'Perunggu',
        job: 'Pengangguran', kingdom: true, role: 'Beginner',
        shield: false, gamemines: false
    },

    // ==========================================
    // CORE METHODS
    // ==========================================

    getSettings() {
        return { ...this.settings }
    },

    updateSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value
            return true
        }
        return false
    },

    isSeasonResetNeeded() {
        return (Date.now() - this.settings.lastSeasonReset) >= this.settings.seasonResetInterval
    },

    daysUntilSeasonReset() {
        const timePassed = Date.now() - this.settings.lastSeasonReset
        const timeUntilReset = this.settings.seasonResetInterval - timePassed
        return Math.ceil(timeUntilReset / (24 * 60 * 60 * 1000))
    },

    // ==========================================
    // RANKING SYSTEM
    // ==========================================

    /**
     * Build sorted ranking from all users in DB
     * Returns array of { userId, name, level, exp, money, diamond }
     */
    buildRanking(users) {
        return Object.entries(users)
            .filter(([id, u]) => u.registered && (u.exp > 0 || u.level > 0))
            .map(([id, u]) => ({
                userId: id,
                name: u.name || 'Unknown',
                level: u.level || 0,
                exp: u.exp || 0,
                money: u.money || 0,
                diamond: u.diamond || 0
            }))
            .sort((a, b) => b.level - a.level || b.exp - a.exp)
    },

    /**
     * Determine reward tier based on rank position
     */
    getRewardTier(rank) {
        if (rank === 1) return 'rank1'
        if (rank === 2) return 'rank2'
        if (rank === 3) return 'rank3'
        if (rank <= 10) return 'top10'
        if (rank <= 25) return 'top25'
        if (rank <= 50) return 'top50'
        return null
    },

    // ==========================================
    // SEASON RESET — FULL WIPE
    // ==========================================

    /**
     * Reset a single user's RPG data to fresh state
     * Keeps protected keys (name, registered, premium, etc.)
     */
    resetUserData(user) {
        const preserved = {}
        // Save protected values
        for (const key of this.PROTECTED_KEYS) {
            if (key in user) preserved[key] = user[key]
        }

        // Wipe all numeric/item properties to 0
        for (const key of Object.keys(user)) {
            if (this.PROTECTED_KEYS.has(key)) continue
            if (key in this.RESET_DEFAULTS) {
                user[key] = this.RESET_DEFAULTS[key]
            } else if (typeof user[key] === 'number') {
                user[key] = 0
            } else if (typeof user[key] === 'string' && key !== 'name' && key !== 'catatan') {
                // Don't wipe string identity fields
                if (!['skill', 'role', 'job', 'title', 'lbars', 'rtrofi', 'pasangan'].includes(key)) {
                    user[key] = ''
                }
            } else if (Array.isArray(user[key])) {
                user[key] = []
            } else if (typeof user[key] === 'object' && user[key] !== null) {
                // Reset cooldowns, inventory objects, etc.
                if (['cooldowns', 'cryptoPortfolio', 'cryptoBuyPrice', 'dailyMissions'].includes(key)) {
                    user[key] = key === 'cooldowns' ? {} : key === 'dailyMissions' ? null : {}
                }
            }
        }

        // Restore protected values
        for (const [key, val] of Object.entries(preserved)) {
            user[key] = val
        }

        // Ensure reset defaults
        for (const [key, val] of Object.entries(this.RESET_DEFAULTS)) {
            if (key in user) user[key] = val
        }
    },

    /**
     * Give rewards to a user based on rank tier
     * Returns the reward object given
     */
    giveSeasonReward(user, tierKey) {
        const tier = this.seasonalRewards.tiers[tierKey]
        if (!tier) return null

        const given = {}
        for (const [item, amount] of Object.entries(tier)) {
            if (item === 'title' || item === 'seasonTitle') continue
            if (item in user || typeof amount === 'number') {
                user[item] = (user[item] || 0) + amount
                given[item] = amount
            }
        }

        // Store season title badge
        if (tier.seasonTitle) {
            if (!user.seasonArchive) user.seasonArchive = []
            user.seasonArchive.push({
                season: this.settings.currentSeason,
                title: tier.seasonTitle,
                tier: tierKey,
                date: Date.now()
            })
        }

        return { tierTitle: tier.title, items: given, seasonTitle: tier.seasonTitle || null }
    },

    /**
     * Full season reset — archive, reward, wipe all users
     */
    executeSeasonReset(users, leaderboards) {
        const report = {
            success: true,
            season: this.settings.currentSeason,
            timestamp: Date.now(),
            actions: {}
        }

        try {
            // 1. Build ranking before wipe
            const ranking = this.buildRanking(users)
            report.actions.totalRanked = ranking.length
            report.actions.topPlayers = ranking.slice(0, 10).map((p, i) => ({
                rank: i + 1,
                ...p
            }))

            // 2. Archive season snapshot
            report.actions.archived = {
                season: this.settings.currentSeason,
                timestamp: Date.now(),
                top50: ranking.slice(0, 50),
                totalPlayers: Object.keys(users).length,
                seasonEnd: new Date().toISOString()
            }

            // Store archive in db
            if (!global.db.data.seasonArchive) global.db.data.seasonArchive = []
            global.db.data.seasonArchive.push(report.actions.archived)

            // 3. Distribute rewards BEFORE wipe (rewards survive the reset via seasonArchive)
            const rewardsGiven = []
            for (let i = 0; i < ranking.length && i < 50; i++) {
                const player = ranking[i]
                const tierKey = this.getRewardTier(i + 1)
                if (tierKey && users[player.userId]) {
                    // We give rewards after the wipe, so store them temporarily
                    rewardsGiven.push({
                        rank: i + 1,
                        userId: player.userId,
                        name: player.name,
                        tierKey,
                        level: player.level,
                        exp: player.exp
                    })
                }
            }

            // 4. FULL WIPE — Reset ALL users
            let wipedCount = 0
            for (const [userId, user] of Object.entries(users)) {
                this.resetUserData(user)
                wipedCount++
            }
            report.actions.wipedPlayers = wipedCount

            // 5. Apply rewards AFTER wipe (so rewarded users start fresh + rewards)
            const appliedRewards = []
            for (const entry of rewardsGiven) {
                const user = users[entry.userId]
                if (user) {
                    const reward = this.giveSeasonReward(user, entry.tierKey)
                    appliedRewards.push({
                        rank: entry.rank,
                        name: entry.name,
                        tierKey: entry.tierKey,
                        reward
                    })
                }
            }
            report.actions.rewardsApplied = appliedRewards

            // 6. Reset leaderboards
            const resetBoards = []
            if (leaderboards) {
                for (const board of ['daily', 'weekly', 'seasonal']) {
                    if (leaderboards[board]) {
                        leaderboards[board] = {}
                        resetBoards.push(board)
                    }
                }
            }
            report.actions.resetLeaderboards = resetBoards

            // 7. Increment season
            this.settings.currentSeason += 1
            this.settings.lastSeasonReset = Date.now()
            report.actions.newSeason = this.settings.currentSeason

            return report
        } catch (error) {
            report.success = false
            report.error = error.message
            return report
        }
    },

    // ==========================================
    // SEASON FIX — Undo/repair bad reset
    // ==========================================

    /**
     * Restore rewards for users who should have gotten them but didn't
     * Uses the seasonArchive to re-apply
     */
    fixSeasonRewards(users, targetSeason) {
        const archive = (global.db.data.seasonArchive || []).find(a => a.season === targetSeason)
        if (!archive) return { success: false, error: `Season ${targetSeason} archive not found` }

        const fixed = []
        const top50 = archive.top50 || []
        for (let i = 0; i < top50.length; i++) {
            const player = top50[i]
            const tierKey = this.getRewardTier(i + 1)
            if (tierKey && users[player.userId]) {
                // Check if user already got reward for this season
                const alreadyGot = (users[player.userId].seasonArchive || [])
                    .some(a => a.season === targetSeason)
                if (!alreadyGot) {
                    const reward = this.giveSeasonReward(users[player.userId], tierKey)
                    fixed.push({ rank: i + 1, name: player.name, userId: player.userId, reward })
                }
            }
        }

        return { success: true, fixed, season: targetSeason }
    },

    /**
     * Re-wipe a specific user (for manual fix)
     */
    fixResetUser(users, userId) {
        if (!users[userId]) return { success: false, error: 'User not found' }
        this.resetUserData(users[userId])
        return { success: true, userId }
    },

    // ==========================================
    // FORMATTING
    // ==========================================

    formatSettings() {
        const daysUntilReset = this.daysUntilSeasonReset()
        const resetDate = new Date(this.settings.lastSeasonReset + this.settings.seasonResetInterval)

        return `
⚙️ *RPG SETTINGS*

🎮 *Game Status:*
├─ RPG Enabled: ${this.settings.rpgEnabled ? '✅' : '❌'}
├─ Current Season: ${this.settings.currentSeason}
├─ Days Until Reset: ${daysUntilReset}
└─ Reset Date: ${resetDate.toLocaleDateString('id-ID')}

🎯 *Reward Multipliers:*
├─ Diamond Rate: ${this.settings.diamondRateMultiplier}x
├─ Exp Rate: ${this.settings.expRateMultiplier}x
└─ Money Rate: ${this.settings.moneyRateMultiplier}x

🎉 *Event Status:*
├─ Active: ${this.settings.eventActive ? '✅' : '❌'}
└─ Bonus: ${(this.settings.eventBonus - 1) * 100}% extra rewards

🏆 *Season Rewards (MLBB-Style):*
├─ #1 Mythical Glory: 500💎 + 200 Emerald + 10M Money
├─ #2 Mythic: 300💎 + 100 Emerald + 5M Money
├─ #3 Legend: 150💎 + 50 Emerald + 2.5M Money
├─ Top 10 Epic: 75💎 + 25 Emerald + 1M Money
├─ Top 25 Grandmaster: 40💎 + 10 Emerald + 500K
└─ Top 50 Master: 20💎 + 5 Emerald + 250K
`
    },

    formatSeasonResetPreview(users) {
        const ranking = this.buildRanking(users)
        const top10 = ranking.slice(0, 10)

        let text = `
🔄 *SEASON ${this.settings.currentSeason} RESET PREVIEW*

📊 *Top 10 Players:*
`
        const medals = ['🏆', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
        top10.forEach((p, idx) => {
            const tierKey = this.getRewardTier(idx + 1)
            const tier = this.seasonalRewards.tiers[tierKey]
            text += `${medals[idx]} *${p.name}* — Lvl ${p.level} | EXP: ${p.exp.toLocaleString('id-ID')}
   └─ Reward: ${tier?.title || 'None'} (${tier?.diamond || 0}💎 + ${tier?.money?.toLocaleString('id-ID') || 0} Money)
`
        })

        text += `
📋 *Total Eligible Players:* ${ranking.length}
📋 *Players Getting Rewards:* ${Math.min(ranking.length, 50)}

⚠️ *YANG AKAN TERJADI:*
✓ Semua data RPG user di-*WIPE* (level, money, items, dll)
✓ Data identitas tetap (name, registered, premium)
✓ Top 50 dapat reward season sesuai tier
✓ Archive season disimpan
✓ Leaderboard seasonal direset
✓ Season counter naik ke ${this.settings.currentSeason + 1}

_Ini tidak bisa di-undo! Gunakan season fix jika ada masalah._
`
        return text
    },

    formatRewardTable() {
        let text = `
🏆 *SEASON REWARD TIERS (MLBB-Style)*

🏆 *#1 Mythical Glory*
├─ 💎 500 Diamond + 200 Emerald
├─ 💰 10.000.000 Money + 2.000 Gold
├─ 📦 10 Legendary + 15 Mythic Crate
├─ 🧪 50 Potion
└─ 🎖️ Title: _Season Champion_

🥈 *#2 Mythic*
├─ 💎 300 Diamond + 100 Emerald
├─ 💰 5.000.000 Money + 1.000 Gold
├─ 📦 5 Legendary + 10 Mythic Crate
├─ 🧪 30 Potion
└─ 🎖️ Title: _Season Elite_

🥉 *#3 Legend*
├─ 💎 150 Diamond + 50 Emerald
├─ 💰 2.500.000 Money + 500 Gold
├─ 📦 3 Legendary + 5 Mythic Crate
├─ 🧪 20 Potion
└─ 🎖️ Title: _Season Legend_

⭐ *Top 4-10 Epic*
├─ 💎 75 Diamond + 25 Emerald
├─ 💰 1.000.000 Money + 250 Gold
├─ 📦 1 Legendary + 3 Mythic Crate
└─ 🧪 15 Potion

🌟 *Top 11-25 Grandmaster*
├─ 💎 40 Diamond + 10 Emerald
├─ 💰 500.000 Money + 100 Gold
├─ 📦 2 Mythic Crate
└─ 🧪 10 Potion

✨ *Top 26-50 Master*
├─ 💎 20 Diamond + 5 Emerald
├─ 💰 250.000 Money + 50 Gold
├─ 📦 3 Uncommon Crate
└─ 🧪 5 Potion
`
        return text
    }
}

export default rpgAdmin
