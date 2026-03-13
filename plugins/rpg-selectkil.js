import skillSystem from '../lib/skill-system.js'

let handler = async (m, { conn, usedPrefix, text, command, db }) => {
    let user = global.db.data.users[m.sender]
    
    if (!text) {
        let skillList = skillSystem.getAllSkills()
        let menu = `
*⚔️ ADVANCED SKILL SELECTION SYSTEM*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${user.skill ? `*Current Skill:* ${user.skill.name} (Lv ${user.skill.level})` : '*No skill selected yet*'}

*📜 AVAILABLE SKILLS:*
`
        skillList.forEach(skill => {
            menu += `\n${skill.emoji} *${skill.name}*
   Primary: ${skill.primary} | Secondary: ${skill.secondary}
   ${skill.description}
   *Command:* ${usedPrefix}${command} ${skill.id}`
        })

        menu += `\n\n*💡 Skill Features:*
• Level up to Lv 30
• Skill-specific stat bonuses
• Ability bonuses in dungeons
• Combat enhancement
• Craft & Resource gathering bonuses

*📖 How to use:*
${usedPrefix}${command} <skill_name>
${usedPrefix}skillinfo [skill_name]
${usedPrefix}skillstat
${usedPrefix}skilllevel <skill_name>`

        return m.reply(menu.trim())
    }

    const subcommand = text.split(' ')[0].toLowerCase()
    const skillName = text.split(' ')[1]?.toLowerCase()

    switch(subcommand) {
        case 'info':
        case 'info:':
            if (!skillName) {
                if (!user.skill) return m.reply('You dont have a skill yet')
                const skillInfo = skillSystem.getSkillInfo(user.skill.name, user.skill.level)
                return m.reply(formatSkillInfo(skillInfo))
            } else {
                const skilLookup = skillSystem.getSkillInfo(skillName, 1)
                if (!skilLookup) return m.reply('Skill not found')
                return m.reply(formatSkillInfo(skilLookup))
            }

        case 'stat':
        case 'status':
            if (!user.skill) return m.reply('You dont have a skill yet')
            let stats = user.skill.stats
            let msg = `*⚔️ YOUR SKILL STATS*\n`
            msg += `*Skill:* ${user.skill.name} (Lv ${user.skill.level})\n`
            msg += `*EXP:* ${user.skill.exp}/${500 + (user.skill.level * 200)}\n\n`
            msg += `*STATS:*\n`
            Object.entries(stats).forEach(([stat, val]) => {
                msg += `${getStatEmoji(stat)} ${stat}: ${val}\n`
            })
            return m.reply(msg)

        case 'levelup':
        case 'upgrade':
            if (!user.skill) return m.reply('Select a skill first')
            const cost = skillSystem.getUpgradeCost(user.skill.level)
            if (user.money < cost.money) {
                return m.reply(`Not enough money. Need ${cost.money}, have ${user.money}`)
            }
            user.money -= cost.money
            const levelupResult = skillSystem.addSkillExp(user, 200)
            if (levelupResult.levelup) {
                return m.reply(`🎉 ${user.skill.name} leveled up to Lv${levelupResult.newLevel}!\n*New Stats Applied*`)
            } else {
                return m.reply(`Added 200 skill EXP\nProgress: ${levelupResult.expProgress}/${levelupResult.expNeeded}`)
            }

        default:
            // Skill selection
            const skillToSelect = skillSystem.getSkillInfo(subcommand)
            if (!skillToSelect) {
                return m.reply(`Skill "${subcommand}" not found. Use ${usedPrefix}${command} to see available skills`)
            }

            if (user.skill && user.skill.name === subcommand) {
                return m.reply(`You already have ${skillToSelect.name} equipped`)
            }

            if (user.skill) {
                return m.reply(`You already have ${user.skill.name}. Reskill is not available in this version`)
            }

            // Initialize skill
            user.skill = {
                name: subcommand,
                level: 1,
                exp: 0,
                stats: skillToSelect.stats,
                abilities: skillToSelect.abilities
            }

            let confirmMsg = `✅ You have selected *${skillToSelect.name}*!\n\n`
            confirmMsg += `${skillToSelect.emoji} ${skillToSelect.description}\n\n`
            confirmMsg += `*Starting Stats:*\n`
            Object.entries(skillToSelect.stats).forEach(([stat, val]) => {
                confirmMsg += `${getStatEmoji(stat)} ${stat}: ${val}\n`
            })
            confirmMsg += `\n*Tip:* Use skill commands in dungeon to enhance your combat!`

            return m.reply(confirmMsg)
    }
}

function formatSkillInfo(skill) {
    let msg = `*${skill.emoji} ${skill.name}*\n`
    msg += `━━━━━━━━━━━━━━\n`
    msg += `${skill.description}\n\n`
    msg += `*Primary Stat:* ${skill.primary}\n`
    msg += `*Secondary Stat:* ${skill.secondary}\n\n`
    msg += `*Level:* ${skill.currentLevel}\n`
    msg += `*EXP Needed:* ${skill.expNeeded}\n\n`
    msg += `*STATS:*\n`
    Object.entries(skill.stats).forEach(([stat, val]) => {
        msg += `${getStatEmoji(stat)} ${stat}: ${val}\n`
    })
    return msg
}

function getStatEmoji(stat) {
    const emojis = {
        'STR': '💪',
        'DEF': '🛡️',
        'MAG': '✨',
        'AGI': '⚡',
        'CRIT': '💥',
        'HP': '❤️'
    }
    return emojis[stat] || '📊'
}

handler.help = ['selectskill [skill|info|stat|levelup]']
handler.tags = ['rpg']
handler.command = /^(selectskill|skillinfo|skillstat|skilllevel)$/i
handler.register = true
handler.group = true
handler.rpg = true
export default handler