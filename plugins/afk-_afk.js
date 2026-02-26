export async function before(m, { conn }) {
    if (m.isBaileys) return true

    // Resolve sender: LID → PN (Baileys 7.x fix)
    const senderJid = await resolvePN(conn, m.sender)

    // Fallback lookup DB
    let sender = global.db.data.users[senderJid]
               || global.db.data.users[m.sender]
    if (!sender) return true

    // ── CEK APAKAH PENGIRIM SENDIRI SEDANG AFK ──────────────
    if (sender.afk && sender.afk > 0) {
        // Prioritas: pushName > afkName (tersimpan saat set AFK) > getName > nomor
        const nama = m.pushName
            || sender.afkName
            || await safeGetName(conn, senderJid)
            || senderJid.split('@')[0]

        const durasi = clockString(Date.now() - sender.afk)

        m.reply(`╭─「 ✅ *KEMBALI DARI AFK* 」
│ *${nama}* telah kembali!
│ *Selama:* ${durasi}
│ ${sender.afkReason ? `*Alasan AFK:* ${sender.afkReason}` : '_Tanpa alasan_'}
╰──────────────────`.trim())

        sender.afk = -1
        sender.afkReason = ''
        sender.afkName = ''
    }

    // ── CEK MENTION / QUOTED KE USER YANG AFK ───────────────
    const rawJids = [...new Set([
        ...(m.mentionedJid || []),
        ...(m.quoted?.sender ? [m.quoted.sender] : [])
    ])]

    for (let rawJid of rawJids) {
        const resolvedJid = await resolvePN(conn, rawJid)

        let target = global.db.data.users[resolvedJid]
                   || global.db.data.users[rawJid]
        if (!target || !target.afk || target.afk < 0) continue

        // Untuk target yang di-mention: pakai afkName dulu, fallback ke getName
        const namaTarget = target.afkName
            || await safeGetName(conn, resolvedJid)
            || resolvedJid.split('@')[0]

        const durasi = clockString(Date.now() - target.afk)

        m.reply(`╭─「 💤 *SEDANG AFK* 」
│ *${namaTarget}* sedang tidak ada
│ *Alasan:* ${target.afkReason || '_tanpa alasan_'}
│ *Sudah AFK selama:* ${durasi}
╰──────────────────`.trim())
    }

    return true
}

// Wrapper getName yang aman — ga akan pernah return [Object Promise]
async function safeGetName(conn, jid) {
    try {
        const result = await conn.getName(jid)
        // Double await buat jaga-jaga kalau getName return Promise di dalam Promise
        const name = result instanceof Promise ? await result : result
        return (name && name !== jid) ? name : null
    } catch {
        return null
    }
}

// Helper: resolve LID → PN JID (Baileys 7.x)
async function resolvePN(conn, jid) {
    if (!jid) return null
    if (jid.includes('@lid') && conn.signalRepository?.lidMapping) {
        try {
            const pn = await conn.signalRepository.lidMapping.getPNForLID(jid)
            return pn || jid
        } catch {
            return jid
        }
    }
    return jid
}

function clockString(ms) {
    if (!ms || isNaN(ms)) return '00:00:00'
    const h = Math.floor(ms / 3600000)
    const m = Math.floor(ms / 60000) % 60
    const s = Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}