import rpgAdmin from "../lib/rpg-admin.js"

/**
 * RPG Admin Control Plugin
 * Owner commands to manage RPG settings and seasonal resets
 */

let handler = async (m, { command, args, usedPrefix, conn, isOwner }) => {
    if (!isOwner) {
        return m.reply('❌ Only owner can use this command!')
    }

    const subcommand = (args[0] || 'menu').toLowerCase()

    switch(subcommand) {
        case 'menu':
        case 'help':
        case 'bantuan': {
            return m.reply(`
🎮 *RPG ADMIN CONTROL PANEL*

${rpgAdmin.formatSettings()}

📋 *AVAILABLE COMMANDS:*

⚙️ *Settings:*
${usedPrefix}rpgadmin settings - View all settings
${usedPrefix}rpgadmin toggle - Enable/disable RPG
${usedPrefix}rpgadmin multiplier [type] [value] - Set reward multiplier
  └─ Types: diamond, exp, money (value 0.5-3.0)

🎉 *Events:*
${usedPrefix}rpgadmin event [on/off] - Toggle event mode
${usedPrefix}rpgadmin eventbonus [multiplier] - Set event bonus (1.5-5.0)

🔄 *Season Management:*
${usedPrefix}rpgadmin season check - Check season info
${usedPrefix}rpgadmin season reset - Execute season reset
${usedPrefix}rpgadmin season preview - Preview reset results
${usedPrefix}rpgadmin season manual [number] - Manually set season

📊 *Statistics:*
${usedPrefix}rpgadmin stats - View RPG statistics
${usedPrefix}rpgadmin topplayers - View top 10 players

⚡ *EXAMPLES:*
${usedPrefix}rpgadmin multiplier diamond 1.5
${usedPrefix}rpgadmin event on
${usedPrefix}rpgadmin eventbonus 2.0
${usedPrefix}rpgadmin season reset
`.trim())
        }

        case 'settings':
        case 'pengaturan': {
            return m.reply(rpgAdmin.formatSettings())
        }

        case 'toggle':
        case 'aktif': {
            rpgAdmin.updateSetting('rpgEnabled', !rpgAdmin.settings.rpgEnabled)
            return m.reply(`
✅ *RPG Status Changed*

RPG is now: ${rpgAdmin.settings.rpgEnabled ? '✅ ENABLED' : '❌ DISABLED'}
`)
        }

        case 'multiplier':
        case 'pengganda': {
            const type = (args[1] || 'diamond').toLowerCase()
            const value = parseFloat(args[2]) || 1.0

            if (value < 0.5 || value > 3.0) {
                return m.reply('❌ Multiplier must be between 0.5 and 3.0!')
            }

            const typeKey = `${type}RateMultiplier`
            if (typeKey in rpgAdmin.settings) {
                rpgAdmin.updateSetting(typeKey, value)
                return m.reply(`
✅ *Multiplier Updated*

Type: ${type}
New Value: ${value}x
Old Value: ${rpgAdmin.settings[typeKey]}x
`)
            }

            return m.reply('❌ Unknown multiplier type! Available: diamond, exp, money')
        }

        case 'event':
        case 'acara': {
            const status = (args[1] || 'off').toLowerCase()

            if (status === 'on' || status === 'mulai') {
                rpgAdmin.updateSetting('eventActive', true)
                return m.reply(`
✅ *Event Activated*

Event Mode: ✅ ON
Current Bonus: ${(rpgAdmin.settings.eventBonus - 1) * 100}% extra rewards

All rewards will be multiplied by ${rpgAdmin.settings.eventBonus}x!
`)
            } else if (status === 'off' || status === 'stop') {
                rpgAdmin.updateSetting('eventActive', false)
                return m.reply(`
✅ *Event Deactivated*

Event Mode: ❌ OFF
Rewards are back to normal multiplier
`)
            }

            return m.reply('Usage: ' + usedPrefix + 'rpgadmin event [on/off]')
        }

        case 'eventbonus':
        case 'bonusacara': {
            const bonus = parseFloat(args[1]) || 1.5

            if (bonus < 1.5 || bonus > 5.0) {
                return m.reply('❌ Event bonus must be between 1.5x and 5.0x!')
            }

            rpgAdmin.updateSetting('eventBonus', bonus)
            return m.reply(`
✅ *Event Bonus Updated*

New Bonus: ${bonus}x (${(bonus - 1) * 100}% extra)
Effect: All rewards × ${bonus} during event
`)
        }

        case 'season':
        case 'musim': {
            const action = (args[1] || 'info').toLowerCase()

            if (action === 'check' || action === 'info') {
                const daysLeft = rpgAdmin.daysUntilSeasonReset()
                const resetDate = new Date(rpgAdmin.settings.lastSeasonReset + rpgAdmin.settings.seasonResetInterval)

                return m.reply(`
📊 *SEASON INFORMATION*

Current Season: ${rpgAdmin.settings.currentSeason}
Days Until Reset: ${daysLeft}
Reset Date: ${resetDate.toLocaleDateString('id-ID')}

Last Reset: ${new Date(rpgAdmin.settings.lastSeasonReset).toLocaleDateString('id-ID')}
Reset Interval: 6 months

${daysLeft < 7 ? '⚠️ SEASON RESET COMING SOON!' : 'ℹ️ Season is stable'}
`)
            }

            if (action === 'preview') {
                // Get leaderboard data from global db
                let leaderboardData = []
                if (global.db.data.leaderboards?.alltime) {
                    leaderboardData = Object.values(global.db.data.leaderboards.alltime)
                        .sort((a, b) => b.exp - a.exp)
                        .slice(0, 10)
                }

                return m.reply(rpgAdmin.formatSeasonResetPreview(leaderboardData))
            }

            if (action === 'reset') {
                // Confirm reset is needed
                const text = `
⚠️ *SEASON RESET CONFIRMATION*

This will:
✓ Archive current season data
✓ Give rewards to top 3 players
✓ Reset daily/weekly/seasonal leaderboards
✓ Keep all-time leaderboard
✓ Reset daily missions
✓ Increment season to ${rpgAdmin.settings.currentSeason + 1}

*REPLY WITH: confirm*
Type this to confirm season reset!

${rpgAdmin.formatSeasonResetPreview(Object.values(global.db.data.leaderboards?.alltime || {}).sort((a, b) => b.exp - a.exp))}
`
                return m.reply(text)
            }

            if (action === 'manual') {
                const newSeason = parseInt(args[2])
                if (!newSeason || newSeason < 1) {
                    return m.reply('❌ Invalid season number!')
                }

                rpgAdmin.settings.currentSeason = newSeason
                return m.reply(`✅ Season manually set to: ${newSeason}`)
            }

            return m.reply(`
Usage: ${usedPrefix}rpgadmin season [action]
Actions: check, preview, reset, manual [number]
`)
        }

        case 'stats':
        case 'statistik': {
            let statusMsg = await conn.sendMessage(m.chat, { text: '⏳ Loading RPG statistics...' }, { quoted: m })

            try {
                await conn.sendMessage(m.chat, {
                    text: '⏳ Calculating player data...',
                    edit: statusMsg.key
                })

                const users = global.db.data.users || {}
                const totalPlayers = Object.keys(users).length
                const totalExp = Object.values(users).reduce((sum, u) => sum + (u.exp || 0), 0)
                const totalMoney = Object.values(users).reduce((sum, u) => sum + (u.money || 0), 0)
                const totalDiamond = Object.values(users).reduce((sum, u) => sum + (u.diamond || 0), 0)
                const totalLevel = Object.values(users).reduce((sum, u) => sum + (u.level || 1), 0)
                const avgLevel = Math.round(totalLevel / totalPlayers)

                await conn.sendMessage(m.chat, {
                    text: '⏳ Formatting statistics...',
                    edit: statusMsg.key
                })

                const reply = `
📊 *RPG STATISTICS*

👥 *Player Stats:*
├─ Total Players: ${totalPlayers}
├─ Average Level: ${avgLevel}
└─ Active: ${Math.round(totalPlayers * 0.7)} (est.)

💰 *Economy:*
├─ Total Money: ${totalMoney.toLocaleString('id-ID')}
├─ Total Diamond: ${totalDiamond}
├─ Total Exp: ${totalExp.toLocaleString('id-ID')}
└─ Avg per Player: ${Math.round(totalMoney / totalPlayers)} money

🎮 *Game Status:*
├─ RPG Enabled: ${rpgAdmin.settings.rpgEnabled ? '✅' : '❌'}
├─ Event Active: ${rpgAdmin.settings.eventActive ? '✅' : '❌'}
├─ Season: ${rpgAdmin.settings.currentSeason}
└─ Days to Reset: ${rpgAdmin.daysUntilSeasonReset()}
`

                await conn.sendMessage(m.chat, {
                    text: reply,
                    edit: statusMsg.key
                })

            } catch (error) {
                console.error('Error in admin stats:', error)
                await conn.sendMessage(m.chat, {
                    text: '❌ Error loading statistics',
                    edit: statusMsg.key
                })
            }
        }

        case 'topplayers':
        case 'topemain': {
            let statusMsg = await conn.sendMessage(m.chat, { text: '⏳ Fetching player rankings...' }, { quoted: m })

            try {
                await conn.sendMessage(m.chat, {
                    text: '⏳ Sorting player data...',
                    edit: statusMsg.key
                })

                const users = global.db.data.users || {}
                const sorted = Object.entries(users)
                    .map(([id, user]) => ({
                        id,
                        name: user.name || 'Unknown',
                        level: user.level || 1,
                        exp: user.exp || 0,
                        money: user.money || 0,
                        diamond: user.diamond || 0
                    }))
                    .sort((a, b) => b.level - a.level || b.exp - a.exp)
                    .slice(0, 10)

                if (sorted.length === 0) {
                    await conn.sendMessage(m.chat, {
                        text: 'No players found',
                        edit: statusMsg.key
                    })
                    return
                }

                await conn.sendMessage(m.chat, {
                    text: '⏳ Formatting leaderboard...',
                    edit: statusMsg.key
                })

                let text = '🏆 *TOP 10 PLAYERS*\n\n'
                sorted.forEach((p, idx) => {
                    text += `${idx + 1}. ${p.name}\n`
                    text += `   Lvl ${p.level} | EXP: ${p.exp.toLocaleString('id-ID')} | 💎 ${p.diamond}\n\n`
                })

                await conn.sendMessage(m.chat, {
                    text: text,
                    edit: statusMsg.key
                })

            } catch (error) {
                console.error('Error in topplayers:', error)
                await conn.sendMessage(m.chat, {
                    text: '❌ Error loading leaderboard',
                    edit: statusMsg.key
                })
            }
        }

        default:
            return m.reply(`Unknown command! Type: ${usedPrefix}rpgadmin menu`)
    }
}

handler.help = ['rpgadmin'].map(v => v + ' [subcommand]')
handler.tags = ['owner']
handler.command = /^(rpgadmin|adminrpg)$/i
handler.owner = true

export default handler
