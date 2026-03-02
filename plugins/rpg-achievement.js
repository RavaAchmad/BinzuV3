import { achievementSystem } from '../lib/achievements.js'

let handler = async (m, { conn, args }) => {
    const user = global.db.data.users[m.sender]
    achievementSystem.initAchievements(user)

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

        m.reply(unlockText)
    }

    const text = achievementSystem.formatAchievements(user)
    m.reply(text)
}

handler.help = ['achievement']
handler.tags = ['rpg']
handler.command = /^(achievement|achv)$/i
handler.register = true
handler.rpg = true

export default handler
