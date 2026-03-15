import { downloadFromYouTube, formatFileSize, formatDuration, isValidDuration } from '../lib/youtube-api.js';

// ============================================================
// YOUTUBE VIDEO DOWNLOADER (MP4) - DIRECT
// ============================================================

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    throw `Gunakan: ${usedPrefix}${command} <URL YouTube>\n\nContoh:\n${usedPrefix}${command} https://youtu.be/dQw4w9WgXcQ`;
  }

  if (!text.startsWith('https://')) {
    return m.reply(`⚠️ Gunakan */.play* atau */.song* untuk mencari video.\nGunakan command ini untuk URL YouTube langsung.\n\nContoh:\n${usedPrefix}${command} https://youtu.be/...`);
  }

  try {
    await m.reply('⏳ Mengunduh video...');

    console.log('[YTV] Downloading video from:', text);

    // Download video from API
    const downloadData = await downloadFromYouTube(text, 'video');
    const { downloadUrl, title, duration, views, fileSize } = downloadData;

    // Validate duration
    if (!isValidDuration(duration)) {
      return m.reply('❌ Video terlalu panjang! (Max 1 jam)');
    }

    // Build caption
    const caption = `🎬 *YOUTUBE VIDEO*

📝 *Title:* ${title}
⏱️ *Duration:* ${duration}
👁️ *Views:* ${views}
💾 *Size:* ${fileSize}`;

    // Send video
    try {
      await conn.sendMessage(m.chat, {
        video: { url: downloadUrl },
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`,
        caption: caption
      }, { quoted: m });

      console.log('[YTV] Video sent successfully:', title);

    } catch (vidErr) {
      console.error('[YTV] Video send error:', vidErr.message);
      
      // Fallback to document
      try {
        await conn.sendMessage(m.chat, {
          document: { url: downloadUrl },
          mimetype: 'video/mp4',
          fileName: `${title}.mp4`,
          caption: `🎬 Title: ${title}\n\n(Dikirim sebagai dokumen)`
        }, { quoted: m });
      } catch (docErr) {
        m.reply(`❌ Gagal mengirim video: ${docErr.message}`);
      }
    }

  } catch (error) {
    console.error('[YTV] Error:', error.message);
    m.reply(`❌ ${error.message}`);
  }
};

handler.help = ['ytmp4 <URL>', 'ytv <URL>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytv)$/i;
handler.limit = true;

export default handler;