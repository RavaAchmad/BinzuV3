import leaderboardManager from '../lib/leaderboard.js'
import { quickButtons, listMenu } from '../lib/buttons.js'

const CATEGORIES = leaderboardManager.CATEGORIES
const fmtNum = n => (n || 0).toLocaleString('id-ID')

let handler = async (m, { conn, args, usedPrefix }) => {
    const db = global.db.data

    let statusMsg = await conn.sendMessage(m.chat, { text: '⏳ Loading leaderboard...' }, { quoted: m })

    try {
        const category = (args[0] || 'wealth').toLowerCase()

        if (!CATEGORIES[category]) {
            // Tampilkan daftar kategori yang tersedia
            let helpText = `📊 *LEADERBOARD CATEGORIES*\n\n`
            helpText += `Gunakan: *${usedPrefix}lb <kategori>*\n\n`
            for (const [key, cat] of Object.entries(CATEGORIES)) {
                helpText += `${cat.icon} *${key}* — ${cat.desc}\n`
            }
            helpText += `\n_Contoh: ${usedPrefix}lb wealth_`

            await conn.sendMessage(m.chat, { text: helpText, edit: statusMsg.key })

            // Interactive category picker
            const sections = [{
                title: '📊 Pilih Kategori',
                rows: Object.entries(CATEGORIES).map(([key, cat]) => ({
                    title: `${cat.icon} ${cat.name}`,
                    description: cat.desc,
                    id: `${usedPrefix}lb ${key}`
                }))
            }]
            await listMenu(conn, m.chat, '📊 *Pilih kategori leaderboard:*', 'Leaderboard', '📋 Lihat Kategori', sections)
            return
        }

        await conn.sendMessage(m.chat, { text: '⏳ Menghitung ranking...', edit: statusMsg.key })

        const catInfo = CATEGORIES[category]
        const leaderboard = leaderboardManager.getLeaderboard(db, category, 15)

        if (leaderboard.length === 0) {
            await conn.sendMessage(m.chat, {
                text: `📊 Belum ada data untuk ${catInfo.name}`,
                edit: statusMsg.key
            })
            return
        }

        let text = `╭━━━━━━━━━━━━━ 🏆 ━━━━━━━━━━━━━╮
┃      ${catInfo.name}
┃      *LEADERBOARD*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`

        for (const entry of leaderboard) {
            const medals = ['🥇', '🥈', '🥉']
            const medal = entry.rank <= 3 ? medals[entry.rank - 1] : `#${entry.rank} ⭐`
            const name = conn.getName(entry.userId) || entry.userId.split('@')[0]

            text += `${medal} *${name}*\n`

            // Detail berbeda per kategori
            switch (category) {
                case 'wealth':
                    text += `   ├─ 💰 Total: ${fmtNum(entry.value)}\n`
                    text += `   ├─ 💵 Money: ${fmtNum(entry.money)}\n`
                    text += `   ├─ 💎 Diamond: ${fmtNum(entry.diamond)}\n`
                    text += `   └─ ⭐ Lv.${entry.level}\n\n`
                    break
                case 'level':
                    text += `   ├─ ⭐ Level ${fmtNum(entry.level)}\n`
                    text += `   ├─ ✨ EXP: ${fmtNum(entry.exp)}\n`
                    text += `   └─ 💰 Wealth: ${fmtNum(entry.wealth)}\n\n`
                    break
                case 'money':
                    text += `   ├─ 💵 Total: ${fmtNum(entry.value)}\n`
                    text += `   ├─ 💎 Diamond: ${fmtNum(entry.diamond)}\n`
                    text += `   └─ ⭐ Lv.${entry.level}\n\n`
                    break
                case 'diamond':
                    text += `   ├─ 💎 Diamond: ${fmtNum(entry.value)}\n`
                    text += `   ├─ 🟢 Emerald: ${fmtNum(entry.emerald)}\n`
                    text += `   └─ ⭐ Lv.${entry.level}\n\n`
                    break
                case 'emerald':
                    text += `   ├─ 🟢 Emerald: ${fmtNum(entry.value)}\n`
                    text += `   ├─ 💎 Diamond: ${fmtNum(entry.diamond)}\n`
                    text += `   └─ ⭐ Lv.${entry.level}\n\n`
                    break
                case 'pets':
                    text += `   ├─ 🐾 Pet: ${entry.value} jenis\n`
                    text += `   ├─ ⭐ Lv.${entry.level}\n`
                    text += `   └─ 💰 Wealth: ${fmtNum(entry.wealth)}\n\n`
                    break
                case 'exp':
                    text += `   ├─ ✨ EXP: ${fmtNum(entry.value)}\n`
                    text += `   ├─ ⭐ Level ${entry.level}\n`
                    text += `   └─ 💰 Money: ${fmtNum(entry.money)}\n\n`
                    break
            }
        }

        // Posisi player sendiri
        const myRank = leaderboardManager.getPlayerRank(db, m.sender, category)
        if (myRank) {
            text += `╭━━━━━━━━━━━━━ 👤 ━━━━━━━━━━━━━╮\n`
            text += `┃ Posisi Anda: #${myRank.rank} dari ${myRank.total}\n`
            text += `┃ ${catInfo.icon} Score: ${fmtNum(myRank.value)}\n`
            text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
        }

        text += `\n\n📌 _Gunakan ${usedPrefix}lb <kategori> untuk lihat yang lain_`

        await conn.sendMessage(m.chat, { text, edit: statusMsg.key })

        // Quick buttons untuk kategori lain
        const otherCats = Object.entries(CATEGORIES).filter(([k]) => k !== category).slice(0, 4)
        await quickButtons(conn, m.chat, `📊 *Lihat Kategori Lain:*`, catInfo.name, 
            otherCats.map(([key, cat]) => ({
                id: `${usedPrefix}lb ${key}`,
                text: `${cat.icon} ${cat.name}`
            }))
        )

    } catch (error) {
        console.error('Error in leaderboard:', error)
        await conn.sendMessage(m.chat, {
            text: '❌ Error loading leaderboard',
            edit: statusMsg.key
        })
    }
}

handler.help = ['leaderboard [kategori]', 'lb wealth/level/money/diamond/emerald/pets/exp']
handler.tags = ['rpg', 'leaderboard']
handler.command = /^(leaderboard|lb)$/i
handler.register = true
handler.rpg = true

export default handler
