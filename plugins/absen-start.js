import { quickButtons } from '../lib/buttons.js'

let handler = async (m, { conn, usedPrefix, text }) => {
    conn.absen = conn.absen ? conn.absen : {}
    let id = m.chat
    if (id in conn.absen) {
        throw `_*Masih ada absen di chat ini!*_\n\n*${usedPrefix}hapusabsen* - untuk menghapus absen`
    }

    conn.absen[id] = [
        await quickButtons(conn, m.chat, 'Berhasil memulai absen!', 'Made with Love', [
            { id: `${usedPrefix}absen`, text: 'Absen' }
        ], m),
        [],
        text
    ]
}
handler.help = ['mulaiabsen'].map(v => v + ' <text>')
handler.tags = ['adminry', 'absen']
handler.command = /^(start|mulai)absen$/i
handler.group = true
handler.admin = true
export default handler
