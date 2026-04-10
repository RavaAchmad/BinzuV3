import { ExploreSystem, EXPLORE_AREAS, RARE_ITEMS } from '../lib/explore-system-v2.js'
import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, args, command }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const user = await RPGHandler.initializeUser(global.db, userId, userName)

    if (command === 'explore' || command === 'explorenew' || command === 'exploreadvanced') {
      if (!args[0]) {
        // Show available areas
        const areas = ExploreSystem.getAvailableAreas(user.level)

        let text = `╔═══════════════════════════════╗\n`
        text += `║      🗺️ EXPLORE AREAS 🗺️     ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        for (const area of areas) {
          const areaInfo = EXPLORE_AREAS[area.number]
          text += `${area.emoji} **Area ${area.number}: ${area.name}**\n`
          text += `Lv. ${area.minLevel}-${area.maxLevel}\n`
          text += `Items: ${area.rareDropRate * 100}% drop rate\n\n`
        }

        text += `_Use !explorenew <area_number>_`

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'list') {
        // Show all areas with progression
        let text = `╔═══════════════════════════════╗\n`
        text += `║    📚 AREA PROGRESSION 📚    ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        const progression = ExploreSystem.getAreaProgression(user.level)

        for (const area of progression) {
          let marker = area.explored ? '✅' : '🔒'
          if (area.current) marker = '▶️'

          text += `${marker} ${area.emoji} Area ${area.number}: ${area.name}\n`
          text += `Lv. ${area.minLevel}+\n`
          text += `Monsters: ${area.monsters.slice(0, 2).join(', ')}\n\n`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else {
        const areaNumber = parseInt(args[0])
        const maxArea = Object.keys(EXPLORE_AREAS).length
        const maxAreaByLevel = Math.floor(user.level / 4)

        if (isNaN(areaNumber) || areaNumber < 1 || !EXPLORE_AREAS[areaNumber]) {
          await conn.sendMessage(m.chat, { text: `❌ Area tidak valid (1-${maxArea})` }, { quoted: m })
          return
        }

        if (areaNumber > maxAreaByLevel) {
          await conn.sendMessage(m.chat, { text: `🔒 Area ${areaNumber} belum terbuka!\nLevel kamu: ${user.level} (buka sampai area ${maxAreaByLevel})\nButuh level *${areaNumber * 4}* untuk area ${areaNumber}` }, { quoted: m })
          return
        }

        const result = ExploreSystem.exploreArea(areaNumber, user.level)

        if (!result.success) {
          await conn.sendMessage(m.chat, { text: `❌ ${result.reason}` }, { quoted: m })
          return
        }

        const encounter = result.encounter

        let text = `╔═══════════════════════════════╗\n`
        text += `║   ${encounter.areaEmoji} ENCOUNTER ${encounter.areaEmoji}   ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        text += `*Area:* ${encounter.areaName}\n`
        text += `*Monster:* ${encounter.monster} (${encounter.monsterRarity})\n`
        text += `*HP:* ${encounter.hp}\n`
        text += `*Damage:* ${encounter.damage}\n\n`

        text += `*Rewards (if win):*\n`
        text += `Gold: ${encounter.baseGold}\n`
        text += `Exp: ${encounter.baseExp}\n`

        if (encounter.rareDrop) {
          text += `\n💎 *Rare Drop:* ${encounter.rareDrop.emoji} ${encounter.rareDrop.name}`
        }

        if (encounter.easterEggs > 0) {
          text += `\n🥚 *Easter Eggs:* +${encounter.easterEggs} Telur Paskah!`
          user.paskah = (user.paskah || 0) + encounter.easterEggs
        }

        text += `\n\n_Use !fight in battle context_`

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })

        // Store encounter for battle processing
        if (!user.currentEncounter) user.currentEncounter = {}
        user.currentEncounter = encounter
        await RPGHandler.updateUser(global.db, userId, user)
      }
    }
  } catch (error) {
    console.error('Error in explore command:', error)
    await conn.sendMessage(m.chat, { text: `❌ Error: ${error.message}` }, { quoted: m })
  }
}

handler.help = ['explore', 'explorenew', 'exploreadvanced']
handler.tags = ['rpg']
handler.command = /^(explore|explorenew|exploreadvanced)(?: (.+))?$/i

export default handler
