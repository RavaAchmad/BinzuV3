import fetch from 'node-fetch';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.instagram.com/p/ByxKbUSnubS/?utm_source=ig_web_copy_link`

    try {
        const api = await fetch(`https://api.botcahx.eu.org/api/dowloader/igdowloader?url=${args[0]}&apikey=${btc}`)
        const res = await api.json()
        
			const seen = new Set();
			const filteredResults = [];
			for (let item of res.result) {
				if (!seen.has(item.url)) {
					filteredResults.push(item);
					seen.add(item.url);
				}
			}

			const limitnya = 999;
			for (let i = 0; i < Math.min(limitnya, filteredResults.length); i++) {
				await sleep(3000);
				conn.sendFile(m.chat, filteredResults[i].url, null, `*Instagram Downloader*`, m)
			}
    } catch (e) {
        throw `*Server Down!*`
    }
}

handler.help = ['instagram'].map(v => v + ' <url>')
handler.tags = ['downloader']
handler.command = /^(ig|instagram|igdl|instagramdl|igstroy)$/i
handler.limit = true

export default handler

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}