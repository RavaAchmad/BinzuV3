import ytdlWrapper from '../lib/ytdl-core-wrapper.js';
import fs from 'fs';


// Handler utama buat ngerespon perintah dari user
const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  if (!text) {
    return m.reply(`*Cara pakenya gini, cuy:*\n${usedPrefix}${command} <url youtube> [720/360]\n\n*Contoh:*\n${usedPrefix}${command} https://youtu.be/dQw4w9WgXcQ 720\n\nDefault 720p, fallback ke 360p kalau gak ada.`);
  }

  const url = text.split(" ")[0];
  const quality = args[0] || '720';

  // Validasi URL YouTube
  if (!/youtube\.com|youtu\.be/.test(url)) {
    return m.reply("❌ *URL YouTube-nya gak valid, nih. Coba copy-paste lagi.*");
  }

  try {
    m.reply("⏳ *Sabar ya, lagi di-download video... Bentar lagi beres kok!*");

    console.log('[YTV] Starting download:', { query: url, quality });

    // Download video
    let result;
    try {
      result = await ytdlWrapper.getVideoFile(url, quality);
    } catch (e) {
      // Fallback ke 360p kalau 720p gagal
      if (quality === '720') {
        console.log('[YTV] Quality 720 failed, trying 360p fallback...');
        result = await ytdlWrapper.getVideoFile(url, '360');
      } else {
        throw e;
      }
    }

    const { filePath, title } = result;

    console.log('[YTV] Download success:', filePath);

    const caption = `
✅ *DOWNLOAD VIDEO BERES!*

🎬 *Judul:* ${title}
📺 *Format:* MP4
📥 *Quality:* ${quality}p
`.trim();

    await conn.sendMessage(m.chat, {
      video: fs.readFileSync(filePath),
      mimetype: 'video/mp4',
      caption: caption
    }, { quoted: m });

    // Cleanup after send
    setTimeout(() => ytdlWrapper.cleanup(filePath), 5000);

  } catch (err) {
    console.error('[YTV] Error:', err.message);
    m.reply(`❌ *Yah, gagal download cuy.*\n\n*Error:* ${err.message}`);
  }
};

// Info & konfigurasi command
handler.help = ['ytmp4 <url>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytv)$/i;
handler.limit = true;

// Export handler-nya biar bisa dipake di file utama
export default handler;