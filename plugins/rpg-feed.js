const FEED_COOLDOWN = 300000 // 5 menit
const PET_TYPES = ['fox', 'cat', 'dog', 'horse', 'robo']
const PET_EMOJIS = { fox: '🦊', cat: '🐈', dog: '🐕', horse: '🐴', robo: '🤖' }

let handler = async (m, { conn, args, usedPrefix }) => {
	let info = `
乂 List Pet:
🐈 • Cᴀᴛ
🐕 • Dᴏɢ
🐎 • Hᴏʀsᴇ
🦊 • Fᴏx
🤖 • Rᴏʙᴏ

*➠ Example:* ${usedPrefix}feed cat
*➠ Feed All:* ${usedPrefix}feed all
`.trim()
    let pesan = pickRandom(['ɴʏᴜᴍᴍᴍ~', 'ᴛʜᴀɴᴋs', 'ᴛʜᴀɴᴋʏᴏᴜ ^-^', '...', 'ᴛʜᴀɴᴋ ʏᴏᴜ~', 'ᴀʀɪɢᴀᴛᴏᴜ ^-^'])
    let type = (args[0] || '').toLowerCase()
    let user = global.db.data.users[m.sender]

    if (type === 'all') {
        // Feed ALL pets at once
        let __waktuAll = (new Date - (user.feedalllast || 0))
        let _waktuAll = (FEED_COOLDOWN - __waktuAll)
        if (_waktuAll > 0) {
            return m.reply(`ᴘᴇᴛs ᴍᴀsɪʜ ᴋᴇɴʏᴀɴɢ, ᴛᴜɴɢɢᴜ:\n➞ *${clockString(_waktuAll)}*`)
        }

        let ownedPets = PET_TYPES.filter(p => user[p] > 0 && user[p] < 10)
        if (ownedPets.length === 0) return m.reply('ᴋᴀᴍᴜ ᴛɪᴅᴀᴋ ᴘᴜɴʏᴀ ᴘᴇᴛ ʏᴀɴɢ ʙɪsᴀ ᴅɪ-ғᴇᴇᴅ!')

        let needed = ownedPets.length
        if (user.petfood < needed) return m.reply(`ᴘᴇᴛ ғᴏᴏᴅ ᴋᴜʀᴀɴɢ! Butuh *${needed}*, punya *${user.petfood}*`)

        let results = []
        for (let pet of ownedPets) {
            user.petfood -= 1
            user[pet + 'exp'] = (user[pet + 'exp'] || 0) + 20
            let lvl = user[pet]
            let naiklvl = (lvl * 100) - 1
            let leveledUp = false
            if (user[pet + 'exp'] > naiklvl) {
                user[pet] += 1
                user[pet + 'exp'] -= (lvl * 100)
                leveledUp = true
            }
            user[pet + 'lastfeed'] = new Date * 1
            results.push(`${PET_EMOJIS[pet]} *${pet.capitalize()}* Lv.${user[pet]}${leveledUp ? ' ⬆️ LEVEL UP!' : ''} — ${pickRandom(['ɴʏᴜᴍᴍᴍ~', 'ᴛʜᴀɴᴋs!', '^-^'])}`)
        }

        user.feedalllast = new Date * 1
        return m.reply(`🍖 *FEED ALL PETS*\n\n${results.join('\n')}\n\n📦 Pet Food: ${user.petfood} remaining`)
    }

    // Single pet feed
    let emo = PET_EMOJIS[type] || ''
    if (!PET_TYPES.includes(type)) return m.reply(info)

    let petLevel = user[type]
    if (petLevel == 0) return m.reply('ʏᴏᴜ ᴅᴏɴ\'ᴛ ʜᴀᴠᴇ ᴛʜɪs ᴘᴇᴛ ʏᴇᴛ!')
    if (petLevel == 10) return m.reply('ʏᴏᴜʀ ᴘᴇᴛ ɪs ᴍᴀx ʟᴇᴠᴇʟ !')

    let __waktu = (new Date - (user[type + 'lastfeed'] || 0))
    let _waktu = (FEED_COOLDOWN - __waktu)
    if (_waktu > 0) {
        return m.reply(`ʏᴏᴜʀ ᴘᴇᴛ ɪs ғᴜʟʟ, ᴛʀʏ ғᴇᴇᴅɪɴɢ ɪᴛ ᴀɢᴀɪɴ ɪɴ\n➞ *${clockString(_waktu)}*`)
    }

    if (user.petfood <= 0) return m.reply('ʏᴏᴜʀ ᴘᴇᴛ ғᴏᴏᴅ ɴᴏᴛ ᴇɴᴏᴜɢʜ')

    user.petfood -= 1
    user[type + 'exp'] = (user[type + 'exp'] || 0) + 20
    user[type + 'lastfeed'] = new Date * 1

    m.reply(`ғᴇᴇᴅɪɴɢ *${type}*...\n*${emo} ${type.capitalize()}:* ${pesan}`)

    if (petLevel > 0) {
        let naiklvl = (petLevel * 100) - 1
        if (user[type + 'exp'] > naiklvl) {
            user[type] += 1
            user[type + 'exp'] -= (petLevel * 100)
            m.reply('*ᴄᴏɴɢʀᴀᴛs!* , ʏᴏᴜʀ ᴘᴇᴛ ʟᴇᴠᴇʟᴜᴘ')
        }
    }
}
handler.help = ['feed [pet type]']
handler.tags = ['rpg']
handler.command = /^(feed(ing)?)$/i

handler.register = true
handler.group = true
handler.rpg = true
export default handler

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, ' H ', m, ' M ', s, ' S'].map(v => v.toString().padStart(2, 0)).join('')
}
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}
