/**
 * RPG Admin Control System
 * Owner commands to manage RPG settings, rewards, and seasonal resets
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

    seasonalRewards: {
        enabled: true,
        topPlayers: 3, // Reward top 3 players
        rewards: {
            rank1: { diamond: 100, emerald: 50, gold: 500, legendary: 5 },
            rank2: { diamond: 50, emerald: 25, gold: 250, legendary: 3 },
            rank3: { diamond: 25, emerald: 10, gold: 100, legendary: 1 }
        }
    },

    /**
     * Get current RPG settings
     */
    getSettings() {
        return { ...this.settings }
    },

    /**
     * Update RPG setting
     */
    updateSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value
            return true
        }
        return false
    },

    /**
     * Check if season reset is needed
     */
    isSeasonResetNeeded() {
        return (Date.now() - this.settings.lastSeasonReset) >= this.settings.seasonResetInterval
    },

    /**
     * Calculate days until next season reset
     */
    daysUntilSeasonReset() {
        const timePassed = Date.now() - this.settings.lastSeasonReset
        const timeUntilReset = this.settings.seasonResetInterval - timePassed
        return Math.ceil(timeUntilReset / (24 * 60 * 60 * 1000))
    },

    /**
     * Get top players from leaderboard (requires leaderboard data)
     */
    getTopPlayers(leaderboardData, limit = 10) {
        if (!leaderboardData || leaderboardData.length === 0) return []
        return leaderboardData.slice(0, limit)
    },

    /**
     * Prepare season reset report
     */
    prepareSeasonReport(users, leaderboardData) {
        const topPlayers = this.getTopPlayers(leaderboardData, 3)
        const totalPlayers = Object.keys(users).length
        const totalExp = Object.values(users).reduce((sum, u) => sum + (u.exp || 0), 0)
        const totalMoney = Object.values(users).reduce((sum, u) => sum + (u.money || 0), 0)

        return {
            season: this.settings.currentSeason,
            resetDate: new Date().toLocaleDateString('id-ID'),
            totalPlayers,
            totalExp: totalExp.toLocaleString('id-ID'),
            totalMoney: totalMoney.toLocaleString('id-ID'),
            topPlayers: topPlayers.map((p, idx) => ({
                rank: idx + 1,
                ...p
            }))
        }
    },

    /**
     * Apply seasonal rewards to top players
     */
    applySeasonalRewards(users, leaderboardData) {
        if (!this.seasonalRewards.enabled) return []

        const topPlayers = this.getTopPlayers(leaderboardData, this.seasonalRewards.topPlayers)
        const rewards = []

        topPlayers.forEach((player, idx) => {
            const rankKey = `rank${idx + 1}`
            if (this.seasonalRewards.rewards[rankKey]) {
                const reward = this.seasonalRewards.rewards[rankKey]
                const userId = player.userId || player.id
                
                if (users[userId]) {
                    Object.entries(reward).forEach(([item, amount]) => {
                        users[userId][item] = (users[userId][item] || 0) + amount
                    })
                    
                    rewards.push({
                        rank: idx + 1,
                        playerId: userId,
                        playerName: player.name || 'Unknown',
                        reward: reward
                    })
                }
            }
        })

        return rewards
    },

    /**
     * Reset daily mission counters for all players
     */
    resetDailyMissions(users) {
        let count = 0
        Object.values(users).forEach(user => {
            if (user.dailyMissions) {
                user.dailyMissions.completedToday = 0
                user.dailyMissions.lastReset = Date.now()
                count++
            }
        })
        return count
    },

    /**
     * Archive season data
     */
    archiveSeasonData(leaderboardData) {
        return {
            season: this.settings.currentSeason,
            timestamp: Date.now(),
            leaderboardSnapshot: [...leaderboardData],
            seasonEnd: new Date().toISOString()
        }
    },

    /**
     * Reset seasonal leaderboards (keep alltime)
     */
    resetSeasonalLeaderboards(leaderboards) {
        const reset = []
        if (leaderboards.daily) {
            leaderboards.daily = {}
            reset.push('daily')
        }
        if (leaderboards.weekly) {
            leaderboards.weekly = {}
            reset.push('weekly')
        }
        if (leaderboards.seasonal) {
            leaderboards.seasonal = {}
            reset.push('seasonal')
        }
        return reset
    },

    /**
     * Full season reset workflow
     */
    executeSeasonReset(users, leaderboardData, leaderboards) {
        const report = {
            success: true,
            season: this.settings.currentSeason,
            timestamp: Date.now(),
            actions: {}
        }

        try {
            // Archive current season data
            report.actions.archived = this.archiveSeasonData(leaderboardData)

            // Get top players before reset
            const topPlayers = this.getTopPlayers(leaderboardData, 3)
            report.actions.topPlayers = topPlayers

            // Apply rewards to top 3 players
            const rewards = this.applySeasonalRewards(users, leaderboardData)
            report.actions.rewardsApplied = rewards

            // Reset leaderboards (NOT alltime)
            const resetBoards = this.resetSeasonalLeaderboards(leaderboards)
            report.actions.resetLeaderboards = resetBoards

            // Reset daily mission counters
            const missionResets = this.resetDailyMissions(users)
            report.actions.missionsReset = missionResets

            // Increment season counter
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

    /**
     * Format settings display
     */
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

🏆 *Seasonal Rewards:*
├─ Enabled: ${this.seasonalRewards.enabled ? '✅' : '❌'}
├─ Top Players: ${this.seasonalRewards.topPlayers}
└─ Ready for distribution
`
    },

    /**
     * Format season reset preview
     */
    formatSeasonResetPreview(leaderboardData) {
        const topPlayers = this.getTopPlayers(leaderboardData, 3)

        let text = `
🔄 *SEASON RESET PREVIEW*

📊 *Top Players (Will Receive Rewards):*
`
        topPlayers.forEach((p, idx) => {
            const reward = this.seasonalRewards.rewards[`rank${idx + 1}`]
            text += `
${idx + 1}. ${p.name || 'Unknown'} (Lvl ${p.level})
   └─ Rewards: ${JSON.stringify(reward).replace(/[{}\"]/g, '')}
`
        })

        text += `

⚙️ *What Will Happen:*
✓ Season data archived
✓ Rewards given to top 3
✓ Daily/Weekly/Seasonal leaderboards reset
✓ All-time leaderboard kept
✓ Daily missions reset
✓ Season counter incremented to ${this.settings.currentSeason + 1}

⏰ *Confirm Reset?*
This action cannot be undone!
`
        return text
    }
}

export default rpgAdmin
