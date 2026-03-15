import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, args }) => {
    try {
        const userId = m.sender
        const userName = await conn.getName(userId)
        const user = await RPGHandler.initializeUser(global.db, userId, userName)
        const db = global.db.data
        const { rank, total } = await RPGHandler.getPlayerRank(db, userId)

        const card = {
          level: user.level,
          exp: user.exp,
          hp: user.stats.hp,
          mana: user.stats.mana,
          str: Math.floor(user.stats.str),
          agi: Math.floor(user.stats.agi),
          def: Math.floor(user.stats.def),
          mag: Math.floor(user.stats.mag),
          crit: Math.floor(user.stats.crit),
          money: user.money,
          skill: user.skill.name
        }

        const power = (card.str * 2) + (card.def * 1.5) + (card.mag * 1.5) + (card.agi * 1.5) + (card.level * 5)

        let text = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         👤 *PROFILE - ${userName}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *LEVEL & EXP*
  ├─ Level: ${card.level}
  ├─ Exp: ${card.exp.toLocaleString('id-ID')}
  └─ Rank: #${rank}/${total}

⚔️ *COMBAT STATS*
  ├─ HP: ${card.hp}
  ├─ MANA: ${card.mana}
  ├─ STR: ${card.str}
  ├─ AGI: ${card.agi}
  ├─ DEF: ${card.def}
  ├─ MAG: ${card.mag}
  ├─ CRIT: ${card.crit}%
  └─ POWER: ⚡${Math.floor(power)}

🔮 *SKILL*
  ├─ Name: ${card.skill}
  ├─ Level: ${user.skill.level}
  └─ Exp: ${user.skill.exp}

💰 *CURRENCY*
  ├─ Money: 💹 ${card.money.toLocaleString('id-ID')}
  ├─ Diamond: 💎 ${user.diamond}
  └─ Emerald: ❇️ ${user.emerald}

⏱️ *COOLDOWNS*
  ├─ Hunt: ${user.getCooldownRemaining('hunt')}s
  ├─ Fish: ${user.getCooldownRemaining('fishing')}s
  ├─ Mine: ${user.getCooldownRemaining('mining')}s
  └─ Work: ${user.getCooldownRemaining('work')}s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Available Commands:*
!hunt, !fish, !mine, !work, !adventure
!dungeon, !stats, !profile
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`

        m.reply(text)

    } catch (error) {
        console.error('Stats error:', error)
        m.reply(`❌ Error: ${error.message}`)
    }
}

handler.help = ['rpgstats']
handler.tags = ['rpg', 'stats']
handler.command = /^(rpgstats|stats)$/i
handler.register = true
handler.rpg = true

export default handler
