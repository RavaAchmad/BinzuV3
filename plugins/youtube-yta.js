import { getAudioData, getAudioFile, cleanup } from './yt-dlp-utils.js';
import fs from 'fs';

// ============================================================
// HELPER FUNCTIONS
// ============================================================
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds) => {
  if (!seconds) return '00:00';
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  return hh > 0 ? `${hh}:${mm.toString().padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
};

// ============================================================
// YOUTUBE AUDIO DOWNLOADER (MP3)
// ============================================================

const handler = async (m, { conn, text, usedPrefix, command, args }) => {
  if (!text) {
    throw `*Example:* ${usedPrefix + command} https://www.youtube.com/watch?v=Z28dtg_QmFw\n\nDefault bitrate: 128 (Supports: 128, 192, 320)`;
  }

  try {
    await m.reply(wait);

    const query = text.split(" ")[0];
    const bitrate = args[0] || '128';

    console.log('[YTA] Starting:', { query, bitrate });

    // 1. GET AUDIO DATA (METADATA)
    let audioData;
    try {
      audioData = await getAudioData(query);
    } catch (infoErr) {
      console.error('[YTA] getAudioData error:', infoErr.message);
      const errMsg = infoErr.message.includes('lebih dari 1 jam')
        ? 'Video terlalu panjang! (Max 1 jam)'
        : infoErr.message.includes('tidak ditemukan')
        ? 'Video tidak ditemukan'
        : `Error: ${infoErr.message}`;
      return m.reply(`❌ ${errMsg}`);
    }

    const { title, duration, bitrate: defaultBitrate } = audioData;

    // 2. DOWNLOAD AUDIO
    let result;
    try {
      result = await getAudioFile(query, bitrate);
    } catch (dlErr) {
      console.error('[YTA] Download error:', dlErr.message);
      return m.reply(`❌ Download failed: ${dlErr.message}`);
    }

    const { filePath } = result;
    console.log('[YTA] Download success:', filePath);

    // 3. VALIDATE FILE
    if (!fs.existsSync(filePath)) {
      console.error('[YTA] File not found:', filePath);
      return m.reply('❌ File hilang!');
    }

    const fileStats = fs.statSync(filePath);
    const fileSize = formatSize(fileStats.size);

    // 4. BUILD MESSAGE
    let caption = '';
    caption += `🎵 *YOUTUBE MP3 DOWNLOADER*\n\n`;
    caption += `📝 *Title:* ${title}\n`;
    caption += `⏱️ *Duration:* ${formatDuration(duration)}\n`;
    caption += `🔊 *Bitrate:* ${bitrate}kbps\n`;
    caption += `💾 *Size:* ${fileSize}`;

    await m.reply(caption);

    // 5. SEND AUDIO FILE
    try {
      const fileName = `${title}.mp3`;
      const audioBuffer = fs.readFileSync(filePath);

      await conn.sendMessage(m.chat, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: fileName
      }, { quoted: m });

      console.log('[YTA] Audio sent:', fileName);
    } catch (sendErr) {
      console.error('[YTA] Send error:', sendErr.message);
      m.reply(`❌ Send failed: ${sendErr.message}`);
    }

    // 6. CLEANUP
    setTimeout(() => {
      try {
        cleanup(filePath);
      } catch (e) {
        console.error('[YTA] Cleanup error:', e.message);
      }
    }, 5000);

  } catch (error) {
    console.error('[YTA] Error:', error.message, error.stack);
    m.reply(`❌ *Error:* ${error.message}`);
  }
};

handler.help = handler.command = ['ytmp3', 'yta'];
handler.tags = ['downloader'];
handler.limit = true;

export default handler;