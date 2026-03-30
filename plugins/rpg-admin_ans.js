import rpgAdmin from '../lib/rpg-admin.js'

/**
 * Season Reset Confirm Handler
 * Pattern: conn.game like game-asahotak_ans.js
 * Catches reply to season reset confirmation message
 */

export async function before(m) {
    let id = 'seasonreset-' + m.chat
    if (!m.quoted || !m.quoted.fromMe || !m.quoted.isBaileys || !m.text)
        return !0
    if (!/Balas pesan ini dengan.*confirm/i.test(m.quoted.text) || !/FULL SEASON RESET/i.test(m.quoted.text))
        return !0

    this.game = this.game ? this.game : {}
    if (!(id in this.game))
        return m.reply('Konfirmasi season reset sudah expired atau tidak ada.')

    if (m.quoted.id == this.game[id][0].id) {
        let data = this.game[id][1]

        // Only owner who initiated can confirm
        if (m.sender !== data.owner) {
            m.reply('❌ Hanya owner yang memulai reset yang bisa konfirmasi!')
            return !0
        }

        let isBatal = /^(batal|cancel|no|tidak)$/i.test(m.text)
        if (isBatal) {
            clearTimeout(this.game[id][2])
            delete this.game[id]
            return m.reply('❌ Season reset *dibatalkan*.')
        }

        let isConfirm = /^confirm$/i.test(m.text.trim())
        if (isConfirm) {
            clearTimeout(this.game[id][2])
            delete this.game[id]

            // Execute the season reset
            try {
                const users = global.db.data.users || {}
                const leaderboards = global.db.data.leaderboards || {}

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
                const groups = Object.entries(this.chats)
                    .filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats && !chat.metadata?.read_only && !chat.metadata?.announce)
                    .map(v => v[0])

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

                for (const gid of groups) {
                    try {
                        await this.sendMessage(gid, { text: announcement })
                    } catch (_) {}
                    await new Promise(r => setTimeout(r, 3000))
                }

                m.reply(`
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
                m.reply(`❌ Error: ${error.message}`)
            }
            return !0
        }

        m.reply('❌ Balas dengan *confirm* atau *batal*')
    }
    return !0
}

export const exp = 0
