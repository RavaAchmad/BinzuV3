/**
 * AI-Generated Auto-Mission Tracking System
 * Monitors user activity across plugins and generates dynamic missions
 * No JSON dependency - all logic-based
 */

const activityTypes = {
    dungeonRuns: { name: 'Dungeon Runs', emoji: '🏰', category: 'combat' },
    dungeonWins: { name: 'Dungeon Wins', emoji: '✨', category: 'combat' },
    bossKills: { name: 'Boss Defeats', emoji: '👹', category: 'combat' },
    mining: { name: 'Mining Sessions', emoji: '⛏️', category: 'gathering' },
    fishing: { name: 'Fishing Catches', emoji: '🎣', category: 'gathering' },
    crafting: { name: 'Items Crafted', emoji: '🔨', category: 'crafting' },
    garden: { name: 'Plants Grown', emoji: '🌾', category: 'farming' },
    expGain: { name: 'EXP Earned', emoji: '✨', category: 'leveling' },
    moneyGain: { name: 'Money Earned', emoji: '💰', category: 'economy' },
    skillLevelup: { name: 'Skill Upgrades', emoji: '⚔️', category: 'progression' },
    relationships: { name: 'Relationship Points', emoji: '💕', category: 'social' },
    gamePlayed: { name: 'Games Played', emoji: '🎮', category: 'entertainment' }
}

