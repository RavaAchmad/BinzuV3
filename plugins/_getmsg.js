export async function all(m) {    
    let chat = global.db.data.chats[m.chat]
    let user = global.db.data.users[m.sender]
    if (!m.isGroup || m.chat.endsWith('broadcast') || chat.isBanned || user.banned || m.isBaileys) return
    
    let msgs = chat.listStr
    let key = m.text.toLowerCase()
    if (!(key in msgs)) return

    try {
        let parsed = JSON.parse(JSON.stringify(msgs[key]), (_, v) => {
            if (v !== null && typeof v === 'object' && 'type' in v && Array.isArray(v.data)) {
                return Buffer.from(v.data)
            }
            return v
        })

        let _m = await this.serializeM(parsed)
        if (!_m) return 

        await this.sendMessage(m.chat, { forward: _m, force: true }, { quoted: m })
    } catch (e) {
        console.error('[listStr forward error]', e)
    }
}