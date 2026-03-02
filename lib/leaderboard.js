/**
 * Leaderboard System - Daily, Weekly, Seasonal
 * Tracks player stats across different timeframes
 */

export class LeaderboardManager {
    constructor() {
        this.storePath = 'data/leaderboards'
        this.timeframes = {
            DAILY: 86400000, // 24 jam
            WEEKLY: 604800000, // 7 hari
            SEASONAL: 15552000000 // 6 bulan
        }
    }

    initLeaderboard(db) {
        if (!db.leaderboards) {
            db.leaderboards = {
                daily: { timestamp: Date.now(), data: {} },
                weekly: { timestamp: Date.now(), data: {} },
                seasonal: { timestamp: Date.now(), data: {} },
                allTime: { data: {} }
            }
        }
        return db.leaderboards
    }

    updatePlayerStats(db, userId, stats = {}) {
        if (!db.leaderboards) this.initLeaderboard(db)

        const timeframes = ['daily', 'weekly', 'seasonal', 'allTime']
        for (const tf of timeframes) {
            if (!db.leaderboards[tf].data[userId]) {
                db.leaderboards[tf].data[userId] = {
                    name: '',
                    dungeonRuns: 0,
                    dungeonWins: 0,
                    expGained: 0,
                    moneyGained: 0,
                    bossKills: 0,
                    achievements: 0,
                    ...stats
                }
            } else {
                Object.assign(db.leaderboards[tf].data[userId], stats)
            }
        }
    }

    recordDungeonWin(db, userId, reward = {}) {
        this.updatePlayerStats(db, userId, {
            dungeonWins: (db.leaderboards.daily.data[userId]?.dungeonWins || 0) + 1,
            dungeonRuns: (db.leaderboards.daily.data[userId]?.dungeonRuns || 0) + 1,
            expGained: (db.leaderboards.daily.data[userId]?.expGained || 0) + (reward.exp || 0),
            moneyGained: (db.leaderboards.daily.data[userId]?.moneyGained || 0) + (reward.money || 0)
        })
    }

    checkResetNeeded(db) {
        const now = Date.now()
        
        // Reset Daily
        if (now - db.leaderboards.daily.timestamp >= this.timeframes.DAILY) {
            db.leaderboards.daily = { timestamp: now, data: {} }
        }
        
        // Reset Weekly
        if (now - db.leaderboards.weekly.timestamp >= this.timeframes.WEEKLY) {
            db.leaderboards.weekly = { timestamp: now, data: {} }
        }
        
        // Reset Seasonal
        if (now - db.leaderboards.seasonal.timestamp >= this.timeframes.SEASONAL) {
            db.leaderboards.seasonal = { timestamp: now, data: {} }
        }
    }

    getLeaderboard(db, timeframe = 'daily', category = 'dungeonWins', limit = 10) {
        if (!db.leaderboards || !db.leaderboards[timeframe]) return []

        const sorted = Object.entries(db.leaderboards[timeframe].data)
            .sort((a, b) => (b[1][category] || 0) - (a[1][category] || 0))
            .slice(0, limit)

        return sorted.map(([userId, data], index) => ({
            rank: index + 1,
            userId,
            ...data
        }))
    }

    getPlayerRank(db, userId, timeframe = 'daily', category = 'dungeonWins') {
        if (!db.leaderboards || !db.leaderboards[timeframe]) return null

        const sortedUsers = Object.entries(db.leaderboards[timeframe].data)
            .sort((a, b) => (b[1][category] || 0) - (a[1][category] || 0))
            .map(([uid]) => uid)

        const rank = sortedUsers.indexOf(userId) + 1
        return rank > 0 ? rank : null
    }

    formatLeaderboard(lb, title = '🏆 Leaderboard') {
        let text = `╭━━━━━━━━━━━━━━━╮\n┃ ${title}\n╰━━━━━━━━━━━━━━━╯\n\n`
        
        lb.forEach(entry => {
            const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`
            text += `${medal} *${entry.rank}. ${entry.name || 'Unknown'}*\n`
            text += `     ├─ Wins: ${entry.dungeonWins || 0}\n`
            text += `     ├─ Runs: ${entry.dungeonRuns || 0}\n`
            text += `     ├─ Exp: ${(entry.expGained || 0).toLocaleString('id-ID')}\n`
            text += `     └─ Money: ${(entry.moneyGained || 0).toLocaleString('id-ID')}\n\n`
        })
        
        return text
    }
}

export default new LeaderboardManager()
