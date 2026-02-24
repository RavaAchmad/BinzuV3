import cron from 'node-cron'

export async function all(m) {
    let setting = global.db.data.settings[this.user.jid]
    if (!setting?.resetlimit) return true

    const now = new Date() * 1
    if (now - setting.resetlimitDB <= 86400000) return true

    const lim = 10
    let resetCount = 0
    let skipCount = 0

    const list = Object.entries(global.db.data.users)

    list.forEach(([_, data]) => {
        if (Number(data.limit) <= 5) {
            data.limit = lim
            resetCount++
        } else {
            skipCount++
        }
    })

    const totalUsers = Object.keys(global.db.data.users).length // fix: global.db

    // Resolve target JID — LID handling
    let targetJid = global.info?.channel
    if (!targetJid) return true

    try {
        if (targetJid.includes('@lid') && this.signalRepository?.lidMapping) {
            const pn = await this.signalRepository.lidMapping.getPNForLID(targetJid)
            if (pn) targetJid = pn
        }

        const text = [
            `*[ Reset Limit Notification ]*`,
            ``,
            `*Bot Name:* ${this.getName(this.user.jid)}`,
            `*Bot Number:* ${this.user.jid.split('@')[0]}`,
            `*Reset Status:* Sukses ✅`,
            `*Limit Per User:* ${lim}`,
            `*Total Users:* ${totalUsers} Users`,
            `*Users Di-Reset:* ${resetCount} Users`,
            `*Users Di-Skip:* ${skipCount} Users (limit > 5)`,
            ``,
            `> Reset otomatis tiap 24 jam`
        ].join('\n')

        // Ganti raw query pake sendMessage biasa — lebih stable di 7.x
        await this.sendMessage(targetJid, { text })
    } catch (e) {
        console.error('[autoresetlimit error]', e)
    }

    setting.resetlimitDB = now
    return true
}