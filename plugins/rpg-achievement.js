import { achievementSystem } from '../lib/achievements.js'

let handler = async (m, { conn, args }) => {
    const user = global.db.data.users[m.sender]
    
    let statusMsg = await conn.sendMessage(m.chat, { text: '⏳ Loading achievements...' }, { quoted: m })

    try {
        await conn.sendMessage(m.chat, {
            text: '⏳ Checking unlocked achievements...',
            edit: statusMsg.key
        })

        achievementSystem.initAchievements(user)

        await conn.sendMessage(m.chat, {
            text: '⏳ Calculating rewards...',
            edit: statusMsg.key
        })

        const newUnlocks = achievementSystem.checkAchievements(user)

        if (newUnlocks.length > 0) {
            let unlockText = `
╭━━━━━━━━━━━━━━ 🎉 ━━━━━━━━━━━━━━╮
┃    🎊 ACHIEVEMENT UNLOCKED! 🎊
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`
            newUnlocks.forEach(achievement => {
                unlockText += `✨ *${achievement.name}*\n`
                unlockText += `   ${achievement.description}\n`
                unlockText += `   💎 +${achievement.reward.diamond || 0} Diamond\n`
                unlockText += `   💹 +${achievement.reward.money || 0} Money\n`
                unlockText += `   ✨ +${achievement.reward.exp || 0} Exp\n\n`
            })

            await conn.sendMessage(m.chat, { text: unlockText }, { quoted: m })
        }

        const text = achievementSystem.formatAchievements(user)

        await conn.sendMessage(m.chat, {
            text: text,
            edit: statusMsg.key
        })

    } catch (error) {
        console.error('Error in achievement:', error)
        await conn.sendMessage(m.chat, {
            text: '❌ Error loading achievements',
            edit: statusMsg.key
        })
    }
}

handler.help = ['achievement']
handler.tags = ['rpg']
handler.command = /^(achievement|achv)$/i
handler.register = true
handler.rpg = true

export default handler
