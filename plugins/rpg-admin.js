import rpgAdmin from "../lib/rpg-admin.js"

/**
 * RPG Admin Control Plugin v2.0
 * Full season wipe + MLBB rewards + season fix
 * Confirm pattern: conn.game (like game-asahotak.js)
 */

const CONFIRM_TIMEOUT = 300000 // 5 menit

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
• ${usedPrefix}rpgadmin settings
• ${usedPrefix}rpgadmin toggle
• ${usedPrefix}rpgadmin multiplier [type] [value]

🎉 *Events:*
• ${usedPrefix}rpgadmin event [on/off]
• ${usedPrefix}rpgadmin eventbonus [1.5-5.0]

🔄 *Season (Reset tiap 2 bulan, FULL WIPE):*
• ${usedPrefix}rpgadmin season check
• ${usedPrefix}rpgadmin season preview
• ${usedPrefix}rpgadmin season reset _(konfirmasi)_
• ${usedPrefix}rpgadmin season execute _(langsung)_
• ${usedPrefix}rpgadmin season manual [number]
• ${usedPrefix}rpgadmin season rewards _(lihat reward table)_

🔧 *Season Fix:*
• ${usedPrefix}rpgadmin fix rewards [season] _(re-apply rewards)_
• ${usedPrefix}rpgadmin fix wipe [jid] _(re-wipe 1 user)_

📊 *Statistics:*
• ${usedPrefix}rpgadmin stats
• ${usedPrefix}rpgadmin topplayers
`.trim())
        }

        case 'settings':
        case 'pengaturan': {
            return m.reply(rpgAdmin.formatSettings())
        }

        case 'toggle':
        case 'aktif': {
            rpgAdmin.updateSetting('rpgEnabled', !rpgAdmin.settings.rpgEnabled)
            return m.reply(`✅ RPG is now: ${rpgAdmin.settings.rpgEnabled ? '✅ ENABLED' : '❌ DISABLED'}`)
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
                return m.reply(`✅ ${type} multiplier set to ${value}x`)
            }

            return m.reply('❌ Unknown multiplier type! Available: diamond, exp, money')
        }

        case 'event':
        case 'acara': {
            const status = (args[1] || 'off').toLowerCase()

            if (status === 'on' || status === 'mulai') {
                rpgAdmin.updateSetting('eventActive', true)
                return m.reply(`✅ *Event Activated!* Bonus: ${rpgAdmin.settings.eventBonus}x rewards`)
            } else if (status === 'off' || status === 'stop') {
                rpgAdmin.updateSetting('eventActive', false)
                return m.reply(`✅ *Event Deactivated.* Rewards back to normal.`)
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
            return m.reply(`✅ Event bonus set to ${bonus}x (${(bonus - 1) * 100}% extra)`)
        }

        case 'season':
        case 'musim': {
            const action = (args[1] || 'info').toLowerCase()

            if (action === 'check' || action === 'info') {
                const daysLeft = rpgAdmin.daysUntilSeasonReset()
                const resetDate = new Date(rpgAdmin.settings.lastSeasonReset + rpgAdmin.settings.seasonResetInterval)

                return m.reply(`
📊 *SEASON ${rpgAdmin.settings.currentSeason} INFO*

