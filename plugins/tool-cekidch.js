
let handler = async (m, { conn, text }) => {
    if (!text) return m.reply('Kirim link channel dulu bro 😭\ncontoh:\n.cekidch https://whatsapp.com/channel/0029VaEYcmbBfxo8vhE5iS1b')

    let url = text.trim()

    if (!/https?:\/\/(www\.)?whatsapp\.com\/channel\//i.test(url)) {
        return m.reply('Linknya ga valid bro 💀\nHarus link channel WA.')
    }

    // ambil ID public dari link
    let publicId = url.split('/').pop()

    if (!/^[A-Za-z0-9]+$/.test(publicId)) {
        return m.reply('ID channel ga bisa diambil. Linknya invalid.')
    }

    let fakeJid = publicId + '@newsletter' // public JID

    try {
        // JOIN channel (WA otomatis convert ke numeric JID)
        let follow = await conn.newsletterFollow(fakeJid)

        let numericJid = follow?.jid || null
        if (!numericJid) return m.reply('Gagal ambil numeric JID bro')

        // SILENT LEAVE (hapus follow state lokal, tanpa spam unsub)
        delete conn.chats[numericJid]
        if (conn.store) await conn.store.save()

        // hasil
        let out = `🔥 *Numeric JID Berhasil Dicuri!*\n\n` +
                  `🔗 Link: ${url}\n` +
                  `🆔 Public ID: *${publicId}@newsletter*\n` +
                  `📡 Numeric JID Asli: *${numericJid}*\n\n` +

        await conn.reply(m.chat, out, m)

    } catch (err) {
        console.log(err)
        return m.reply('Error pas join bro… mungkin link udah mati atau WA ngeblok.\n' + err)
    }
}

handler.help = ['cekidch <link>']
handler.tags = ['tools']
handler.command = /^cekidch$/i

export default handler
