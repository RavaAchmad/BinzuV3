export async function before(m) {
    let user = db.data.users[m.sender]
    let chat = db.data.chats[m.chat]
    if ((m.chat.endsWith('broadcast') || m.fromMe) && !m.message && !chat.isBanned) return
    if (!m.text.startsWith('.') && !m.text.startsWith('#') && !m.text.startsWith('!') && !m.text.startsWith('/') && !m.text.startsWith('\/')) return
    if (user.banned) return
    this.spam = this.spam ? this.spam : {}

    const timestamp = Number(m.messageTimestamp)
    const RESET_TIME = 86400000 // 24 hours in ms

    if (m.sender in this.spam) {
        const timeDiff = timestamp - this.spam[m.sender].lastspam
        
        // Reset if last activity was more than 24 hours ago
        if (timeDiff > RESET_TIME) {
            this.spam[m.sender].count = 0
            this.spam[m.sender].lastspam = timestamp
        } else if (timeDiff >= 4) {
            // 4+ seconds passed, reset counter for new spam check window
            if (this.spam[m.sender].count >= 2) {
                user.banned = true
                m.reply('*乂 Detected Spamming!!*\n\n Please wait 5 seconds before using again.')
                var detik = 10000 * 1
                var now = new Date() * 1
                if (now < user.lastBanned) user.lastBanned += detik
                else user.lastBanned = now + detik
            }
            this.spam[m.sender].count = 0
            this.spam[m.sender].lastspam = timestamp
        } else {
            // Within 4 second window, increment count
            this.spam[m.sender].count++
            if (this.spam[m.sender].count >= 2) {
                user.banned = true
                m.reply('*乂 Detected Spamming!!*\n\n Please wait 5 seconds before using again.')
                var detik = 10000 * 1
                var now = new Date() * 1
                if (now < user.lastBanned) user.lastBanned += detik
                else user.lastBanned = now + detik
            }
        }
    } else {
        this.spam[m.sender] = {
            jid: m.sender,
            count: 0,
            lastspam: timestamp
        }
    }
}