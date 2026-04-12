/*let handler = async (m, { conn, text, usedPrefix, command, participants }) => {
	let chats = Object.entries(conn.chats).filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats && !chat.metadata?.read_only && !chat.metadata?.announce).map(v => v[0])
	let img, q = m.quoted ? m.quoted : m
	let mime = (q.msg || q).mimetype || q.mediaType || q.mtype || ''
	if (!text) throw `teks nya mana ?`
	if (mime) img = await q.download?.()
	conn.reply(m.chat, `_Mengirim pesan broadcast ke ${chats.length} chat_`, m)
	let teks = command.includes('meme') ? `${text}` : `${text}`
	for (let id of chats) {
		try {
			if (/image|video|viewOnce/g.test(mime)) {
				if (command.includes('meme')) await conn.sendFile(id, img, '', teks)
				else await conn.sendFile(id, img, '', teks)
			} else await conn.sendMessage(id, teks)
		} catch (e) {
			console.log(e)
		}
		await delay(3000)
	}
	await m.reply('Selesai Broadcast All Group Chat :)')
}*/


import { quickButtons } from '../lib/buttons.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
	let groups = Object.entries(conn.chats).filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats && !chat.metadata?.read_only && !chat.metadata?.announce).map(v => v[0])
	let cc = text ? m : m.quoted ? await m.getQuotedObj() : false || m
	let teks = text ? text : cc.text
	let img, mime = (cc.msg || cc).mimetype || cc.mediaType || cc.mtype || ''
	if (/image|video|viewOnce/g.test(mime)) img = await cc.download?.()

	// Channel & thumb from config
	const channelId = global.info?.channel || ''
	const channelName = global.info?.namechannel || 'Channel'
	const thumb = global.thum || null
	const channelUrl = `https://wa.me/${channelId.replace(/@.*/, '')}?text=Halo` // fallback if not newsletter
	const channelLink = channelId.endsWith('@newsletter') ? `https://whatsapp.com/channel/${channelId.replace('@newsletter','')}` : channelUrl

	// Buttons
	const buttons = [
		{ id: usedPrefix + 'menu', text: '📋 Menu' },
		{ id: usedPrefix + 'sewa', text: '💎 Sewa Bot' },
		{ id: channelLink, text: '🌐 Channel', url: true }
	]

	// Footer
	const footer = `Official Channel: ${channelName}\n${channelLink}`

	// Compose message
	let sendToGroup = async (id) => {
		try {
			if (img) {
				// Send image with caption, thumb, and buttons
				await conn.sendMessage(id, {
					image: img,
					caption: teks,
					jpegThumbnail: thumb,
					footer,
					buttons: [
						{ buttonId: usedPrefix + 'menu', buttonText: { displayText: '📋 Menu' }, type: 1 },
						{ buttonId: usedPrefix + 'sewa', buttonText: { displayText: '💎 Sewa Bot' }, type: 1 },
						{ buttonId: channelLink, buttonText: { displayText: '🌐 Channel' }, type: 1, urlButton: true }
					]
				})
			} else {
				// Use quickButtons (baileys_helper) if available, fallback to text
				await quickButtons(conn, id, teks, footer, buttons)
			}
		} catch (e) {
			console.log(e)
		}
		await delay(2000)
	}

	conn.reply(m.chat, `_Mengirim pesan broadcast ke ${groups.length} grup_`, m)
	for (let id of groups) await sendToGroup(id)
	m.reply('Selesai Broadcast All Group :)')
}

handler.menuowner = ['bcgroup']
handler.tagsowner = ['owner']
handler.command = /^((bc|broadcast)(gc|gro?ups?)(meme)?)$/i

handler.owner = true

export default handler

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
