import fetch from 'node-fetch';

const regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://github.com/user/repo`
    if (!regex.test(args[0])) throw 'Link GitHub tidak valid!'
    let [_, user, repo] = args[0].match(regex) || []
    repo = repo.replace(/.git$/, '')
    let url = `https://api.github.com/repos/${user}/${repo}/zipball`
    try {
        await m.reply('🔍 Sedang mengunduh repository...')
        let res = await fetch(url, { method: 'HEAD' })
        let filename = res.headers.get('content-disposition')?.match(/attachment; filename=(.*)/)?.[1] || `${repo}.zip`
        await conn.sendFile(m.chat, url, filename, null, m)
    } catch (e) {
        m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['gitclone <url>']
handler.tags = ['downloader']
handler.command = /gitclone/i
handler.limit = true

export default handler
