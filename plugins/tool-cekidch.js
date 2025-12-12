// tool-cekidch.js
import { proto, generateWAMessageFromContent } from 'baileys'

let handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply('Kirim link channel dulu bro 😭\ncontoh:\n.cekidch https://whatsapp.com/channel/0029VaEYcmbBfxo8vhE5iS1b')
    }

    if (!text.includes('whatsapp.com/channel/')) {
        return m.reply('Bro itu bukan link channel 😭\nPake format:\nhttps://whatsapp.com/channel/KODE')
    }

    try {
        // Ambil kode channel
        const code = text.match(/channel\/([A-Za-z0-9]+)/)?.[1]
        if (!code) return m.reply('Kode channel-nya ga ketangkep bro 😭')

        // Ambil metadata dari Baileys
        const metadata = await conn.newsletterMetadata('invite', code)

        // Build pesan info channel
        const msg = generateWAMessageFromContent(
            m.chat,
            proto.Message.fromObject({
                extendedTextMessage: {
                    text: `╭─「 CHANNEL INFO 」
├ ID: ${metadata.id}
├ Name: ${metadata.name}
├ Created: ${unixToDate(metadata.creation_time)}
├ Subscribers: ${metadata.subscribers}
├ Link: https://whatsapp.com/channel/${metadata.invite}
│
├ Description:
${metadata.description || '(No Description)'}
╰──────────────────`,
                    contextInfo: {
                        isForwarded: true,
                        forwardingScore: 999999,
                        externalAdReply: {
                            title: `乂 ${metadata.name} 乂`,
                            body: `Channel Information`,
                            mediaType: 1,
                            previewType: 0,
                            renderLargerThumbnail: true,
                            thumbnailUrl: metadata.pictureUrl || global.thum,
                            sourceUrl: `https://whatsapp.com/channel/${metadata.invite}`
                        }
                    }
                }
            }),
            { userJid: m.chat, quoted: m }
        )

        // Kirim hasil
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
        return m.react('✅')

    } catch (err) {
        console.log(err)
        m.react('❌')
        return m.reply('Gagal ambil informasi channel bro 😭\nCek link atau coba lagi.')
    }
}

handler.help = ['cekidch <link>']
handler.tags = ['tools']
handler.command = /^cekidch$/i

export default handler


// =============================
// FUNCTION — unixToDate()
// =============================
function unixToDate(ts) {
    if (!ts) return '-'

    // Normalisasi detik/milidetik
    if (String(ts).length === 10) ts = ts * 1000

    const d = new Date(ts)
    if (isNaN(d.getTime())) return '-'

    return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}
