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
        if (!user.missionTracker.dailyMissions?.length || Date.now() - user.missionTracker.lastReset > dayInMs) {
            user.missionTracker.dailyMissions = this.generateDailyMissions(user)
            user.missionTracker.completedToday = []
            user.missionTracker.lastReset = Date.now()
            user.missionTracker.activityLog = {}
        }

        return user.missionTracker
    },

    /**
     * Generate daily missions based on user stats and activity
     */
    generateDailyMissions(user = {}) {
        const today = new Date().toDateString()
        const hashSeed = today.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0)
            return a & a
        }, 0)

        const missions = [
            this.generateCombatMission(hashSeed, user),
            this.generateGatheringMission(hashSeed, user),
            this.generateProgressionMission(hashSeed, user)
        ]

        return missions
    },

    generateCombatMission(seed, user = {}) {
        const level = Math.max(1, Number(user.level || 1))
        const combatTypes = [
            { type: 'dungeonRuns', target: level >= 10 ? 2 : 1, reward: 3500 },
            { type: 'expGain', target: 1200 + (level * 80), reward: 3000 },
            { type: 'dungeonRuns', target: 1, reward: 4500 }
        ]
        const selected = combatTypes[Math.abs(seed) % combatTypes.length]

        return {
            id: 'daily_combat_' + Date.now(),
            name: `${activityTypes[selected.type].emoji} Combat Challenge`,
            description: `Complete ${selected.target} ${activityTypes[selected.type].name}`,
            type: selected.type,
            target: selected.target,
            current: 0,
            rewards: { exp: selected.reward, money: selected.reward / 2 },
            difficulty: 'Medium',
            timeLeft: 86400000
        }
    },

    generateGatheringMission(seed, user = {}) {
        const level = Math.max(1, Number(user.level || 1))
        const gatheringTypes = [
            { type: 'mining', target: level >= 5 ? 3 : 1, reward: 2600 },
            { type: 'fishing', target: 6 + Math.min(8, Math.floor(level / 10)), reward: 2600 },
            { type: 'crafting', target: 1, reward: 3200 }
        ]
        const selected = gatheringTypes[(Math.abs(seed) + 1) % gatheringTypes.length]

        return {
            id: 'daily_gathering_' + Date.now(),
            name: `${activityTypes[selected.type].emoji} Resource Gathering`,
            description: `Progress ${activityTypes[selected.type].name} ${selected.target}`,
            type: selected.type,
            target: selected.target,
            current: 0,
            rewards: { exp: selected.reward * 0.7, money: selected.reward },
            difficulty: 'Easy',
            timeLeft: 86400000
        }
    },

    generateProgressionMission(seed, user = {}) {
        const level = Math.max(1, Number(user.level || 1))
        const progressionTypes = [
            { type: 'skillLevelup', target: 1, reward: 5000 },
            { type: 'expGain', target: 2500 + (level * 100), reward: 5000 },
            { type: 'moneyGain', target: 4000 + (level * 150), reward: 2500 },
            { type: 'gamePlayed', target: 2, reward: 2800 }
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
        if (!user.missionTracker) this.initMissions(user)
        if (!Array.isArray(user.missionTracker.rewardLog)) user.missionTracker.rewardLog = []
        user.missionTracker.rewardLog.push({
            type: 'mission_complete',
            missionId: mission.id,
            timestamp: Date.now()
        })

        if (user.achievements && !Array.isArray(user.achievements)) {
            user.achievements.missionsCompleted = (user.achievements.missionsCompleted || 0) + 1
        }

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
