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

    // Get top 3 players for preview
    let topPlayersText = '_Belum ada data_'
    try {
        const leaderboardData = Object.values(global.db.data.leaderboards?.alltime || {})
            .sort((a, b) => b.exp - a.exp)
            .slice(0, 3)
        
        if (leaderboardData.length > 0) {
            const medals = ['🥇', '🥈', '🥉']
            topPlayersText = leaderboardData.map((p, i) => 
                `${medals[i]} *${p.name || 'Unknown'}* — Level ${p.level || 1} | EXP: ${(p.exp || 0).toLocaleString('id-ID')}`
            ).join('\n')
        }
    } catch (_) {}

    const announcements = {
        4: `
⚔️ *SEASON ${season} — PENGUMUMAN* ⚔️

📢 _Perhatian para adventurers!_

Season ${season} akan berakhir dalam *~4 minggu* lagi!
📅 Reset: *${resetDateStr}*

🏆 *Top Players Saat Ini:*
${topPlayersText}

Masih ada waktu untuk naik peringkat!
Mainkan RPG sekarang dan raih *rewards eksklusif* di akhir season 🎁

_~Jangan sampai ketinggalan~_
`.trim(),

        3: `
⚔️ *SEASON ${season} — PERINGATAN* ⚔️

⏰ _3 minggu lagi season berakhir!_

📅 Reset: *${resetDateStr}*
📊 Sisa waktu: *${daysLeft} hari*

🏆 *Klasemen Sementara:*
${topPlayersText}

💡 Top 3 players akan mendapatkan:
🥇 100 Diamond + 50 Emerald + 5 Legendary
🥈 50 Diamond + 25 Emerald + 3 Legendary
🥉 25 Diamond + 10 Emerald + 1 Legendary

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

_Pertarungan semakin sengit!_ ⚡
`.trim(),

        1: `
🚨 *SEASON ${season} — MINGGU TERAKHIR!* 🚨

⏳ _FINAL COUNTDOWN!_

📅 Reset: *${resetDateStr}*
📊 Sisa waktu: *${daysLeft} hari lagi!*

🏆 *KLASEMEN FINAL:*
${topPlayersText}

🎁 *Rewards Season End:*
🥇 100💎 + 50 Emerald + 500 Gold + 5 Legendary
🥈 50💎 + 25 Emerald + 250 Gold + 3 Legendary  
🥉 25💎 + 10 Emerald + 100 Gold + 1 Legendary

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
