let handler = async (m, { conn }) => {
  if (!m.isGroup) return // cuma jalan di grup

  // potongan teks pemicu
  const triggerSnippet = "assalamu'alaikum adik adik untuk angkatan 63 dimohon untuk mengisi list nama dan kelasnya"
  const userText = (m.text || "").toLowerCase().trim()

  // cek apakah pesan mengandung potongan teks target
  if (!userText.includes(triggerSnippet)) return

  const groupId = m.chat
  const meta = await conn.groupMetadata(groupId)
  const mentions = meta.participants.map(p => p.id)

  const formattedText = `@${meta.subject}\n\n${m.text}`

  await conn.sendMessage(groupId, {
    text: formattedText,
    mentions,
    contextInfo: {
      mentionedJid: mentions,
      groupMentions: [
        {
          groupSubject: meta.subject,
          groupJid: groupId
        }
      ]
    }
  })


  console.log(`✅ Triggered include-text mention in ${meta.subject}`)
}

handler.customPrefix = /^(?!\.).+/i // biar non-command bisa trigger
handler.command = new RegExp()
handler.group = true

export default handler
