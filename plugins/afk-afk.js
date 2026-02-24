let handler = async (m, { conn, text }) => {
    let user = global.db.data.users[m.sender]

    // Nama only — lebih clean, nomor HP ga perlu ditampilin
    const nama = user.registered && user.name
        ? user.name
        : (await conn.getName(m.sender)) || m.pushName || m.sender.split('@')[0]

    user.afk = Date.now() // ganti +new Date biar konsisten
    user.afkReason = text || ''
    user.afkName = nama

    m.reply(`╭─「 💤 *MODE AFK* 」
│ *${nama}* sedang AFK
│ *Alasan:* ${text || '_tanpa alasan_'}
│ *Sejak:* ${new Date().toLocaleTimeString('id-ID')}
╰──────────────────`.trim())
}

handler.help = ['afk <alasan>']
handler.tags = ['group']
handler.command = /^afk$/i
handler.group = true
// Hapus handler.admin = true kalau mau semua member bisa AFK

export default handler