let handler = async (m, { conn, groupMetadata, command, usedPrefix, text }) => {
    if (!text) throw `Contoh:\n${usedPrefix + command} pengcoli`

    const user = db.data.users

    const ps = groupMetadata.participants.map(v => {
        if (v.phoneNumber) {
            const pn = v.phoneNumber.includes('@') ? v.phoneNumber : v.phoneNumber + '@s.whatsapp.net'
            return pn
        }
        // Kalau id sudah PN, return langsung
        if (v.id?.endsWith('@s.whatsapp.net')) return v.id
        // Coba resolve LID via storeLid cache
        const resolved = conn.getJid?.(v.id)
        return (resolved && !resolved.includes('@lid')) ? resolved : v.id
    }).filter(Boolean)

    if (ps.length < 10) throw `Anggota grup kurang dari 10 orang!`

    // Pilih 10 unik biar ga ada nama muncul 2x
    const picked = []
    const pool = [...ps]
    while (picked.length < 10 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length)
        picked.push(pool.splice(idx, 1)[0])
    }

    // Resolve nama — await karena getName bisa return Promise
    const getName = async (jid) => {
        // Cek DB dulu
        const u = user?.[jid]
        if (u?.registered && u?.name) return u.name
        // Fallback ke conn.getName (await karena bisa Promise)
        try {
            const name = await conn.getName(jid)
            if (name && name !== jid) return name
        } catch (_) {}
        // Terakhir: tag nomor mentah
        return '@' + jid.split('@')[0]
    }

    const names = await Promise.all(picked.map(getName))

    const emoji = pickRandom(['😨', '😅', '😂', '😳', '😎', '🥵', '😱', '🐦', '🙄', '🐤', '🗿', '🤨', '🥴', '😐', '👆', '😔', '👀', '👎'])

    const top = `*${emoji} Top 10 ${text} ${emoji}*

*1.* ${names[0]}
*2.* ${names[1]}
*3.* ${names[2]}
*4.* ${names[3]}
*5.* ${names[4]}
*6.* ${names[5]}
*7.* ${names[6]}
*8.* ${names[7]}
*9.* ${names[8]}
*10.* ${names[9]}`.trim()

    await conn.sendMessage(m.chat, {
        text: top,
        mentions: picked
    }, { quoted: m })
}

handler.help = ['top']
handler.tags = ['fun']
handler.command = /^top$/i
handler.group = true
export default handler

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)]
}