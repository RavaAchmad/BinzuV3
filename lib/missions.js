/**
 * Daily Quest/Mission System
 * Provides rotating daily missions dengan rewards
 */

const missions = [
    {
        id: 'dungeon_beginner',
        name: 'Dungeon Novice',
        description: 'Selesaikan 3 Beginner Dungeon',
        objective: { type: 'dungeonRuns', target: 3, difficulty: 'BEGINNER' },
        rewards: { exp: 5000, money: 10000, diamond: 1 },
        difficulty: 'Easy'
    },
    {
        id: 'dungeon_hard',
        name: 'Dungeon Champion',
        description: 'Menangkan 2 Hard Dungeon',
        objective: { type: 'dungeonWins', target: 2, difficulty: 'HARD' },
        rewards: { exp: 15000, money: 50000, diamond: 3 },
        difficulty: 'Hard'
    },
    {
        id: 'farming_exp',
        name: 'Experience Hunter',
        description: 'Kumpulkan 50000 Exp',
        objective: { type: 'expGain', target: 50000 },
        rewards: { exp: 10000, money: 25000, emerald: 2 },
        difficulty: 'Medium'
    },
    {
        id: 'mining_resources',
        name: 'Resource Miner',
        description: 'Mine 50 Iron & 50 Stone',
        objective: { type: 'mining', target: 100 },
        rewards: { exp: 8000, money: 20000, iron: 100 },
        difficulty: 'Easy'
    },
    {
        id: 'fishing_catch',
        name: 'Master Fisherman',
        description: 'Tangkap 30 ikan',
        objective: { type: 'fishing', target: 30 },
        rewards: { exp: 7000, money: 15000, common: 5 },
        difficulty: 'Easy'
    },
    {
        id: 'crafting_items',
        name: 'Master Crafter',
        description: 'Craft 5 items berbeda',
        objective: { type: 'crafting', target: 5 },
        rewards: { exp: 12000, money: 30000, iron: 50, diamond: 1 },
        difficulty: 'Medium'
    },
    {
        id: 'boss_slayer',
        name: 'Boss Killer',
        description: 'Kalahkan 2 Boss Raid',
        objective: { type: 'bossKills', target: 2 },
        rewards: { exp: 25000, money: 100000, diamond: 5, legendary: 1 },
        difficulty: 'Extreme'
    },
    {
        id: 'achievement_unlock',
        name: 'Achievement Collector',
        description: 'Unlock 5 Achievements dalam sehari',
        objective: { type: 'achievements', target: 5 },
        rewards: { exp: 20000, money: 50000, diamond: 2 },
        difficulty: 'Hard'
    }
]

const dailyMissions = {
    getMissionOfTheDay(seed = new Date().toDateString()) {
        // Deterministic random based on date
        let hash = 0
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash
        }
        
        const index = Math.abs(hash) % missions.length
        return { ...missions[index], rotation: index }
    },

    getRandomMissions(count = 3) {
        const today = new Date().toDateString()
        const hash = today.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0)
            return a & a
        }, 0)

        const selected = []
        for (let i = 0; i < count; i++) {
            const idx = Math.abs(hash + i) % missions.length
            selected.push({ ...missions[idx], rotation: idx })
        }
        return selected
    },

    initPlayerMissions(user) {
        if (!user.dailyMissions) {
            user.dailyMissions = {
                completedToday: [],
                inProgress: [],
                lastReset: Date.now()
            }
        }

        const now = Date.now()
        const dayInMs = 86400000

        // Reset jika sudah 24 jam
        if (now - user.dailyMissions.lastReset > dayInMs) {
            user.dailyMissions.completedToday = []
            user.dailyMissions.inProgress = []
            user.dailyMissions.lastReset = now
        }

        return user.dailyMissions
    },

    startMission(user, missionId) {
        this.initPlayerMissions(user)
        
        const mission = missions.find(m => m.id === missionId)
        if (!mission) return false

        if (!user.dailyMissions.inProgress.includes(missionId)) {
            user.dailyMissions.inProgress.push({
                id: missionId,
                ...mission,
                progress: 0,
                startTime: Date.now()
            })
            return mission
        }
        return false
    },

    updateProgress(user, missionId, progress = 1) {
        const mission = user.dailyMissions?.inProgress?.find(m => m.id === missionId)
        if (mission) {
            mission.progress += progress
            
            if (mission.progress >= mission.objective.target) {
                return this.completeMission(user, missionId)
            }
            return mission
        }
        return null
    },

    completeMission(user, missionId) {
        const missionIdx = user.dailyMissions.inProgress.findIndex(m => m.id === missionId)
        if (missionIdx !== -1) {
            const completed = user.dailyMissions.inProgress[missionIdx]
            user.dailyMissions.inProgress.splice(missionIdx, 1)
            user.dailyMissions.completedToday.push(completed.id)
            return completed
        }
        return null
    },

    formatMission(mission) {
        return `
🎯 *${mission.name}* [${mission.difficulty}]
╞ ${mission.description}
╞ Target: ${mission.objective.target}
╠ 📊 Exp: +${mission.rewards.exp}
╠ 💹 Money: +${mission.rewards.money}
╠ 💎 Diamond: +${mission.rewards.diamond || 0}
╰ ⏰ Daily Reset: 24h
`
    }
}

export default dailyMissions
