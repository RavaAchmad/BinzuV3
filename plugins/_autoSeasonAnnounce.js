import rpgAdmin from '../lib/rpg-admin.js'

/**
 * Auto Season Announcement System
 * Broadcasts season reset warnings to all groups
 * 4x in the last month before reset (weekly: week 4, 3, 2, 1)
 * 
 * WhatsApp formatting:
 * *bold*  _italic_  ~strikethrough~  ```monospace```
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

// Track last announcement to avoid duplicates
let lastAnnouncedWeek = 0
let lastAnnouncedTime = 0

export async function all(m, { conn }) {
    // Only run once per hour minimum, and only from one message trigger
    if (Date.now() - lastAnnouncedTime < 3600000) return
    
    const daysLeft = rpgAdmin.daysUntilSeasonReset()
    
    // Only announce in last 30 days
    if (daysLeft > 30 || daysLeft < 0) return
    
    // Determine which week announcement (4 = 30-24 days, 3 = 23-17, 2 = 16-10, 1 = 9-1)
    let weekNumber = 0
    if (daysLeft >= 24 && daysLeft <= 30) weekNumber = 4
    else if (daysLeft >= 17 && daysLeft <= 23) weekNumber = 3
    else if (daysLeft >= 10 && daysLeft <= 16) weekNumber = 2
    else if (daysLeft >= 1 && daysLeft <= 9) weekNumber = 1
    
    if (weekNumber === 0) return
    
    // Already announced this week?
    if (lastAnnouncedWeek === weekNumber) return
    
    // Check if it's the right day (announce on first day of each week window)
    const targetDays = { 4: 30, 3: 23, 2: 16, 1: 9 }
    if (daysLeft !== targetDays[weekNumber]) return
    
    lastAnnouncedWeek = weekNumber
    lastAnnouncedTime = Date.now()

    const groups = Object.entries(conn.chats)
        .filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats && !chat.metadata?.read_only && !chat.metadata?.announce)
        .map(v => v[0])

    if (groups.length === 0) return

    const season = rpgAdmin.settings.currentSeason
    const resetDate = new Date(rpgAdmin.settings.lastSeasonReset + rpgAdmin.settings.seasonResetInterval)
    const resetDateStr = resetDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    // Get top 5 players from actual user data using rpgAdmin
    let topPlayersText = '_Belum ada data_'
    let rewardTableShort = ''
    try {
        const users = global.db.data.users || {}
        const ranking = rpgAdmin.buildRanking(users).slice(0, 5)
        
        if (ranking.length > 0) {
            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
            topPlayersText = ranking.map((p, i) => {
                const tier = rpgAdmin.getRewardTier(i + 1)
                const tierInfo = rpgAdmin.seasonalRewards.tiers[tier]
                return `${medals[i]} *${p.name}* — Lvl ${p.level} | 💎${p.diamond}\n   └─ Reward: ${tierInfo?.title || '-'}`
            }).join('\n')
        }

        // Short reward table for announcements
        const tiers = rpgAdmin.seasonalRewards.tiers
        rewardTableShort = `
🏆 *Season Rewards (MLBB Style):*
🥇 *#1 ${tiers.rank1.title}*: ${tiers.rank1.diamond}💎 + ${tiers.rank1.emerald} Emerald + ${(tiers.rank1.money/1e6)}M Money
🥈 *#2 ${tiers.rank2.title}*: ${tiers.rank2.diamond}💎 + ${tiers.rank2.emerald} Emerald + ${(tiers.rank2.money/1e6)}M Money
🥉 *#3 ${tiers.rank3.title}*: ${tiers.rank3.diamond}💎 + ${tiers.rank3.emerald} Emerald + ${(tiers.rank3.money/1e5)}K Money
⭐ *Top 10 ${tiers.top10.title}*: ${tiers.top10.diamond}💎 + ${(tiers.top10.money/1e6)}M Money
⭐ *Top 25 ${tiers.top25.title}*: ${tiers.top25.diamond}💎 + ${(tiers.top25.money/1e3)}K Money
⭐ *Top 50 ${tiers.top50.title}*: ${tiers.top50.diamond}💎 + ${(tiers.top50.money/1e3)}K Money`.trim()
    } catch (_) {}

    const announcements = {
        4: `
⚔️ *SEASON ${season} — PENGUMUMAN* ⚔️

📢 _Perhatian para adventurers!_

Season ${season} akan berakhir dalam *~4 minggu* lagi!
📅 Reset: *${resetDateStr}*

🏆 *Top Players Saat Ini:*
${topPlayersText}

🚨 *FULL WIPE saat season reset!*
Semua data RPG akan di-reset dari awal.
Raih peringkat tinggi untuk *rewards eksklusif*! 🎁

_~Jangan sampai ketinggalan~_
`.trim(),

        3: `
⚔️ *SEASON ${season} — PERINGATAN* ⚔️

⏰ _3 minggu lagi season berakhir!_

📅 Reset: *${resetDateStr}*
📊 Sisa waktu: *${daysLeft} hari*

🏆 *Klasemen Sementara:*
${topPlayersText}

${rewardTableShort}

_Kejar terus rankingmu!_ 🔥
`.trim(),

        2: `
🔥 *SEASON ${season} — 2 MINGGU LAGI!* 🔥

⚠️ _Waktu semakin sempit, adventurers!_

📅 Reset: *${resetDateStr}*
📊 Sisa waktu: *${daysLeft} hari*

🏆 *Klasemen Terkini:*
${topPlayersText}

🎯 *Tips akhir season:*
• Hunt, mine, fish setiap hari
• Selesaikan daily missions
• Open crates untuk bonus EXP
• Ikuti dungeon dan boss raid

${rewardTableShort}

_Pertarungan semakin sengit!_ ⚡
`.trim(),

        1: `
🚨 *SEASON ${season} — MINGGU TERAKHIR!* 🚨

⏳ _FINAL COUNTDOWN!_

📅 Reset: *${resetDateStr}*
📊 Sisa waktu: *${daysLeft} hari lagi!*

🏆 *KLASEMEN FINAL:*
${topPlayersText}

${rewardTableShort}

⚔️ _Ini kesempatan terakhirmu!_
_Grind habis-habisan sebelum season berakhir!_ 💪
`.trim()
    }

    const message = announcements[weekNumber]
    if (!message) return

    // Broadcast to all groups
    for (const id of groups) {
        try {
            await conn.sendMessage(id, { text: message })
        } catch (_) {}
        await new Promise(r => setTimeout(r, 5000))
    }

    console.log(`[Season Announce] Week ${weekNumber} broadcast sent to ${groups.length} groups`)
}
