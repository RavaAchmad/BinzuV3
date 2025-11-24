import pkg from 'baileys_helper';
const { sendButtons } = pkg;

let handler = async (m, { usedPrefix, text }) => {
    conn.absen = conn.absen ? conn.absen : {}
    let id = m.chat
    if (id in conn.absen) {
        throw `_*Masih ada absen di chat ini!*_\n\n*${usedPrefix}hapusabsen* - untuk menghapus absen`
    }
    conn.absen[id] = [
    await sendButtons(conn, m.chat, {
        title: 'Absen',            // optional header
        text: `Berhasil memulai absen!`,    // body
        footer: 'Made with Love',            // optional footer
        buttons: [
            { id: `.absen`, text: 'Absen' }      // legacy simple shape auto‑converted
        ]
    }),
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