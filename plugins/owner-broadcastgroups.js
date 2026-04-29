import { interactiveMsg } from '../lib/buttons.js'

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text && !m.quoted) throw 'Teksnya mana? Tulis pesan atau reply pesan yang mau di-broadcast'

  let groups = Object.entries(conn.chats)
    .filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats && !chat.metadata?.read_only && !chat.metadata?.announce)
    .map(v => v[0])

  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || q.mediaType || q.mtype || ''
  let img = /image/i.test(mime) ? await q.download?.() : null
  let teks = text || q.text || ''

  if (!teks && !img) throw 'Tidak ada teks atau gambar untuk broadcast'

  const channelId = global.info?.channel || ''
  const channelName = global.info?.namechannel || 'Binzu Bot'
  const botName = global.info?.namebot || 'Binzu Bot'
  const thumbUrl = global.thum || ''
  const channelLink = `https://whatsapp.com/channel/${channelId.replace('@newsletter', '')}`

  const contextInfo = {
    mentionedJid: [],
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: channelId,
      newsletterName: channelName,
      serverMessageId: -1
    }
  }

  const interactiveButtons = [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: 'Menu', id: `${usedPrefix}menu` })
    },
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({ display_text: channelName, url: channelLink })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: 'Sewa Bot', id: `${usedPrefix}sewa` })
    }
  ]

  const footer = `${botName} - Follow channel kami!`

  conn.reply(m.chat, `Mengirim broadcast ke *${groups.length}* grup...`, m)

  let success = 0
  let fail = 0

  for (let id of groups) {
    try {
      const content = {
        text: teks,
        footer,
        contextInfo,
        interactiveButtons
      }
      if (img) content.image = img
      else if (thumbUrl) content.image = { url: thumbUrl }

      await interactiveMsg(conn, id, content)
      success++
    } catch (e) {
      fail++
      console.log(`[BC] Gagal kirim ke ${id}:`, e.message || e)
    }
    await delay(2000)
  }

  m.reply(`Broadcast selesai!\n\nBerhasil: ${success} grup\nGagal: ${fail} grup\nTotal: ${groups.length} grup`)
}

handler.menuowner = ['bcgroup']
handler.tagsowner = ['owner']
handler.command = /^((bc|broadcast)(gc|gro?ups?)(meme)?)$/i
handler.owner = true

export default handler

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
