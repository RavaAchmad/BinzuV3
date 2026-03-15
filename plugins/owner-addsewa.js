let linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})(?:[^\d]*(\d{1,3}))?/i

let handler = async (m, { conn, text, isOwner }) => {
    // allow empty text if message is in a group (set timer for current chat)
    if (!text && !m.isGroup) throw 'Masukkan link invite atau id grup serta jumlah hari (opsional)\nContoh: .addsewa https://chat.whatsapp.com/XXXX 7 atau .addsewa 12345-67890@g.us 5'
    let args = text ? text.split(' ').filter(a => a) : []
    let target = args[0]
    let expiredArg = args[1]
    let groupId
    let expired

    // jika format invite link
    let [, code] = target ? target.match(linkRegex) || [] : []
    if (code) {
        // coba terima invite untuk mendapatkan id grup
        try {
            groupId = await conn.groupAcceptInvite(code)
        } catch (e) {
            // apabila gagal (misal sudah di dalam grup) gunakan target sebagai id
            groupId = target
        }
        expired = expiredArg
    } else if (target && target.endsWith('@g.us')) {
        groupId = target
        expired = expiredArg
    } else if (m.isGroup) {
        // dalam grup, jika tidak ada target atau hanya angka
        groupId = m.chat
        expired = target // bisa undefined atau angka
    } else {
        throw 'Format tidak dikenali. Mohon sertakan link invite atau id grup.'
    }

    expired = Math.floor(Math.min(9999, Math.max(1, isOwner ? isNumber(expired) ? parseInt(expired) : 0 : 3)))
    let chats = global.db.data.chats[groupId]
    if (!chats) chats = global.db.data.chats[groupId] = {}
    let jumlahHari = expired * 1000 * 60 * 60 * 24
    let now = new Date() * 1
    if (now < chats.expired) chats.expired += jumlahHari
    else chats.expired = now + jumlahHari
    m.reply(`Berhasil menambahkan sewa untuk grup ${groupId}${expired ? ` selama ${expired} hari` : ''}`)
}
handler.help = ['addtimer <link/ID> [hari]']
handler.tags = ['owner']
handler.command = /^addtimer$/i
handler.rowner = true
handler.register = true
export default handler

const isNumber = (x) => (x = parseInt(x), typeof x === 'number' && !isNaN(x))
