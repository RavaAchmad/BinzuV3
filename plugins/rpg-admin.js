import rpgAdmin from "../lib/rpg-admin.js"

/**
 * RPG Admin Control Plugin
 * Owner commands to manage RPG settings and seasonal resets
 */

const pendingSeasonReset = {}

let handler = async (m, { command, args, usedPrefix, conn, isOwner }) => {
    if (!isOwner) {
        return m.reply('❌ Only owner can use this command!')
    }

    // Check if this is a reply-confirm for season reset
    if (m.quoted && m.quoted.key && pendingSeasonReset[m.quoted.key.id]) {
        const entry = pendingSeasonReset[m.quoted.key.id]
        if (entry.user === m.sender && /^confirm$/i.test(m.text?.trim())) {
            delete pendingSeasonReset[m.quoted.key.id]
            return await executeSeasonReset(m, conn, usedPrefix)
        }
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

🔄 *Season Management (Reset tiap 2 bulan):*
${usedPrefix}rpgadmin season check - Check season info
${usedPrefix}rpgadmin season reset - Konfirmasi season reset
${usedPrefix}rpgadmin season execute - Langsung execute reset
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
Reset Interval: 2 bulan

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
                const confirmText = `
⚠️ *SEASON RESET CONFIRMATION*

Ini akan:
✓ Archive data season saat ini
✓ Beri rewards ke top 3 players
✓ Reset daily/weekly/seasonal leaderboards
✓ Keep all-time leaderboard
✓ Reset daily missions
✓ Season naik ke ${rpgAdmin.settings.currentSeason + 1}

${rpgAdmin.formatSeasonResetPreview(Object.values(global.db.data.leaderboards?.alltime || {}).sort((a, b) => b.exp - a.exp))}

*⚡ Balas pesan ini dengan:* confirm
*atau ketik:* ${usedPrefix}rpgadmin season execute
`
                const sent = await conn.sendMessage(m.chat, { text: confirmText.trim() }, { quoted: m })
                if (sent?.key?.id) {
                    pendingSeasonReset[sent.key.id] = { user: m.sender, timestamp: Date.now() }
                    // Auto-expire after 5 minutes
                    setTimeout(() => delete pendingSeasonReset[sent.key.id], 300000)
                }
                return
            }

            if (action === 'execute') {
                return await executeSeasonReset(m, conn, usedPrefix)
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
            try {
                const users = global.db.data.users || {}
                const totalPlayers = Object.keys(users).length
                const totalExp = Object.values(users).reduce((sum, u) => sum + (u.exp || 0), 0)
                const totalMoney = Object.values(users).reduce((sum, u) => sum + (u.money || 0), 0)
                const totalDiamond = Object.values(users).reduce((sum, u) => sum + (u.diamond || 0), 0)
                const totalLevel = Object.values(users).reduce((sum, u) => sum + (u.level || 1), 0)
                const avgLevel = totalPlayers ? Math.round(totalLevel / totalPlayers) : 0

                return m.reply(`
📊 *RPG STATISTICS*

👥 *Player Stats:*
├─ Total Players: ${totalPlayers}
├─ Average Level: ${avgLevel}
└─ Active: ${Math.round(totalPlayers * 0.7)} (est.)

💰 *Economy:*
├─ Total Money: ${totalMoney.toLocaleString('id-ID')}
├─ Total Diamond: ${totalDiamond}
├─ Total Exp: ${totalExp.toLocaleString('id-ID')}
└─ Avg per Player: ${totalPlayers ? Math.round(totalMoney / totalPlayers) : 0} money

🎮 *Game Status:*
├─ RPG Enabled: ${rpgAdmin.settings.rpgEnabled ? '✅' : '❌'}
├─ Event Active: ${rpgAdmin.settings.eventActive ? '✅' : '❌'}
├─ Season: ${rpgAdmin.settings.currentSeason}
└─ Days to Reset: ${rpgAdmin.daysUntilSeasonReset()}
`)

            } catch (error) {
                console.error('Error in admin stats:', error)
                return m.reply('❌ Error loading statistics')
            }
        }

        case 'topplayers':
        case 'topemain': {
            try {
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

                if (sorted.length === 0) return m.reply('No players found')

                let text = '🏆 *TOP 10 PLAYERS*\n\n'
                sorted.forEach((p, idx) => {
                    text += `${idx + 1}. ${p.name}\n`
                    text += `   Lvl ${p.level} | EXP: ${p.exp.toLocaleString('id-ID')} | 💎 ${p.diamond}\n\n`
                })

                return m.reply(text)

            } catch (error) {
                console.error('Error in topplayers:', error)
                return m.reply('❌ Error loading leaderboard')
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

async function executeSeasonReset(m, conn, usedPrefix) {
    try {
        const users = global.db.data.users || {}
        const leaderboards = global.db.data.leaderboards || {}
        const leaderboardData = Object.values(leaderboards.alltime || {})
            .sort((a, b) => b.exp - a.exp)

        const result = rpgAdmin.executeSeasonReset(users, leaderboardData, leaderboards)

        if (!result.success) {
            return m.reply(`❌ Season reset gagal!\nError: ${result.error}`)
        }

        // Build reward report
        let rewardReport = ''
        if (result.actions.rewardsApplied?.length > 0) {
            rewardReport = result.actions.rewardsApplied.map(r => 
                `🏅 *#${r.rank}* ${r.playerName}\n   └─ ${Object.entries(r.reward).map(([k, v]) => `${v}x ${k}`).join(', ')}`
            ).join('\n')
        }

        // Broadcast season reset announcement to all groups
        const groups = Object.entries(conn.chats)
            .filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats && !chat.metadata?.read_only && !chat.metadata?.announce)
            .map(v => v[0])

        const announcement = `
🔄 *SEASON ${result.season} TELAH BERAKHIR!*

🎊 Selamat kepada top players!

${rewardReport || '_Tidak ada rewards_'}

🆕 *Season ${result.actions.newSeason} dimulai sekarang!*
Semua leaderboard seasonal telah direset.
Ayo mainkan RPG dan raih peringkat tertinggi! 🏆

_Good luck, adventurers!_ ⚔️
`.trim()

        for (const id of groups) {
            try {
                await conn.sendMessage(id, { text: announcement })
            } catch (_) {}
            await new Promise(r => setTimeout(r, 3000))
        }

        return m.reply(`
✅ *SEASON RESET BERHASIL!*

📊 *Report:*
├─ Old Season: ${result.season}
├─ New Season: ${result.actions.newSeason}
├─ Rewards Distributed: ${result.actions.rewardsApplied?.length || 0} players
├─ Leaderboards Reset: ${result.actions.resetLeaderboards?.join(', ') || 'none'}
├─ Missions Reset: ${result.actions.missionsReset || 0} players
└─ Broadcast: ${groups.length} groups

${rewardReport ? `\n🏆 *Rewarded Players:*\n${rewardReport}` : ''}
`.trim())

    } catch (error) {
        console.error('Season reset error:', error)
        return m.reply(`❌ Error: ${error.message}`)
    }
}
