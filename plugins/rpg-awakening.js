import { AwakeningSystem, ReincarnationSystem, AWAKENING_STAGES, REINCARNATION_BENEFITS } from '../lib/awakening-reincarnation-system.js'
import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, args, command }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const user = await RPGHandler.initializeUser(global.db, userId, userName)

    if (command === 'awakening') {
      if (!args[0]) {
        // Show current status
        const currentAwakening = user.awakening || 0
        const nextInfo = AwakeningSystem.getNextAwakeningInfo(user)

        let text = `╔═══════════════════════════════╗\n`
        text += `║     ✨ AWAKENING STATUS ✨    ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        text += `*Current Awakening:* ${currentAwakening > 0 ? `Level ${currentAwakening}` : 'None'}\n\n`

        if (!nextInfo.completed) {
          const next = nextInfo.info
          text += `*🌟 Next Awakening: ${next.level}*\n`
          text += `${next.emoji} ${next.description}\n\n`

          text += `*Requirements:*\n`
          text += `Level: ${nextInfo.progress.level}\n`
          text += `Money: ${nextInfo.progress.money}\n`
          text += `*Items Needed:*\n`
          for (const [item, progress] of Object.entries(nextInfo.progress.items)) {
            text += `  ${item}: ${progress}\n`
          }

          text += `\n_Use !awakening perform to start_`
        } else {
          text += `✅ Perfect Awakening achieved!`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'perform') {
        const nextInfo = AwakeningSystem.getNextAwakeningInfo(user)

        if (nextInfo.completed) {
          await conn.sendMessage(m.chat, { text: '❌ Sudah di Perfect Awakening!' }, { quoted: m })
          return
        }

        const result = AwakeningSystem.performAwakening(user, nextInfo.level)

        if (result.success) {
          let text = `╔═══════════════════════════════╗\n`
          text += `║   🔥 AWAKENING SUCCESS! 🔥    ║\n`
          text += `╚═══════════════════════════════╝\n\n`
          text += `${result.unlocksFeature ? `Unlocks: ${result.unlocksFeature}\n` : ''}`
          text += `${result.description}\n\n`
          text += `Stat Multiplier: x${result.statMultiplier}`

          await conn.sendMessage(m.chat, { text: text }, { quoted: m })
          await RPGHandler.updateUser(global.db, userId, user)
        } else {
          let errorText = `❌ Cannot Awaken:\n${result.errors.join('\n')}`
          await conn.sendMessage(m.chat, { text: errorText }, { quoted: m })
        }
      }
    } else if (command === 'reincarnation') {
      if (!args[0]) {
        // Show reincarnation status
        const reincarInfo = ReincarnationSystem.getReincarnationInfo(user)
        const progress = ReincarnationSystem.getReincarnationProgress(user)

        let text = `╔═══════════════════════════════╗\n`
        text += `║   ♻️ REINCARNATION STATUS ♻️   ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        text += `*Current Life:* ${reincarInfo.currentLife}\n`
        text += `${REINCARNATION_BENEFITS[reincarInfo.currentLife]?.description || ''}\n\n`

        text += `*Progress to Next Reincarnation:*\n`
        text += `${progress.level}\n`
        text += `${progress.awakening}\n\n`

        if (progress.canReincarnate) {
          text += `✅ Ready to Reincarnate!\n`
          text += `_Use !reincarnation perform_`
        } else {
          text += `❌ Not ready yet\n${progress.reason}`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'perform') {
        const result = ReincarnationSystem.reincarnate(user)

        if (result.success) {
          let text = `╔═══════════════════════════════╗\n`
          text += `║   🌟 REINCARNATION SUCCESS 🌟  ║\n`
          text += `╚═══════════════════════════════╝\n\n`
          text += `${result.description}\n\n`
          text += `*Life ${result.life}*\n`
          text += `Exp Multiplier: x${result.expMultiplier}\n`
          text += `Money Multiplier: x${result.moneyMultiplier}\n`
          text += `Bonus Skill Points: +${result.bonusSkillPoints}\n\n`
          text += `*Permanent Stat Bonus:*\n`
          for (const [stat, bonus] of Object.entries(result.statBonus)) {
            text += `${stat.toUpperCase()}: +${bonus}\n`
          }

          await conn.sendMessage(m.chat, { text: text }, { quoted: m })
          await RPGHandler.updateUser(global.db, userId, user)
        } else {
          await conn.sendMessage(m.chat, { text: `❌ ${result.reason}` }, { quoted: m })
        }
      }
    }
  } catch (error) {
    console.error('Error in awakening/reincarnation command:', error)
    await conn.sendMessage(m.chat, { text: `❌ Error: ${error.message}` }, { quoted: m })
  }
}

handler.help = ['awakening', 'reincarnation']
handler.tags = ['rpg']
handler.command = /^(awakening|reincarnation)(?: (.+))?$/i

export default handler
