import { AchievementSystem, ACHIEVEMENTS, TITLES_CATEGORIES } from '../lib/titles-achievements-system.js'
import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, args, command }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const user = await RPGHandler.initializeUser(global.db, userId, userName)

    if (command === 'titles' || command === 'achievements') {
      if (!args[0]) {
        // Show progress summary
        const progress = AchievementSystem.getAchievementProgress(user)
        const display = AchievementSystem.displayAchievements(user)

        let text = `╔═══════════════════════════════╗\n`
        text += `║   🏆 TITLES & ACHIEVEMENTS 🏆 ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        text += `*Progress:* ${progress.unlocked}/${progress.total}\n`
        text += `📊 ${progress.percentage}% Complete\n\n`

        text += `*By Category:*\n`
        for (const [cat, prog] of Object.entries(display)) {
          text += `${cat.toUpperCase()}: ${prog}\n`
        }

        text += `\n_Use !titles list to view all_`

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'list') {
        let text = `╔═══════════════════════════════╗\n`
        text += `║      📚 ALL ACHIEVEMENTS 📚    ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        const allAch = AchievementSystem.getAllAchievements()
        const unlocked = user.achievements || []

        let count = 0
        for (const [id, ach] of Object.entries(allAch)) {
          const isUnlocked = unlocked.includes(id)
          const marker = isUnlocked ? '✅' : '❌'
          text += `${marker} ${ach.emoji} ${ach.title}\n`
          text += `${ach.description}\n\n`

          count++
          if (count >= 10) break
        }

        text += `_and ${allAch.length - 10} more..._`

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'recommended') {
        const recommended = AchievementSystem.getRecommended(user)

        let text = `╔═══════════════════════════════╗\n`
        text += `║     ⭐ RECOMMENDED 🎯 ⭐    ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        for (const ach of recommended) {
          text += `${ach.id}\n`
          text += `📝 ${ach.description}\n`
          text += `🎯 ${ach.condition}\n`
          text += `🎁 Reward: ${ach.reward}\n\n`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'unlocked') {
        const unlocked = user.achievements || []

        let text = `╔═══════════════════════════════╗\n`
        text += `║      ✅ UNLOCKED TITLES ✅    ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        if (unlocked.length === 0) {
          text += `No achievements unlocked yet!`
        } else {
          for (const id of unlocked) {
            const ach = ACHIEVEMENTS[id]
            if (ach) {
              text += `${ach.emoji} ${ach.title}\n`
              text += `${ach.description}\n\n`
            }
          }
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'bonus') {
        const bonus = AchievementSystem.getTotalBonus(user)

        let text = `╔═══════════════════════════════╗\n`
        text += `║    🎁 ACHIEVEMENT BONUSES 🎁   ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        for (const [stat, val] of Object.entries(bonus)) {
          if (val > 0) {
            text += `${stat.toUpperCase()}: +${val}\n`
          }
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      }
    }
  } catch (error) {
    console.error('Error in titles command:', error)
    await conn.sendMessage(m.chat, { text: `❌ Error: ${error.message}` }, { quoted: m })
  }
}

handler.help = ['titles', 'achievements']
handler.tags = ['rpg']
handler.command = /^(titles|achievements)(?: (.+))?$/i

export default handler
