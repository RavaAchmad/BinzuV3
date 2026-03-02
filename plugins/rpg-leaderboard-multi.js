import leaderboardManager from '../lib/leaderboard.js'
import { getDungeonRank } from '../lib/rpg-ranks.js'

let handler = async (m, { conn, args, usedPrefix }) => {
    const db = global.db.data
    leaderboardManager.initLeaderboard(db)
    leaderboardManager.checkResetNeeded(db)

    const timeframe = (args[0] || 'daily').toLowerCase()
    const category = (args[1] || 'dungeonWins').toLowerCase()
    
    const validTimeframes = ['daily', 'weekly', 'seasonal', 'allTime']
    const categories = {
        'dungeonwins': 'dungeonWins',
        'dungeonruns': 'dungeonRuns',
        'exp': 'expGained',
        'money': 'moneyGained',
        'bosskills': 'bossKills',
        'achievements': 'achievements'
    }

    if (!validTimeframes.includes(timeframe)) {
        return m.reply(`
*⚠️ Invalid Timeframe!*

Valid options:
• daily - Reset setiap 24 jam
• weekly - Reset setiap 7 hari
• seasonal - Reset setiap 6 bulan
• allTime - All time record

Example: ${usedPrefix}leaderboard daily dungeonwins
`)
    }

    const selectedCategory = categories[category] || 'dungeonWins'
    const categoryName = selectedCategory === 'dungeonWins' ? '🏆 Dungeon Wins' :
                         selectedCategory === 'dungeonRuns' ? '⚔️ Dungeon Runs' :
                         selectedCategory === 'expGained' ? '✨ Exp Gained' :
                         selectedCategory === 'moneyGained' ? '💹 Money Gained' :
                         selectedCategory === 'bossKills' ? '💀 Boss Kills' : '🎖️ Achievements'

    const leaderboard = leaderboardManager.getLeaderboard(db, timeframe, selectedCategory, 15)
    
    if (leaderboard.length === 0) {
        return m.reply(`📊 Tidak ada data ${timeframe} leaderboard untuk ${categoryName}`)
    }

    let text = `
╭━━━━━━━━━━━━━ 🏆 ━━━━━━━━━━━━━╮
┃      ${categoryName}
┃      *${timeframe.toUpperCase()} LEADERBOARD*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`

    leaderboard.forEach((entry, i) => {
        const medals = ['🥇', '🥈', '🥉']
        const medal = i < 3 ? medals[i] : `#${i + 1} ⭐`
        const user = global.db.data.users[entry.userId]
        const level = user?.level || 0
        const rank = getDungeonRank(level)

        let value = entry[selectedCategory] || 0
        if (selectedCategory === 'moneyGained' || selectedCategory === 'expGained') {
            value = value.toLocaleString('id-ID')
        }

        text += `${medal} *${(entry.name || conn.getName(entry.userId) || 'Unknown')}*\n`
        text += `   ├─ ${selectedCategory === 'dungeonWins' ? '✅' : '⚔️'} ${value}\n`
        text += `   ├─ 📊 Lvl ${level} - ${rank.name}\n`
        text += `   └─ ✨ ${(user?.exp || 0).toLocaleString('id-ID')} Exp\n\n`
    })

    const yourRank = leaderboardManager.getPlayerRank(db, m.sender, timeframe, selectedCategory)
    const yourData = db.leaderboards[timeframe].data[m.sender]
    
    if (yourRank) {
        text += `╭━━━━━━━━━━━━━ 👤 ━━━━━━━━━━━━━╮\n`
        text += `┃ Posisi Anda: #${yourRank}\n`
        text += `┃ Score: ${(yourData[selectedCategory] || 0).toLocaleString('id-ID')}\n`
        text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
    }

    const timeframeInfo = timeframe === 'daily' ? '⏰ Reset: Setiap 24 jam' :
                          timeframe === 'weekly' ? '⏰ Reset: Setiap 7 hari' :
                          timeframe === 'seasonal' ? '⏰ Reset: Setiap 6 bulan' : '⏰ Permanent Records'
    
    text += `\n\n${timeframeInfo}`
    text += `\n\n💡 Gunakan: ${usedPrefix}leaderboard [timeframe] [category]\n`
    text += `📌 Categories: dungeonwins, dungeonruns, exp, money, bosskills, achievements`

    m.reply(text)
}

handler.help = ['leaderboard [timeframe] [category]']
handler.tags = ['rpg', 'leaderboard']
handler.command = /^(leaderboard|lb)$/i
handler.register = true
handler.rpg = true

export default handler
