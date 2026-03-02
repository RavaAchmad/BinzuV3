/**
 * Achievement System - Badge collector
 */

const achievements = {
    novice_adventurer: {
        id: 'novice_adventurer',
        name: '🌱 Novice Adventurer',
        description: 'Reach Level 10',
        condition: (user) => user.level >= 10,
        reward: { exp: 5000, money: 10000, badge: true }
    },
    diamond_collector: {
        id: 'diamond_collector',
        name: '💎 Diamond Collector',
        description: 'Collect 50 Diamonds',
        condition: (user) => user.diamond >= 50,
        reward: { exp: 10000, money: 25000 }
    },
    dungeon_master: {
        id: 'dungeon_master',
        name: '⚔️ Dungeon Master',
        description: 'Complete 50 Dungeon wins',
        condition: (user) => (user.dungeonWins || 0) >= 50,
        reward: { exp: 50000, money: 100000, diamond: 5 }
    },
    rich_player: {
        id: 'rich_player',
        name: '💰 Money Master',
        description: 'Have 1,000,000 Money',
        condition: (user) => user.money >= 1000000,
        reward: { exp: 20000, emerald: 3 }
    },
    exp_hunter: {
        id: 'exp_hunter',
        name: '✨ Experience Hunter',
        description: 'Reach 500,000 Total Exp',
        condition: (user) => user.exp >= 500000,
        reward: { money: 50000, diamond: 2 }
    },
    crafter_master: {
        id: 'crafter_master',
        name: '🔨 Master Crafter',
        description: 'Craft 100 items',
        condition: (user) => (user.itemsCrafted || 0) >= 100,
        reward: { exp: 30000, money: 75000 }
    },
    lucky_one: {
        id: 'lucky_one',
        name: '🍀 Lucky One',
        description: 'Get Legendary item from crate',
        condition: (user) => (user.legendaryFound || 0) >= 1,
        reward: { exp: 15000, diamond: 3 }
    },
    boss_slayer: {
        id: 'boss_slayer',
        name: '💀 Boss Slayer',
        description: 'Defeat 10 Boss Raids',
        condition: (user) => (user.bossKills || 0) >= 10,
        reward: { exp: 100000, diamond: 10, money: 250000 }
    },
    legend_player: {
        id: 'legend_player',
        name: '👑 Legend Player',
        description: 'Reach Level 100',
        condition: (user) => user.level >= 100,
        reward: { exp: 200000, diamond: 20, money: 500000 }
    }
}

const achievementSystem = {
    initAchievements(user) {
        if (!user.achievements) {
            user.achievements = {
                unlocked: [],
                totalPoints: 0,
                lastCheck: Date.now()
            }
        }
        return user.achievements
    },

    checkAchievements(user) {
        this.initAchievements(user)
        const newUnlocks = []

        for (const [key, achievement] of Object.entries(achievements)) {
            if (!user.achievements.unlocked.includes(key) && achievement.condition(user)) {
                user.achievements.unlocked.push(key)
                user.achievements.totalPoints += 10

                // Apply rewards
                user.exp += achievement.reward.exp || 0
                user.money += achievement.reward.money || 0
                user.diamond += achievement.reward.diamond || 0
                user.emerald += achievement.reward.emerald || 0

                newUnlocks.push(achievement)
            }
        }

        return newUnlocks
    },

    getAchievementProgress(user) {
        const progress = {}
        for (const [key, achievement] of Object.entries(achievements)) {
            const isUnlocked = user.achievements?.unlocked?.includes(key)
            progress[key] = {
                ...achievement,
                unlocked: isUnlocked || false
            }
        }
        return progress
    },

    formatAchievements(user) {
        const allAchievements = this.getAchievementProgress(user)
        let text = `
╭━━━━━━━━━━━━━━━ 🏆 ━━━━━━━━━━━━━━╮
┃         YOUR ACHIEVEMENTS
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`
        let unlockedCount = 0
        Object.values(allAchievements).forEach(achievement => {
            if (achievement.unlocked) {
                text += `✅ ${achievement.name}\n   ${achievement.description}\n\n`
                unlockedCount++
            }
        })

        text += `\n╭━━━━━━━━━━━━━ 🔒 LOCKED ━━━━━━━━━━━━━╮\n`
        Object.values(allAchievements).forEach(achievement => {
            if (!achievement.unlocked) {
                text += `❌ ${achievement.name}\n   ${achievement.description}\n\n`
            }
        })

        text += `\n┌━━━━━━━━━━━━━━━━┐\n`
        text += `│ Unlocked: ${unlockedCount}/${Object.keys(achievements).length}\n`
        text += `│ Points: ${user.achievements?.totalPoints || 0}\n`
        text += `└━━━━━━━━━━━━━━━━┘`

        return text
    }
}

export { achievements, achievementSystem }
export default achievementSystem
