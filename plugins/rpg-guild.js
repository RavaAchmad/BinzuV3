import { GuildSystem, GUILD_RANKS, GUILD_UPGRADE_TIERS } from '../lib/guild-system.js'
import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, args, command }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const user = await RPGHandler.initializeUser(global.db, userId, userName)
    const db = global.db.data

    if (!db.guilds) db.guilds = {}

    if (command === 'guild') {
      if (!args[0]) {
        // Check if user has guild
        let userGuild = null
        for (const guildId of Object.keys(db.guilds)) {
          const guild = db.guilds[guildId]
          if (guild.members.find(m => m.userId === userId)) {
            userGuild = guild
            break
          }
        }

        let text = `╔═══════════════════════════════╗\n`
        text += `║       🏰 GUILD STATUS 🏰     ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        if (userGuild) {
          const stats = GuildSystem.getGuildStats(userGuild)
          text += `*Guild:* ${stats.name}\n`
          text += `*Level:* ${stats.level}\n`
          text += `*Tier:* ${stats.tier?.name}\n`
          text += `*Members:* ${stats.memberCount}\n`
          text += `*Vault:* ${stats.vault} / ${stats.vaultCapacity}\n`
          text += `\n_Use !guild info for details_`
        } else {
          text += `No guild yet.\n_!guild create <name> to create_`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'create') {
        const guildName = args.slice(1).join(' ')
        if (!guildName) {
          await conn.sendMessage(m.chat, { text: '❌ Usage: !guild create <name>' }, { quoted: m })
          return
        }

        const result = GuildSystem.createGuild(guildName, userId, user)

        if (result.success) {
          db.guilds[result.guild.id] = result.guild
          user.money -= result.cost

          let text = `🏰 Guild created!\n\n`
          text += `*${result.guild.name}*\n`
          text += `Guild ID: ${result.guild.id}\n`
          text += `Cost: ${result.cost.toLocaleString('id-ID')} gold`

          await conn.sendMessage(m.chat, { text: text }, { quoted: m })
          await RPGHandler.updateUser(global.db, userId, user)
        }
      } else if (args[0].toLowerCase() === 'info') {
        let userGuild = null
        for (const guildId of Object.keys(db.guilds)) {
          const guild = db.guilds[guildId]
          if (guild.members.find(m => m.userId === userId)) {
            userGuild = guild
            break
          }
        }

        if (!userGuild) {
          await conn.sendMessage(m.chat, { text: '❌ Anda tidak punya guild' }, { quoted: m })
          return
        }

        const stats = GuildSystem.getGuildStats(userGuild)
        let text = `╔═══════════════════════════════╗\n`
        text += `║       🏰 GUILD INFO 🏰       ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        for (const [key, val] of Object.entries(stats)) {
          text += `*${key.charAt(0).toUpperCase() +  key.slice(1)}:* ${val}\n`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'members') {
        let userGuild = null
        for (const guildId of Object.keys(db.guilds)) {
          const guild = db.guilds[guildId]
          if (guild.members.find(m => m.userId === userId)) {
            userGuild = guild
            break
          }
        }

        if (!userGuild) {
          await conn.sendMessage(m.chat, { text: '❌ Anda tidak punya guild' }, { quoted: m })
          return
        }

        let text = `╔═══════════════════════════════╗\n`
        text += `║      👥 GUILD MEMBERS 👥     ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        for (let i = 0; i < userGuild.members.length; i++) {
          const member = userGuild.members[i]
          const memberInfo = GuildSystem.getMemberInfo(userGuild, member.userId)
          text += `${i + 1}. ${memberInfo.rankEmoji} ${member.userId}\n`
          text += `   Rank: ${memberInfo.rankTitle}\n`
          text += `   Contribution: ${member.contribution.toLocaleString('id-ID')}\n\n`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'deposit') {
        const amount = parseInt(args[1])
        if (!amount || isNaN(amount)) {
          await conn.sendMessage(m.chat, { text: '❌ Usage: !guild deposit <amount>' }, { quoted: m })
          return
        }

        let userGuild = null
        let guildId = null
        for (const gId of Object.keys(db.guilds)) {
          const guild = db.guilds[gId]
          if (guild.members.find(m => m.userId === userId)) {
            userGuild = guild
            guildId = gId
            break
          }
        }

        if (!userGuild) {
          await conn.sendMessage(m.chat, { text: '❌ Anda tidak punya guild' }, { quoted: m })
          return
        }

        const result = GuildSystem.depositToVault(userGuild, userId, amount, user)

        if (result.success) {
          db.guilds[guildId] = userGuild
          await conn.sendMessage(m.chat, { text: `✅ ${result.message}` }, { quoted: m })
          await RPGHandler.updateUser(global.db, userId, user)
        } else {
          await conn.sendMessage(m.chat, { text: `❌ ${result.reason}` }, { quoted: m })
        }
      }
    }
  } catch (error) {
    console.error('Error in guild command:', error)
    await conn.sendMessage(m.chat, { text: `❌ Error: ${error.message}` }, { quoted: m })
  }
}

handler.help = ['guild']
handler.tags = ['rpg']
handler.command = /^guild(?: (.+))?$/i

export default handler
