import { WorldBossSystem, WORLD_BOSSES, RARE_DROPS } from '../lib/world-boss-system.js'
import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, args, command }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const user = await RPGHandler.initializeUser(global.db, userId, userName)
    const db = global.db.data

    if (!db.worldBosses) db.worldBosses = {}

    if (command === 'worldboss' || command === 'bossevent') {
      if (!args[0]) {
        // Show current active boss
        let activeBoss = null
        let bossId = null

        for (const bid of Object.keys(db.worldBosses)) {
          const boss = db.worldBosses[bid]
          if (!boss.defeated && Date.now() < boss.despawnTime) {
            activeBoss = boss
            bossId = bid
            break
          }
        }

        if (!activeBoss) {
          await conn.sendMessage(m.chat, { text: '❌ Tidak ada world boss sedang aktif' }, { quoted: m })
          return
        }

        const status = WorldBossSystem.getBossStatus(activeBoss)

        let text = `╔═══════════════════════════════╗\n`
        text += `║      ⚔️ WORLD BOSS EVENT ⚔️   ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        text += `${status.emoji} ${status.name}\n\n`

        text += `*HP:* ${status.hp}\n`
        text += `📊 Health: ${status.healthPercent.toFixed(1)}%\n\n`

        text += `*Participants:* ${status.participants}\n`
        text += `*Total Damage:* ${status.totalDamage.toLocaleString('id-ID')}\n\n`

        if (status.topDamager.userId) {
          text += `*Top Damage:* ${status.topDamager.userId}\n`
          text += `Damage: ${status.topDamager.damage}\n`
        }

        text += `\n_Use !worldboss attack to fight_`

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'spawn') {
        if (!m.isAdmin && m.sender !== m.isOwner) {
          await conn.sendMessage(m.chat, { text: '❌ Admin only' }, { quoted: m })
          return
        }

        const bossType = args[1] || Object.keys(WORLD_BOSSES)[0]

        if (!WORLD_BOSSES[bossType]) {
          await conn.sendMessage(m.chat, { text: '❌ Boss type tidak valid' }, { quoted: m })
          return
        }

        const bossEvent = WorldBossSystem.spawnWorldBoss(bossType)
        db.worldBosses[bossEvent.id] = bossEvent

        let text = `🌟 **WORLD BOSS SPAWNED!**\n\n`
        text += `${bossEvent.emoji} ${bossEvent.name}\n`
        text += `HP: ${bossEvent.maxHp}\n\n`
        text += `_!worldboss attack to fight_`

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'attack') {
        let activeBoss = null
        let bossId = null

        for (const bid of Object.keys(db.worldBosses)) {
          const boss = db.worldBosses[bid]
          if (!boss.defeated && Date.now() < boss.despawnTime) {
            activeBoss = boss
            bossId = bid
            break
          }
        }

        if (!activeBoss) {
          await conn.sendMessage(m.chat, { text: '❌ Tidak ada boss aktif' }, { quoted: m })
          return
        }

        // Check cooldown
        if (!user.worldBossLastAttack) user.worldBossLastAttack = 0
        if (Date.now() - user.worldBossLastAttack < 5000) {
          await conn.sendMessage(m.chat, { text: '⏳ Tunggu untuk serangan berikutnya' }, { quoted: m })
          return
        }

        // Calculate damage
        const baseDamage = user.stats?.str * 2 || 20
        const damage = Math.floor(baseDamage + (Math.random() * baseDamage * 0.5))

        // Attack boss
        const result = WorldBossSystem.attackBoss(activeBoss, userId, damage)

        if (!result.success) {
          await conn.sendMessage(m.chat, { text: `❌ ${result.message}` }, { quoted: m })
          return
        }

        user.worldBossLastAttack = Date.now()

        let text = `⚔️ *Attack!*\n\n`
        text += `Damage: ${result.damage}\n`
        text += `Boss HP: ${result.currentHp}/${result.maxHp}\n`
        text += `Health: ${result.healthPercent.toFixed(1)}%`

        if (result.bossDefeated) {
          text += `\n\n🎉 **Boss Defeated!**\n`
          activeBoss.defeated = true
          activeBoss.defeatedBy = userId

          // Calculate and submit rewards
          const completion = WorldBossSystem.completeBossFight(activeBoss)
          text += `Total participants: ${completion.topDamagers.length}`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
        await RPGHandler.updateUser(global.db, userId, user)
      } else if (args[0].toLowerCase() === 'ranking') {
        let activeBoss = null

        for (const bid of Object.keys(db.worldBosses)) {
          const boss = db.worldBosses[bid]
          if (!boss.defeated && Date.now() < boss.despawnTime) {
            activeBoss = boss
            break
          }
        }

        if (!activeBoss) {
          await conn.sendMessage(m.chat, { text: '❌ Tidak ada boss aktif' }, { quoted: m })
          return
        }

        const ranking = WorldBossSystem.getDamageRanking(activeBoss, 10)

        let text = `╔═══════════════════════════════╗\n`
        text += `║    🏆 DAMAGE RANKING 🏆     ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        for (const entry of ranking) {
          text += `${entry.rank}. ${entry.userId}\n`
          text += `Damage: ${entry.damage} (${entry.percent}%)\n\n`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'contribution') {
        let activeBoss = null

        for (const bid of Object.keys(db.worldBosses)) {
          const boss = db.worldBosses[bid]
          if (!boss.defeated && Date.now() < boss.despawnTime) {
            activeBoss = boss
            break
          }
        }

        if (!activeBoss) {
          await conn.sendMessage(m.chat, { text: '❌ Tidak ada boss aktif' }, { quoted: m })
          return
        }

        const contribution = WorldBossSystem.getPersonalContribution(activeBoss, userId)

        let text = `╔═══════════════════════════════╗\n`
        text += `║      📊 YOUR CONTRIBUTION     ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        if (contribution.contributed) {
          text += `Damage: ${contribution.damage}\n`
          text += `Percentage: ${contribution.percent}%`
        } else {
          text += `Belum ikut serta`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      }
    }
  } catch (error) {
    console.error('Error in worldboss command:', error)
    await conn.sendMessage(m.chat, { text: `❌ Error: ${error.message}` }, { quoted: m })
  }
}

handler.help = ['worldboss', 'bossevent']
handler.tags = ['rpg']
handler.command = /^(worldboss|bossevent)(?: (.+))?$/i

export default handler
