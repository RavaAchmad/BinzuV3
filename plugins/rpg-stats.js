import { getDungeonRank } from '../lib/rpg-ranks.js'
import { achievementSystem } from '../lib/achievements.js'
import leaderboardManager from '../lib/leaderboard.js'

let handler = async (m, { conn, args }) => {
    const user = global.db.data.users[m.sender]
    const db = global.db.data

    leaderboardManager.initLeaderboard(db)

    const rank = getDungeonRank(user.level)
    achievementSystem.initAchievements(user)

    const globalRank = {
        level: (Object.entries(db.users).sort((a, b) => b[1].level - a[1].level).map(e => e[0]).indexOf(m.sender) + 1),
        exp: (Object.entries(db.users).sort((a, b) => b[1].exp - a[1].exp).map(e => e[0]).indexOf(m.sender) + 1),
        money: (Object.entries(db.users).sort((a, b) => b[1].money - a[1].money).map(e => e[0]).indexOf(m.sender) + 1)
    }

    const dailyRank = leaderboardManager.getPlayerRank(db, m.sender, 'daily', 'dungeonWins')
    const weeklyRank = leaderboardManager.getPlayerRank(db, m.sender, 'weekly', 'dungeonWins')
    const seasonalRank = leaderboardManager.getPlayerRank(db, m.sender, 'seasonal', 'dungeonWins')

    let text = `
╭━━━━━━━━━━━━━━━━ 📊 RPG STATS ━━━━━━━━━━━━━━━━╮
┃
│ 👤 *${user.registered ? user.name : conn.getName(m.sender)}*
│
├─ 📈 *MAIN STATUS*
│  ├─ Level: ${user.level} (${user.exp.toLocaleString('id-ID')} Exp)
│  ├─ Health: ${user.health || 100}
│  ├─ Money: 💹 ${user.money.toLocaleString('id-ID')}
│  ├─ Diamond: 💎 ${user.diamond}
│  └─ Emerald: ❇️ ${user.emerald}
│
├─ 🎖️ *DUNGEON RANK*
│  ├─ ${rank.name}
│  ├─ Exp Multiplier: ${rank.rewards.expMult}x
│  ├─ Money Multiplier: ${rank.rewards.moneyMult}x
│  └─ Item Drop Rate: ${rank.rewards.itemDropRate}x
│
├─ 🏆 *GLOBAL RANKINGS*
│  ├─ Level Rank: #${globalRank.level}
│  ├─ Exp Rank: #${globalRank.exp}
│  └─ Money Rank: #${globalRank.money}
│
├─ 🏅 *LEADERBOARD POSITIONS*
│  ├─ Daily (Dungeon Wins): ${dailyRank ? '#' + dailyRank : 'Not Ranked'}
│  ├─ Weekly (Dungeon Wins): ${weeklyRank ? '#' + weeklyRank : 'Not Ranked'}
│  └─ Seasonal (Dungeon Wins): ${seasonalRank ? '#' + seasonalRank : 'Not Ranked'}
│
├─ ⚔️ *COMBAT STATS*
│  ├─ Dungeon Wins: ${user.dungeonWins || 0}
│  ├─ Dungeon Runs: ${user.dungeonRuns || 0}
│  ├─ Boss Kills: ${user.bossKills || 0}
│  ├─ Sword Level: ${user.sword || 0}
│  └─ Armor Level: ${user.armor || 0}
│
├─ 🎒 *INVENTORY*
│  ├─ Iron: ${user.iron || 0}
│  ├─ Gold: ${user.gold || 0}
│  ├─ Wood: ${user.wood || 0}
│  ├─ Rock: ${user.rock || 0}
│  ├─ String: ${user.string || 0}
│  ├─ Mythic Crate: ${user.mythic || 0}
│  ├─ Legendary Crate: ${user.legendary || 0}
│  └─ Common Crate: ${user.common || 0}
│
├─ 🐾 *PETS*
│  ├─ Fox Lvl: ${user.fox || 0}
│  ├─ Cat Lvl: ${user.cat || 0}
│  ├─ Dog Lvl: ${user.dog || 0}
│  ├─ Horse Lvl: ${user.horse || 0}
│  └─ Robot Lvl: ${user.robo || 0}
│
├─ 🎖️ *ACHIEVEMENTS*
│  ├─ Unlocked: ${user.achievements?.unlocked?.length || 0}
│  ├─ Total Points: ${user.achievements?.totalPoints || 0}
│  └─ Completed Today Missions: ${user.dailyMissions?.completedToday?.length || 0}
│
├─ 💼 *BANK & ATM*
│  ├─ Bank: 💹 ${user.bank || 0} / ${user.fullatm || 'Infinity'}
│  └─ ATM Level: ${user.atm || 0}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

💡 *Tips for Progress:*
• Participate in Daily Missions for quick rewards
• Defeat Dungeon Bosses for massive rewards  
• Climb the Leaderboards for prestige
• Unlock Achievements for bonus stats
• Complete Boss Raids for legendary items

For more info:
» ${m.prefix}mission - View daily missions
» ${m.prefix}leaderboard - Check rankings
» ${m.prefix}achievement - View achievements
» ${m.prefix}dungeonrank - Check dungeon tier
» ${m.prefix}bosraid - Start a boss raid
`

    m.reply(text)
}

handler.help = ['rpgstats']
handler.tags = ['rpg', 'stats']
handler.command = /^(rpgstats|stats)$/i
handler.register = true
handler.rpg = true

export default handler