⏰ Sisa waktu: *${daysLeft} hari*
📅 Reset: *${resetDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*
📆 Last Reset: ${new Date(rpgAdmin.settings.lastSeasonReset).toLocaleDateString('id-ID')}
🔄 Interval: 2 bulan

${daysLeft <= 7 ? '🚨 *SEASON RESET SEGERA!*' : daysLeft <= 30 ? '⚠️ Kurang dari 1 bulan lagi!' : 'ℹ️ Season masih berjalan'}
`)
            }

            if (action === 'preview') {
                const users = global.db.data.users || {}
                return m.reply(rpgAdmin.formatSeasonResetPreview(users))
            }

            if (action === 'rewards' || action === 'reward') {
                return m.reply(rpgAdmin.formatRewardTable())
            }

            if (action === 'reset') {
                conn.game = conn.game ? conn.game : {}
                let gameId = 'seasonreset-' + m.chat
                if (gameId in conn.game) {
                    return m.reply('⚠️ Masih ada konfirmasi season reset yang pending di chat ini!')
                }

                const users = global.db.data.users || {}
                const confirmText = `
⚠️ *FULL SEASON RESET — KONFIRMASI*

🚨 *INI AKAN MENGHAPUS SEMUA DATA RPG!*
Semua level, money, items, equipment, pets — WIPE TOTAL.

${rpgAdmin.formatSeasonResetPreview(users)}

Balas pesan ini dengan *confirm* untuk melanjutkan
Ketik *batal* untuk membatalkan

Timeout *${(CONFIRM_TIMEOUT / 1000 / 60).toFixed(0)} menit*
`.trim()

                conn.game[gameId] = [
                    await m.reply(confirmText),
                    { owner: m.sender, usedPrefix },
                    setTimeout(() => {
                        if (conn.game[gameId]) {
                            conn.reply(m.chat, '⏰ Waktu konfirmasi season reset habis. Silakan ulangi.', conn.game[gameId][0])
                        }
                        delete conn.game[gameId]
                    }, CONFIRM_TIMEOUT)
                ]
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
Actions: check, preview, rewards, reset, execute, manual [number]
`)
        }

        case 'fix': {
            const fixAction = (args[1] || '').toLowerCase()

            if (fixAction === 'rewards' || fixAction === 'reward') {
                const targetSeason = parseInt(args[2])
                if (!targetSeason) {
                    return m.reply(`❌ Masukkan nomor season!\nContoh: ${usedPrefix}rpgadmin fix rewards 1`)
                }

                const users = global.db.data.users || {}
                const result = rpgAdmin.fixSeasonRewards(users, targetSeason)

                if (!result.success) {
                    return m.reply(`❌ ${result.error}`)
                }

                if (result.fixed.length === 0) {
                    return m.reply(`ℹ️ Semua player di season ${targetSeason} sudah mendapat reward.`)
                }

                let fixReport = result.fixed.map(f =>
                    `✅ *#${f.rank}* ${f.name}\n   └─ ${f.reward.tierTitle}: ${Object.entries(f.reward.items).map(([k, v]) => `${v}x ${k}`).join(', ')}`
                ).join('\n')

                return m.reply(`
🔧 *SEASON FIX — Rewards Restored*

Season: ${targetSeason}
Fixed: ${result.fixed.length} players

${fixReport}
`.trim())
            }

            if (fixAction === 'wipe') {
                const targetJid = args[2]
                if (!targetJid) {
                    return m.reply(`❌ Masukkan JID user!\nContoh: ${usedPrefix}rpgadmin fix wipe 628xxx@s.whatsapp.net`)
                }

                const users = global.db.data.users || {}
                const result = rpgAdmin.fixResetUser(users, targetJid)

                if (!result.success) {
                    return m.reply(`❌ ${result.error}`)
                }

                return m.reply(`✅ User ${targetJid} telah di-wipe ulang.`)
            }

            return m.reply(`
🔧 *Season Fix Commands:*
• ${usedPrefix}rpgadmin fix rewards [season] — Re-apply rewards yang belum diterima
• ${usedPrefix}rpgadmin fix wipe [jid] — Wipe ulang data RPG 1 user
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
📊 *RPG STATISTICS — Season ${rpgAdmin.settings.currentSeason}*

👥 Total Players: ${totalPlayers} | Avg Level: ${avgLevel}
💰 Total Money: ${totalMoney.toLocaleString('id-ID')}
💎 Total Diamond: ${totalDiamond.toLocaleString('id-ID')}
⭐ Total Exp: ${totalExp.toLocaleString('id-ID')}
🎮 RPG: ${rpgAdmin.settings.rpgEnabled ? '✅' : '❌'} | Event: ${rpgAdmin.settings.eventActive ? '✅' : '❌'}
📅 Days to Reset: ${rpgAdmin.daysUntilSeasonReset()}
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
                const ranking = rpgAdmin.buildRanking(users).slice(0, 10)

                if (ranking.length === 0) return m.reply('No players found')

                const medals = ['🏆', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
                let text = `🏆 *TOP 10 PLAYERS — Season ${rpgAdmin.settings.currentSeason}*\n\n`
                ranking.forEach((p, idx) => {
                    const tier = rpgAdmin.getRewardTier(idx + 1)
                    const tierInfo = rpgAdmin.seasonalRewards.tiers[tier]
                    text += `${medals[idx]} *${p.name}*\n`
                    text += `   Lvl ${p.level} | EXP: ${p.exp.toLocaleString('id-ID')} | 💎 ${p.diamond}\n`
                    text += `   └─ Reward: ${tierInfo?.title || '-'}\n\n`
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

        // Build ranking from actual user data (not leaderboard)
        const ranking = rpgAdmin.buildRanking(users)

        const result = rpgAdmin.executeSeasonReset(users, leaderboards)

        if (!result.success) {
            return m.reply(`❌ Season reset gagal!\nError: ${result.error}`)
        }

        // Build reward report
        let rewardReport = ''
        if (result.actions.rewardsApplied?.length > 0) {
            rewardReport = result.actions.rewardsApplied
                .filter(r => r.reward)
                .map(r =>
                    `${r.reward.tierTitle} *#${r.rank}* ${r.name}\n   └─ ${Object.entries(r.reward.items).map(([k, v]) => `${v.toLocaleString('id-ID')}x ${k}`).join(', ')}`
                ).join('\n')
        }

        // Broadcast to all groups
        const groups = Object.entries(conn.chats)
            .filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats && !chat.metadata?.read_only && !chat.metadata?.announce)
            .map(v => v[0])

        // Format top 3 for announcement
        const top3 = (result.actions.rewardsApplied || []).slice(0, 3)
        let top3Text = top3.map(r =>
            `${r.reward?.tierTitle || ''} *${r.name}* — ${r.reward?.seasonTitle || ''}`
        ).join('\n')

        const announcement = `
🔄 *SEASON ${result.season} TELAH BERAKHIR!*

━━━━━━━━━━━━━━━━━━━━━━━━

🏆 *TOP 3 PLAYER SEASON ${result.season}:*
${top3Text || '_Tidak ada data_'}

━━━━━━━━━━━━━━━━━━━━━━━━

📊 *Total ${result.actions.wipedPlayers} pemain* telah di-reset.
🎁 *${result.actions.rewardsApplied?.length || 0} pemain* mendapat season rewards!

🆕 *Season ${result.actions.newSeason} dimulai SEKARANG!*

⚔️ Semua data RPG telah direset.
Mulai dari awal dan buktikan siapa yang terbaik!

_Grind, battle, dan raih peringkat tertinggi!_ 💪
`.trim()

        for (const id of groups) {
            try {
                await conn.sendMessage(id, { text: announcement })
            } catch (_) {}
            await new Promise(r => setTimeout(r, 3000))
        }

        return m.reply(`
✅ *SEASON ${result.season} RESET BERHASIL!*

📊 *Report:*
├─ Season: ${result.season} → ${result.actions.newSeason}
├─ Players Wiped: ${result.actions.wipedPlayers}
├─ Rewards Given: ${result.actions.rewardsApplied?.length || 0} players (top 50)
├─ Leaderboards Reset: ${result.actions.resetLeaderboards?.join(', ') || 'none'}
└─ Broadcast: ${groups.length} groups

${rewardReport ? `\n🏆 *Rewarded Players:*\n${rewardReport}` : ''}
`.trim())

    } catch (error) {
        console.error('Season reset error:', error)
        return m.reply(`❌ Error: ${error.message}`)
    }
}
