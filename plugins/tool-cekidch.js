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
        text = text?.trim?.() || ""
        const code = text.match(/channel\/([A-Za-z0-9]+)/)?.[1]
        if (!code) return m.reply('Kode channel-nya ga ketangkep bro 😭')

        // Ambil metadata dari Baileys
        const metadata = await conn.newsletterMetadata('invite', code)
        // await m.reply('*RAW METADATA*\n```json\n' + JSON.stringify(metadata, null, 2) + '\n```')
        const name = metadata.name ?? metadata.thread_metadata?.name?.text ?? '-'
        const sub = metadata.subscribers_count ?? metadata.subscribers ?? '-'
        const desc = metadata.description ?? metadata.thread_metadata?.description?.text ?? '(No Description)'

        // Build pesan info channel
        const msg = generateWAMessageFromContent(
            m.chat,
            proto.Message.fromObject({
                extendedTextMessage: {
                    text: `╭─「 CHANNEL INFO 」
├ ID: ${metadata.id}
├ Name: ${name}
├ Created: ${unixToDate(metadata.thread_metadata?.creation_time)}
├ Subscribers: ${sub}
├ Link: https://whatsapp.com/channel/${metadata.thread_metadata?.invite}
│
├ Description:
${desc}
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
                            thumbnail: await (async () => { 
                                let thumbData = Buffer.alloc(0);
                                try {
                                    const { data } = await conn.getFile(metadata.pictureUrl || global.thum, true);
                                    thumbData = data;
                                } catch (e) {
                                    console.log('Channel thumbnail error:', e.message);
                                    if (global.thum) {
                                        try {
                                            const { data } = await conn.getFile(global.thum, true);
                                            thumbData = data;
                                        } catch (err) {
                                            thumbData = Buffer.alloc(0);
                                        }
                                    }
                                }
                                return thumbData;
                            })(),
                            sourceUrl: `https://whatsapp.com/channel/${metadata.invite}`
                        }
                    }
                }
            }),
            { userJid: m.chat, quoted: m }
        )

        // Kirim hasil
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
        return conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }})

    } catch (err) {
        console.log(err)
        conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }})
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
