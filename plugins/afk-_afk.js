export async function before(m, { conn }) {
    let sender = global.db.data.users[m.sender]
    if (!sender) return true

    // ── CEK APAKAH PENGIRIM SENDIRI SEDANG AFK ──────────────
    if (sender.afk > -1) {
        const nama = sender.afkName
            || (sender.registered && sender.name)
            || (await conn.getName(m.sender))
            || m.pushName
            || m.sender.split('@')[0]

        const durasi = clockString(new Date - sender.afk)

        m.reply(`
╭─「 ✅ *KEMBALI DARI AFK* 」
│ *${nama}* telah kembali!
│ *Selama:* ${durasi}
│ ${sender.afkReason ? `*Alasan AFK:* ${sender.afkReason}` : '_Tanpa alasan_'}
╰──────────────────
`.trim())

        sender.afk = -1
        sender.afkReason = ''
        sender.afkName = ''
    }

    // ── CEK MENTION / QUOTED KE USER YANG AFK ───────────────
    const jids = [...new Set([
        ...(m.mentionedJid || []),
        ...(m.quoted ? [m.quoted.sender] : [])
    ])]

    for (let jid of jids) {
        let target = global.db.data.users[jid]
        if (!target) continue
        if (!target.afk || target.afk < 0) continue

        // Ambil nama target yang AFK
        const namaTarget = target.afkName
            || (target.registered && target.name)
            || (await conn.getName(jid))
            || jid.split('@')[0]

        const durasi = clockString(new Date - target.afk)

        m.reply(`
╭─「 💤 *SEDANG AFK* 」
│ *${namaTarget}* sedang tidak ada
│ *Alasan:* ${target.afkReason ? target.afkReason : '_tanpa alasan_'}
│ *Sudah AFK selama:* ${durasi}
╰──────────────────
`.trim())
    }

    return true
}

function clockString(ms) {
    if (isNaN(ms)) return '--:--:--'
    let h = Math.floor(ms / 3600000)
    let m = Math.floor(ms / 60000) % 60
    let s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}