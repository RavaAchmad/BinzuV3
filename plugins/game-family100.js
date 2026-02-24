import fs from 'fs'

const winScore = 4999
const TIMER_SECONDS = 120 // 2 menit, ubah sesuai selera

async function handler(m) {
    this.game = this.game ? this.game : {}
    let id = 'family100_' + m.chat
    if (id in this.game) return this.reply(m.chat, 'Masih ada kuis yang belum terjawab di chat ini', this.game[id].msg)

    let src = JSON.parse(fs.readFileSync('./json/family100.json', 'utf-8'))
    let json = src[Math.floor(Math.random() * src.length)]

    let caption = `
*Soal:* ${json.soal}
Terdapat *${json.jawaban.length}* jawaban${json.jawaban.find(v => v.includes(' ')) ? `
(beberapa jawaban terdapat spasi)
` : ''}
+${winScore} XP tiap jawaban benar
⏳ Waktu: *${TIMER_SECONDS} detik*
━━━━━━━━━━━━━━━━━━━━━━
💬 _Jawab dengan cara REPLY pesan ini!_
    `.trim()

    // Simpan msg untuk dijadikan target reply
    const botMsg = await m.reply(caption)

    this.game[id] = {
        id,
        msg: botMsg,
        msgId: botMsg?.key?.id || null, // ID pesan bot untuk validasi reply
        ...json,
        terjawab: Array.from(json.jawaban, () => false),
        winScore,
    }

    // ── TIMER ────────────────────────────────────────────────
    this.game[id].timer = setTimeout(async () => {
        // Kalau game sudah selesai sebelum timer habis, skip
        if (!(id in this.game)) return

        const room = this.game[id]
        const sisaJawaban = room.jawaban.filter((_, i) => !room.terjawab[i])

        let timeoutCaption = `
⏰ *WAKTU HABIS!*
*Soal:* ${room.soal}

${Array.from(room.jawaban, (jawaban, index) => {
    return `(${index + 1}) ${jawaban}${room.terjawab[index] ? ` — @${room.terjawab[index].split('@')[0]}` : ' ❌'}`
}).join('\n')}

${sisaJawaban.length > 0 ? `_${sisaJawaban.length} jawaban tidak terjawab_` : '🏆 Semua terjawab!'}
        `.trim()

        try {
            await this.reply(m.chat, timeoutCaption, room.msg, {
                mentions: this.parseMention(timeoutCaption)
            })
        } catch (e) {
            await this.reply(m.chat, timeoutCaption, null, {
                mentions: this.parseMention(timeoutCaption)
            })
        }

        delete this.game[id]
    }, TIMER_SECONDS * 1000)
}

handler.help = ['family100']
handler.tags = ['game']
handler.command = /^family100$/i
handler.onlyprem = true
handler.game = true
export default handler