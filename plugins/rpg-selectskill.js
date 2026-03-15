import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, text, args }) => {
  try {
    const userId = m.sender
    const skillName = args[0]?.toLowerCase()

    if (!skillName) {
      return m.reply(`❌ Usage: !selectskill [skillname]
Available: swordmaster, archer, mage, necromancer, paladin`)
    }

    const result = await RPGHandler.selectSkill(global.db, userId, skillName)

    if (result.error) {
      const skillList = result.available.join(', ')
      return m.reply(`❌ Invalid skill!\nAvailable: ${skillList}`)
    }

    const successMsg = `
✨ *SKILL SELECTED!*

${result.message}

Your skill is now: **${result.selectedSkill}**
Start grinding to level up your skill!

Commands:
!hunt - Start hunting
!stats - Check progress
!rpg skills - See all skill details
    `

    m.reply(successMsg)

  } catch (error) {
    console.error('Selectskill error:', error)
    m.reply(`❌ Error: ${error.message}`)
  }
}

handler.help = ['selectskill', 'skillselect']
handler.tags = ['rpg']
handler.command = /^selectskill$/i
handler.register = true
handler.rpg = true

export default handler