const missionGenerator = {
    /**
     * Initialize mission tracking for user
     */
    initMissions(user) {
        if (!user.missionTracker) {
            user.missionTracker = {
                dailyMissions: [],
                completedToday: [],
                activityLog: {},
                lastReset: Date.now()
            }
        }

        // Reset if 24 hours passed
        const dayInMs = 86400000
        if (Date.now() - user.missionTracker.lastReset > dayInMs) {
            user.missionTracker.dailyMissions = this.generateDailyMissions()
            user.missionTracker.completedToday = []
            user.missionTracker.lastReset = Date.now()
        }

        return user.missionTracker
    },

    /**
     * Generate daily missions based on user stats and activity
     */
    generateDailyMissions() {
        const today = new Date().toDateString()
        const hashSeed = today.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0)
            return a & a
        }, 0)

        const missions = [
            this.generateCombatMission(hashSeed),
            this.generateGatheringMission(hashSeed),
            this.generateProgressionMission(hashSeed)
        ]

        return missions
    },

    generateCombatMission(seed) {
        const combatTypes = [
            { type: 'dungeonWins', target: 2, reward: 5000 },
            { type: 'dungeonWins', target: 3, reward: 7500 },
            { type: 'bossKills', target: 1, reward: 10000 }
        ]
        const selected = combatTypes[Math.abs(seed) % combatTypes.length]

        return {
            id: 'daily_combat_' + Date.now(),
            name: `${activityTypes[selected.type].emoji} Combat Challenge`,
            description: `Complete ${selected.target} ${selected.type}`,
            type: selected.type,
            target: selected.target,
            current: 0,
            rewards: { exp: selected.reward, money: selected.reward / 2 },
            difficulty: 'Medium',
            timeLeft: 86400000
        }
    },

    generateGatheringMission(seed) {
        const gatheringTypes = [
            { type: 'mining', target: 50, reward: 3000 },
            { type: 'fishing', target: 30, reward: 3000 },
            { type: 'crafting', target: 5, reward: 4000 }
        ]
        const selected = gatheringTypes[(Math.abs(seed) + 1) % gatheringTypes.length]

        return {
            id: 'daily_gathering_' + Date.now(),
            name: `${activityTypes[selected.type].emoji} Resource Gathering`,
            description: `${selected.type} ${selected.target} times`,
            type: selected.type,
            target: selected.target,
            current: 0,
            rewards: { exp: selected.reward * 0.7, money: selected.reward },
            difficulty: 'Easy',
            timeLeft: 86400000
        }
    },

    generateProgressionMission(seed) {
        const progressionTypes = [
            { type: 'skillLevelup', target: 1, reward: 5000 },
            { type: 'expGain', target: 50000, reward: 5000 },
            { type: 'moneyGain', target: 100000, reward: 2000 }
        ]
        const selected = progressionTypes[(Math.abs(seed) + 2) % progressionTypes.length]

        return {
            id: 'daily_progress_' + Date.now(),
            name: `${activityTypes[selected.type].emoji} Progression Goal`,
            description: `Gain ${selected.target} ${selected.type}`,
            type: selected.type,
            target: selected.target,
            current: 0,
            rewards: { exp: selected.reward, money: selected.reward * 1.5 },
            difficulty: 'Hard',
            timeLeft: 86400000
        }
    },

    /**
     * Track activity from ongoing plugin events
     */
    trackActivity(user, activityType, amount = 1) {
        const tracker = this.initMissions(user)

        // Update activity log
        if (!tracker.activityLog[activityType]) {
            tracker.activityLog[activityType] = 0
        }
        tracker.activityLog[activityType] += amount

        // Check mission progress
        if (tracker.dailyMissions && tracker.dailyMissions.length > 0) {
            tracker.dailyMissions.forEach(mission => {
                if (mission.type === activityType && mission.current < mission.target) {
                    mission.current = Math.min(
                        tracker.activityLog[activityType] || 0,
                        mission.target
                    )

                    // Auto-complete if target is reached
                    if (mission.current >= mission.target && !tracker.completedToday.includes(mission.id)) {
                        tracker.completedToday.push(mission.id)
                        this.rewardMission(user, mission)
                    }
                }
            })
        }
    },

    /**
     * Apply mission rewards to user
     */
    rewardMission(user, mission) {
        if (!mission.rewards) return false

        user.exp = (user.exp || 0) + mission.rewards.exp
        user.money = (user.money || 0) + mission.rewards.money
        user.diamond = (user.diamond || 0) + (mission.rewards.diamond || 0)

        // Add achievement tracker
        if (!user.achievements) user.achievements = []
        user.achievements.push({
            type: 'mission_complete',
            missionId: mission.id,
            timestamp: Date.now()
        })

        return true
    },

    /**
     * Get user daily missions display
     */
    getMissionsDisplay(user) {
        const tracker = this.initMissions(user)
        if (!tracker.dailyMissions || tracker.dailyMissions.length === 0) {
            return '*No missions available*'
        }

        let display = `*📜 DAILY MISSIONS*\n━━━━━━━━━━━━━━━━\n\n`
        const completed = tracker.completedToday.length

        tracker.dailyMissions.forEach((mission, idx) => {
            const isComplete = tracker.completedToday.includes(mission.id)
            const progressBar = this.progressBar(mission.current, mission.target)
            const status = isComplete ? '✅' : '⏳'

            display += `${status} *${mission.name}*\n`
            display += `   ${progressBar} ${mission.current}/${mission.target}\n`
            display += `   💰 ${mission.rewards.money} | ✨ ${mission.rewards.exp}\n`
            display += `   Difficulty: ${mission.difficulty}\n\n`
        })

        display += `━━━━━━━━━━━━━━━━\n`
        display += `*Completed Today:* ${completed}/${tracker.dailyMissions.length}\n`
        display += `*Total Rewards:* 💰 ${tracker.dailyMissions.reduce((sum, m) => sum + m.rewards.money, 0)}`

        return display
    },

    /**
     * Helper: progress bar display
     */
    progressBar(current, max, length = 8) {
        const fill = Math.floor((current / max) * length)
        const empty = length - fill
        const percent = Math.floor((current / max) * 100)
        return `[${fill > 0 ? '█'.repeat(fill) : ''}${empty > 0 ? '░'.repeat(empty) : ''}] ${percent}%`
    }
}

export default missionGenerator
export { activityTypes }
