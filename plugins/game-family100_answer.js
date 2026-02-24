import similarity from 'similarity'
const threshold = 0.72

export async function before(m) {
    this.game = this.game ? this.game : {}
    let id = 'family100_' + m.chat
    if (!(id in this.game)) return !0

    let room = this.game[id]

    // ── WAJIB REPLY PESAN BOT ────────────────────────────────
    // Cek apakah pesan ini adalah reply ke pesan bot
    const quotedId = m.message?.[m.mtype]?.contextInfo?.stanzaId
                  || m.quoted?.id
                  || m.msg?.contextInfo?.stanzaId

    const isSurrender = /^((me)?nyerah|surr?ender)$/i.test(m.text)

    // Kalau bukan reply dan bukan nyerah → abaikan, jangan ganggu chat biasa
    if (!isSurrender && quotedId !== room.msgId) return !0

    // FIX: Tambah flag 'g' biar semua karakter aneh ke-replace
    let text = m.text.toLowerCase().replace(/[^\w\s\-]+/g, '').trim()

    if (!isSurrender) {
        let index = room.jawaban.indexOf(text)

        if (index < 0) {
            // Tidak ada di list — cek similarity
            const unanswered = room.jawaban.filter((_, i) => !room.terjawab[i])
            if (unanswered.length === 0) return !0

            const maxSim = Math.max(...unanswered.map(j => similarity(j, text)))

            if (maxSim >= threshold) {
                m.reply('🤔 *Dikit lagi!* Hampir benar, coba lagi!')
            } else {
                m.reply('❌ Bukan itu jawabannya, coba lagi!')
            }
            return !0
        }

        // Jawaban sudah dijawab orang lain
        if (room.terjawab[index]) {
            const siapa = room.terjawab[index].split('@')[0]
            m.reply(`✅ Jawaban *${room.jawaban[index]}* sudah dijawab oleh @${siapa}!`, null, {
                mentions: [room.terjawab[index]]
            })
            return !0
        }

        // ✅ Jawaban benar!
        let users = global.db.data.users[m.sender]
        room.terjawab[index] = m.sender
        users.exp += room.winScore
        m.reply(`🎉 *Benar!* +${room.winScore} XP`)
    }

    let isWin = room.terjawab.length === room.terjawab.filter(v => v).length

    let caption = `
*Soal:* ${room.soal}
Terdapat *${room.jawaban.length}* jawaban${room.jawaban.find(v => v.includes(' ')) ? `
(beberapa jawaban terdapat spasi)
` : ''}
${isWin ? '🏆 *SEMUA JAWABAN TERJAWAB!*' : isSurrender ? '🏳️ *MENYERAH!*' : ''}
${Array.from(room.jawaban, (jawaban, index) => {
        return isSurrender || room.terjawab[index]
            ? `(${index + 1}) ${jawaban}${room.terjawab[index] ? ` — @${room.terjawab[index].split('@')[0]}` : ''}`
            : `(${index + 1}) ▒▒▒▒▒`
    }).join('\n')}
${isSurrender ? '' : `\n+${room.winScore} XP tiap jawaban benar`}
    `.trim()

    const msg = await this.reply(m.chat, caption, null, {
        mentions: this.parseMention(caption)
    })
    room.msg = msg

    if (isWin || isSurrender) {
        // Clear timer kalau game selesai lebih awal
        if (room.timer) clearTimeout(room.timer)
        delete this.game[id]
    }

    return !0
}