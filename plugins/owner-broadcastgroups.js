import { interactiveMsg, sendInteractiveMessage } from '../lib/buttons.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text && !m.quoted) throw '❌ Teksnya mana? Tulis pesan atau reply pesan yang mau di-broadcast'

  let groups = Object.entries(conn.chats)
    .filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats && !chat.metadata?.read_only && !chat.metadata?.announce)
    .map(v => v[0])

  // Detect image from quoted or attached
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || q.mediaType || q.mtype || ''
  let img = /image/i.test(mime) ? await q.download?.() : null
  let teks = text || q.text || ''

  if (!teks && !img) throw '❌ Tidak ada teks atau gambar untuk broadcast'

  // Config data
  const channelId = global.info?.channel || ''
  const channelName = global.info?.namechannel || 'ʙɪɴᴢᴜ Bot'
  const botName = global.info?.namebot || 'ʙɪɴᴢᴜ Bot'
  const thumbUrl = global.thum || ''
  const channelLink = `https://whatsapp.com/channel/${channelId.replace('@newsletter', '')}`

  // Newsletter context — shows channel badge on message
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

  // Interactive buttons: .menu (command), channel (link), .sewa (command)
  const interactiveButtons = [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: '📋 Menu', id: `${usedPrefix}menu` })
    },
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({ display_text: `🔔 ${channelName}`, url: channelLink })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: '💎 Sewa Bot', id: `${usedPrefix}sewa` })
    }
  ]

  const footer = `${botName} • Follow channel kami!`

  conn.reply(m.chat, `⏳ _Mengirim broadcast ke *${groups.length}* grup..._`, m)

  let success = 0, fail = 0

  for (let id of groups) {
    try {
      if (sendInteractiveMessage) {
        // Use baileys_helper interactive message
        let content = {
          text: teks,
          footer,
          contextInfo,
          interactiveButtons
        }
        // If image, add as header
        if (img) content.image = img
        // If no image but thumb available, use thumb as header  
        else if (thumbUrl) content.image = { url: thumbUrl }

        await sendInteractiveMessage(conn, id, content)
      } else {
        // Fallback: plain message with channel context
        if (img) {
          await conn.sendMessage(id, {
            image: img,
            caption: `${teks}\n\n_${footer}_\n🔔 ${channelLink}`,
            contextInfo
          })
        } else {
          await conn.sendMessage(id, {
            text: `${teks}\n\n_${footer}_\n🔔 ${channelLink}`,
            contextInfo
          })
        }
      }
      success++
    } catch (e) {
      fail++
      console.log(`[BC] Gagal kirim ke ${id}:`, e.message || e)
    }
    await delay(2000)
  }

  m.reply(`✅ *Broadcast Selesai!*\n\n📤 Berhasil: ${success} grup\n❌ Gagal: ${fail} grup\n📊 Total: ${groups.length} grup`)
}

handler.menuowner = ['bcgroup']
handler.tagsowner = ['owner']
handler.command = /^((bc|broadcast)(gc|gro?ups?)(meme)?)$/i

handler.owner = true

export default handler

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
