import { ExploreSystem, EXPLORE_AREAS, RARE_ITEMS } from '../lib/explore-system-v2.js'
import { RPGHandler } from '../lib/rpg-handler.js'
import { listMenu, quickButtons } from '../lib/buttons.js'

let handler = async (m, { conn, args, command, usedPrefix }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const user = await RPGHandler.initializeUser(global.db, userId, userName)

    if (command === 'explore' || command === 'explorenew' || command === 'exploreadvanced') {
      if (!args[0]) {
        // Show available areas with interactive list
        const areas = ExploreSystem.getAvailableAreas(user.level)
        const maxAreaByLevel = Math.floor(user.level / 4)

        let text = `╔═══════════════════════════════╗\n`
        text += `║      🗺️ EXPLORE AREAS 🗺️     ║\n`
        text += `╚═══════════════════════════════╝\n\n`
        text += `📊 Level: ${user.level} | Area terbuka: 1-${maxAreaByLevel}\n\n`

        for (const area of areas.slice(-6)) {
          text += `${area.emoji} *Area ${area.number}: ${area.name}* (Lv.${area.minLevel}+)\n`
          text += `   Monsters: ${area.monsters.map(m => m.name).join(', ')}\n`
          text += `   Drop: ${(area.rareDropRate * 100).toFixed(0)}% | 🥚 25%\n\n`
        }

        // Build sections for interactive list
        const sections = []
        const chunk = 8
        for (let i = 0; i < areas.length; i += chunk) {
          const batch = areas.slice(i, i + chunk)
          sections.push({
            title: `Area ${batch[0].number}-${batch[batch.length - 1].number}`,
            rows: batch.map(a => ({
              id: `${usedPrefix}explore ${a.number}`,
              title: `${a.emoji} Area ${a.number}: ${a.name}`,
              description: `Lv.${a.minLevel}+ | ${a.monsters.map(m => m.name).join(', ')}`
            }))
          })
        }

        await listMenu(conn, m.chat, text.trim(), `${areas.length} area terbuka | Pilih area di bawah`, '⛰️ Pilih Area', sections)
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
