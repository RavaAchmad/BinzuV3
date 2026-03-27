import { JobTierSystem, JOB_TIERS } from '../lib/job-tier-system.js'
import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, args, command }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const user = await RPGHandler.initializeUser(global.db, userId, userName)

    if (command === 'jobtier') {
      if (!args[0]) {
        // Show current and next tier
        const currentJob = user.jobTier || user.skill?.name || 'warrior'
        const currentJobInfo = JOB_TIERS[currentJob]
        const nextAdvance = JobTierSystem.getAvailableAdvances(user)

        let text = `╔═══════════════════════════════╗\n`
        text += `║    🎯 JOB TIER ADVANCEMENT    ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        text += `*📊 Current Job*\n`
        text += `${currentJobInfo?.emoji || '⚔️'} ${currentJobInfo?.name || 'Unknown'}\n`
        text += `Tier: ${currentJobInfo?.tier || 1}\n\n`

        if (!nextAdvance.completed) {
          text += `*🎗️ Next Tier Available*\n`
          text += `${JOB_TIERS[nextAdvance.nextJob]?.emoji} ${JOB_TIERS[nextAdvance.nextJob]?.name}\n`
          text += `Tier: ${JOB_TIERS[nextAdvance.nextJob]?.tier}\n\n`

          text += `*📈 Requirements*\n`
          text += `Level: ${nextAdvance.progress.level}\n`
          text += `Money: ${nextAdvance.progress.money}\n`
          text += `Awakening: ${nextAdvance.progress.awakening}\n\n`

          text += `✨ _Use !jobtier advance to proceed_`
        } else {
          text += `✅ *Sudah di tingkat maksimal!*`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'advance') {
        const nextAdvance = JobTierSystem.getAvailableAdvances(user)

        if (nextAdvance.completed) {
          await conn.sendMessage(m.chat, { text: '❌ Sudah di tingkat maksimal!' }, { quoted: m })
          return
        }

        const result = JobTierSystem.advanceJob(user, nextAdvance.nextJob)

        if (result.success) {
          let text = `╔═══════════════════════════════╗\n`
          text += `║  🎉 JOB TIER NAIK!  🎉      ║\n`
          text += `╚═══════════════════════════════╝\n\n`
          text += `${JOB_TIERS[nextAdvance.nextJob]?.emoji} ${result.newJob}\n`
          text += `Tier: ${result.newTier}\n\n`
          text += `*Stat Bonuses:*\n`
          for (const [stat, bonus] of Object.entries(result.bonusReceived)) {
            text += `${stat.toUpperCase()}: +${bonus}\n`
          }

          await conn.sendMessage(m.chat, { text: text }, { quoted: m })
          await RPGHandler.updateUser(global.db, userId, user)
        } else {
          await conn.sendMessage(m.chat, { text: `❌ ${result.reason}` }, { quoted: m })
        }
      } else if (args[0].toLowerCase() === 'list') {
        let text = `╔═══════════════════════════════╗\n`
        text += `║      📚 ALL JOB TIERS        ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        const tierGroups = {}
        for (const [jobName, jobInfo] of Object.entries(JOB_TIERS)) {
          if (!tierGroups[jobInfo.tier]) tierGroups[jobInfo.tier] = []
          tierGroups[jobInfo.tier].push({ name: jobName, info: jobInfo })
        }

        for (let tier = 1; tier <= 5; tier++) {
          text += `*═══ TIER ${tier} ═══*\n`
          if (tierGroups[tier]) {
            for (const job of tierGroups[tier]) {
              text += `${job.info.emoji} ${job.info.name}\n`
              text += `   ${job.info.description}\n\n`
            }
          }
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      }
    }
  } catch (error) {
    console.error('Error in jobtier command:', error)
    await conn.sendMessage(m.chat, { text: `❌ Error: ${error.message}` }, { quoted: m })
  }
}

handler.help = ['jobtier']
handler.tags = ['rpg']
handler.command = /^jobtier(?: (.+))?$/i

export default handler
