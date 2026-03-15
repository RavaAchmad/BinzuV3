import { downloadFromYouTube, formatFileSize, formatDuration, isValidDuration } from '../lib/youtube-api.js';

// ============================================================
// YOUTUBE AUDIO DOWNLOADER (MP3) - DIRECT
// ============================================================

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    throw `Gunakan: ${usedPrefix}${command} <URL YouTube>\n\nContoh:\n${usedPrefix}${command} https://youtu.be/dQw4w9WgXcQ`;
  }

  if (!text.startsWith('https://')) {
    return m.reply(`⚠️ Gunakan */.play* atau */.song* untuk mencari lagu.\nGunakan command ini untuk URL YouTube langsung.\n\nContoh:\n${usedPrefix}${command} https://youtu.be/...`);
  }

  try {
    await m.reply('⏳ Mengunduh audio...');

    console.log('[YTA] Downloading audio from:', text);

    // Download audio from API
    const downloadData = await downloadFromYouTube(text, 'audio');
    const { downloadUrl, title, duration, views, fileSize } = downloadData;

    // Validate duration
    if (!isValidDuration(duration)) {
      return m.reply('❌ Video terlalu panjang! (Max 1 jam)');
    }

    // Build caption
    const caption = `🎵 *YOUTUBE MP3*

📝 *Title:* ${title}
⏱️ *Duration:* ${duration}
👁️ *Views:* ${views}
💾 *Size:* ${fileSize}`;

    // Send audio
    try {
      await conn.sendMessage(m.chat, {
        audio: { url: downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`
      }, { quoted: m });

      await m.reply(caption);
      console.log('[YTA] Audio sent successfully:', title);

    } catch (sendErr) {
      console.error('[YTA] Send error:', sendErr.message);
      m.reply(`❌ Gagal mengirim audio: ${sendErr.message}`);
    }

  } catch (error) {
    console.error('[YTA] Error:', error.message);
    m.reply(`❌ ${error.message}`);
  }
};

handler.help = ['ytmp3 <URL>', 'yta <URL>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp3|yta)$/i;

export default handler;