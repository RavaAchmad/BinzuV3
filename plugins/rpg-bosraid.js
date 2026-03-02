import bossRaidSystem from '../lib/boss-raid.js'
import { getDungeonRank } from '../lib/rpg-ranks.js'

let handler = async (m, { conn, args, usedPrefix }) => {
    const user = global.db.data.users[m.sender]
    const subcommand = (args[0] || 'list').toLowerCase()

    switch (subcommand) {
        case 'list': {
            let statusMsg = await conn.sendMessage(m.chat, { text: '⏳ Loading boss raids...' }, { quoted: m })

            try {
                await conn.sendMessage(m.chat, {
                    text: '⏳ Fetching boss data...',
                    edit: statusMsg.key
                })

                let text = `
╭━━━━━━━━━━━━━━━ 💀 ━━━━━━━━━━━━━━╮
┃        AVAILABLE BOSS RAIDS
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`
                const bosses = {
                    golem: {
                        name: '⚫ Stone Golem',
                        minLevel: 30,
                        difficulty: '🔵 EPIC',
                        rewards: '50k Exp, 75k Money, 5 Diamond'
                    },
                    dragon: {
                        name: '🐉 Fire Dragon',
                        minLevel: 50,
                        difficulty: '🔴 LEGENDARY',
                        rewards: '100k Exp, 150k Money, 10 Diamond'
                    },
                    shadowBeast: {
                        name: '🦋 Shadow Beast',
                        minLevel: 70,
                        difficulty: '🟣 EPIC',
                        rewards: '150k Exp, 250k Money, 15 Diamond'
                    },
                    darkLord: {
                        name: '👹 Dark Lord',
                        minLevel: 100,
                        difficulty: '💜 MYTHIC',
                        rewards: '250k Exp, 500k Money, 25 Diamond'
                    }
                }

                Object.entries(bosses).forEach(([key, boss]) => {
                    const canFight = user.level >= boss.minLevel ? '✅' : '❌'
                    text += `${canFight} ${boss.name} ${boss.difficulty}\n`
                    text += `   Level Required: ${boss.minLevel}\n`
                    text += `   Rewards: ${boss.rewards}\n\n`
                })

                text += `\n*Usage:*\n${usedPrefix}bosraid start [bossname]\n${usedPrefix}bosraid attack\n${usedPrefix}bosraid info`

                await conn.sendMessage(m.chat, {
                    text: text,
                    edit: statusMsg.key
                })

            } catch (error) {
                console.error('Error in bosraid list:', error)
                await conn.sendMessage(m.chat, {
                    text: '❌ Error loading bosses',
                    edit: statusMsg.key
                })
            }
            break
        }

        case 'start': {
            const bossName = (args[1] || '').toLowerCase()
            if (!bossName) {
                return m.reply('❌ Specify boss name: golem, dragon, shadowbeast, or darklord')
            }

            let statusMsg = await conn.sendMessage(m.chat, { text: '⏳ Initiating boss raid...' }, { quoted: m })

            try {
                await conn.sendMessage(m.chat, {
                    text: '⏳ Spawning boss...',
                    edit: statusMsg.key
                })

                const raidId = `${m.sender}_${Date.now()}`
                const raid = bossRaidSystem.startRaid(raidId, [m.sender], [user])

                if (!raid) {
                    await conn.sendMessage(m.chat, {
                        text: '❌ Failed to start raid',
                        edit: statusMsg.key
                    })
                    return
                }

                user.bossKills = (user.bossKills || 0) + 1

                await conn.sendMessage(m.chat, {
                    text: '⏳ Preparing your status...',
                    edit: statusMsg.key
                })

                let text = `
╭━━━━━━━━━━━━━━━ ⚔️ ━━━━━━━━━━━━━━╮
┃       BOSS RAID STARTED!
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${raid.boss.emoji} *${raid.boss.name}*
${raid.boss.rarity}

📜 ${raid.boss.description}

⚔️ Health: ${raid.boss.health} HP
💢 Damage: ${raid.boss.damage} per turn
🛡️ Defense: ${raid.boss.defense}

💪 Your Status:
HP: 100/100
Damage Dealt: 0

*Use: ${usedPrefix}bosraid attack to fight!*
`
                await conn.sendMessage(m.chat, {
                    text: text,
                    edit: statusMsg.key
                })

            } catch (error) {
                console.error('Error starting raid:', error)
                await conn.sendMessage(m.chat, {
                    text: '❌ Error starting raid',
                    edit: statusMsg.key
                })
            }
            break
        }

        case 'attack': {
            const raidId = Object.keys(bossRaidSystem.activeRaids).find(rid => rid.includes(m.sender))
            
            if (!raidId) {
                return m.reply('❌ You are not in any active raid!')
            }

            const raid = bossRaidSystem.activeRaids[raidId]
            const playerAttackResult = bossRaidSystem.playerAttack(raidId, m.sender)

            if (!playerAttackResult) {
                return m.reply('❌ Cannot attack now')
            }

            let text = `${playerAttackResult.isCritical ? '💥' : '⚔️'} You deal ${playerAttackResult.damage.toFixed(0)} damage!\n`
            text += `Boss Health: ${playerAttackResult.bossHealth}/${raid.boss.health}\n\n`

            // Boss counterattack
            setTimeout(() => {
                bossRaidSystem.bossAttack(raidId)
                const player = raid.players.find(p => p.id === m.sender)
                text += `💢 Boss attacks back! Your HP: ${Math.max(0, player.health)}%\n`

                if (raid.status === 'WIN') {
                    const rewards = bossRaidSystem.getRaidRewards(raid)
                    user.exp += rewards.exp
                    user.money += rewards.money
                    user.diamond += rewards.diamond
                    text += `\n🎉 *BOSS DEFEATED!*\n`
                    text += `✨ +${rewards.exp} Exp\n`
                    text += `💹 +${rewards.money} Money\n`
                    text += `💎 +${rewards.diamond} Diamond`
                } else if (raid.status === 'LOSS') {
                    text += `\n💀 You were defeated...`
                }

                conn.reply(m.chat, text, m)
            }, 1000)

            m.reply(text)
            break
        }

        case 'info': {
            const raidId = Object.keys(bossRaidSystem.activeRaids).find(rid => rid.includes(m.sender))
            
            if (!raidId) {
                return m.reply('❌ You are not in any active raid!')
            }

            let statusMsg = await conn.sendMessage(m.chat, { text: '⏳ Fetching raid status...' }, { quoted: m })

            try {
                const raid = bossRaidSystem.activeRaids[raidId]
                const statusText = bossRaidSystem.formatRaidStatus(raid)

                await conn.sendMessage(m.chat, {
                    text: statusText,
                    edit: statusMsg.key
                })

            } catch (error) {
                console.error('Error getting raid info:', error)
                await conn.sendMessage(m.chat, {
                    text: '❌ Error fetching raid status',
                    edit: statusMsg.key
                })
            }
            break
        }

        default:
            m.reply(`
*BOSS RAID COMMANDS*

${usedPrefix}bosraid list - View available bosses
${usedPrefix}bosraid start [bossname] - Start raid
${usedPrefix}bosraid attack - Attack boss
${usedPrefix}bosraid info - Check raid status
`)
    }
}

handler.help = ['bosraid [subcommand]']
handler.tags = ['rpg', 'raid']
handler.command = /^(bosraid|boss)$/i
handler.register = true
handler.rpg = true

export default handler
