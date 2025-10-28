/*• Nama Fitur : Iqc
• Type : Plugin ESM
• Link Channel : https://whatsapp.com/channel/0029VbB8WYS4CrfhJCelw33j
• Author : Agas
*/
 
 
let handler = async (m, { conn, text }) => {
  if (!text) return m.reply('Example :\n.iqc lu hitam')
 
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
 
  let now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
  let date = new Date(now)
 
  let offsetMinutes = Math.floor(Math.random() * (60 - 30 + 1)) + 30
  let chatDate = new Date(date.getTime() - offsetMinutes * 60000)
 
  let chatTime = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(chatDate)
 
  let statusBarTime = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
 
  try {
        let url = `https://api.zenzxz.my.id/maker/fakechatiphone?text=${encodeURIComponent(text.trim())}&chatime=${encodeURIComponent(chatTime)}&statusbartime=${encodeURIComponent(statusBarTime)}`;
        await conn.sendMessage(
          m.chat,
          { image: { url } },
          { quoted: m }
        );
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    
  } catch (e) {
    try {
    const url = `https://api.deline.my.id/maker/iqc?text=${encodeURIComponent(text.trim())}&chatTime=${encodeURIComponent(chatTime)}&statusBarTime=${encodeURIComponent(statusBarTime)}`;
    await conn.sendMessage(
      m.chat,
      { image: { url } },
      { quoted: m }
    );
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        return;
    } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    throw e;
    }
    }
}
 
handler.help = ['iqc']
handler.tags = ['maker', 'sticker']
handler.command = ['iqc']
handler.register = true
handler.limit = true
 
export default handler