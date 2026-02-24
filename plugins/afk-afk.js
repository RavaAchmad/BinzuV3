let handler = async (m, { conn, text }) => {
    let user = global.db.data.users[m.sender]

    // Ambil nama: prioritas dari DB (kalau registered), fallback ke getName
    const nama = user.registered && user.name
        ? user.name
        : (await conn.getName(m.sender)) || m.pushName || m.sender.split('@')[0]

    user.afk = +new Date
    user.afkReason = text || ''
    user.afkName = nama  // simpan nama saat set AFK biar konsisten saat dipanggil

    m.reply(`
╭─「 💤 *MODE AFK* 」
│ *${nama}* sedang AFK
│ *Alasan:* ${text ? text : '_tanpa alasan_'}
╰──────────────────
`.trim())
}

handler.help = ['afk <alasan>']
handler.tags = ['group']
handler.command = /^afk$/i
handler.group = true
handler.admin = true

export default handler