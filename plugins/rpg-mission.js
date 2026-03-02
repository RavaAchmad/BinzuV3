import dailyMissions from '../lib/missions.js'

let handler = async (m, { conn, args, usedPrefix }) => {
    const user = global.db.data.users[m.sender]
    const subcommand = (args[0] || 'list').toLowerCase()

    user.dailyMissions = dailyMissions.initPlayerMissions(user)
    const availableMissions = dailyMissions.getRandomMissions(5)

    switch (subcommand) {
        case 'list': {
            let text = `
╭━━━━━━━━━━━━━ 📋 ━━━━━━━━━━━━━╮
┃      DAILY MISSIONS - Today
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`
            availableMissions.forEach((mission, i) => {
                const isCompleted = user.dailyMissions.completedToday.includes(mission.id)
                const isInProgress = user.dailyMissions.inProgress.find(m => m.id === mission.id)
                const status = isCompleted ? '✅ DONE' : isInProgress ? `🔄 ${isInProgress.progress}/${mission.objective.target}` : '⏳ NEW'
                
                text += `${i + 1}. *${mission.name}* [${mission.difficulty}] ${status}\n`
                text += `   ${mission.description}\n`
                text += `   💎 Reward: ${mission.rewards.exp} exp + ${mission.rewards.money} money\n\n`
            })

            text += `╭━━━━━━━━━━━━━ 📊 ━━━━━━━━━━━━━╮\n`
            text += `┃ Completed Today: ${user.dailyMissions.completedToday.length}\n`
            text += `┃ In Progress: ${user.dailyMissions.inProgress.length}\n`
            text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`
            text += `Use: ${usedPrefix}mission start [number] to start a mission\n`
            text += `Use: ${usedPrefix}mission progress to see your progress`

            m.reply(text)
            break
        }

        case 'start': {
            const missionNum = parseInt(args[1]) - 1
            if (isNaN(missionNum) || missionNum < 0 || missionNum >= availableMissions.length) {
                return m.reply('❌ Invalid mission number!')
            }

            const mission = availableMissions[missionNum]
            const started = dailyMissions.startMission(user, mission.id)

            if (started) {
                m.reply(`✅ Mission Started!\n${dailyMissions.formatMission(mission)}`)
            } else {
                if (user.dailyMissions.completedToday.includes(mission.id)) {
                    m.reply('✅ You already completed this mission today!')
                } else {
                    m.reply('🔄 Mission already in progress!')
                }
            }
            break
        }

        case 'progress': {
            if (user.dailyMissions.inProgress.length === 0) {
                return m.reply('❌ No missions in progress. Start a mission first!')
            }

            let text = `
╭━━━━━━━━━━━━━ 🔄 ━━━━━━━━━━━━━╮
┃      YOUR PROGRESS
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`
            user.dailyMissions.inProgress.forEach(mission => {
                const percent = Math.min(100, Math.floor((mission.progress / mission.objective.target) * 100))
                const bar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10))
                
                text += `🎯 *${mission.name}*\n`
                text += `${bar} ${percent}%\n`
                text += `Progress: ${mission.progress}/${mission.objective.target}\n`
                text += `Rewards: 💎 x${mission.rewards.diamond || 0}\n\n`
            })

            m.reply(text)
            break
        }

        case 'reward': {
            if (user.dailyMissions.completedToday.length === 0) {
                return m.reply('❌ No completed missions to claim rewards from!')
            }

            const missionNum = parseInt(args[1])
            if (isNaN(missionNum) || missionNum < 1 || missionNum > user.dailyMissions.inProgress.length) {
                return m.reply('❌ Invalid mission number!')
            }

            const completedMission = user.dailyMissions.inProgress[missionNum - 1]
            if (completedMission.progress >= completedMission.objective.target) {
                const claimed = dailyMissions.completeMission(user, completedMission.id)
                if (claimed) {
                    user.exp += claimed.rewards.exp
                    user.money += claimed.rewards.money
                    user.diamond += claimed.rewards.diamond || 0
                    user.emerald += claimed.rewards.emerald || 0
                    
                    m.reply(`✅ Mission Complete!\n\n📊 Rewards:\n✨ +${claimed.rewards.exp} Exp\n💹 +${claimed.rewards.money} Money\n💎 +${claimed.rewards.diamond || 0} Diamond`)
                }
            }
            break
        }

        default:
            m.reply(`Usage:\n${usedPrefix}mission list\n${usedPrefix}mission start [number]\n${usedPrefix}mission progress\n${usedPrefix}mission reward`)
    }
}

handler.help = ['mission [subcommand]']
handler.tags = ['rpg']
handler.command = /^(mission|misi)$/i
handler.register = true
handler.rpg = true

export default handler
