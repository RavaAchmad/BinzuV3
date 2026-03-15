import ytdlpWrapper from '../lib/yt-dlp-wrapper.js';
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
// YOUTUBE VIDEO DOWNLOADER (MP4)
// ============================================================

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  if (!text) {
    return m.reply(`*🎬 YOUTUBE VIDEO DOWNLOADER*\n\n*Cara pake:*\n${usedPrefix}${command} <url> [quality]\n\n*Contoh:*\n${usedPrefix}${command} https://youtu.be/dQw4w9WgXcQ 720\n\n*Quality:* 720 (default), 480, 360p\nDefault fallback ke 360p jika 720p unavailable.`);
  }

  try {
    await m.reply(wait);

    const query = text.split(" ")[0];
    const quality = args[0] || '720';

    console.log('[YTV] Starting:', { query, quality });

    // 1. GET VIDEO DATA (METADATA)
    let videoData;
    try {
      videoData = await ytdlpWrapper.getVideoData(query, quality);
    } catch (infoErr) {
      console.error('[YTV] getVideoData error:', infoErr.message);
      const errMsg = infoErr.message.includes('lebih dari 1 jam')
        ? 'Video terlalu panjang! (Max 1 jam)'
        : infoErr.message.includes('tidak ditemukan')
        ? 'Video tidak ditemukan'
        : `Error: ${infoErr.message}`;
      return m.reply(`❌ ${errMsg}`);
    }

    const { title, duration, resolution } = videoData;

    // 2. DOWNLOAD VIDEO (WITH FALLBACK)
    let result;
    try {
      result = await ytdlpWrapper.getVideoFile(query, quality);
    } catch (dlErr) {
      console.error('[YTV] Download @' + quality + 'p failed, trying 360p fallback...');
      
      // Fallback ke 360p jika kualitas lebih tinggi gagal
      if (quality !== '360') {
        try {
          result = await ytdlpWrapper.getVideoFile(query, '360');
          console.log('[YTV] Fallback 360p success');
        } catch (fallbackErr) {
          console.error('[YTV] Fallback also failed:', fallbackErr.message);
          return m.reply(`❌ Download failed (tried ${quality}p & 360p): ${fallbackErr.message}`);
        }
      } else {
        return m.reply(`❌ Download failed: ${dlErr.message}`);
      }
    }

    const { filePath, quality: actualQuality } = result;
    console.log('[YTV] Download success:', filePath);

    // 3. VALIDATE FILE
    if (!fs.existsSync(filePath)) {
      console.error('[YTV] File not found:', filePath);
      return m.reply('❌ File hilang!');
    }

    const fileStats = fs.statSync(filePath);
    const fileSize = formatSize(fileStats.size);

    // 4. BUILD MESSAGE
    let caption = '';
    caption += `🎬 *YOUTUBE VIDEO DOWNLOADER*\n\n`;
    caption += `📝 *Title:* ${title}\n`;
    caption += `⏱️ *Duration:* ${formatDuration(duration)}\n`;
    caption += `📺 *Quality:* ${actualQuality}\n`;
    caption += `💾 *Size:* ${fileSize}`;

    await m.reply(caption);

    // 5. SEND VIDEO FILE
    try {
      const fileName = `${title}.mp4`;
      const videoBuffer = fs.readFileSync(filePath);

      await conn.sendMessage(m.chat, {
        video: videoBuffer,
        mimetype: 'video/mp4',
        fileName: fileName
      }, { quoted: m });

      console.log('[YTV] Video sent:', fileName);
    } catch (sendErr) {
      console.error('[YTV] Send error:', sendErr.message);
      m.reply(`❌ Send failed: ${sendErr.message}`);
    }

    // 6. CLEANUP
    setTimeout(() => {
      try {
        ytdlpWrapper.cleanup(filePath);
      } catch (e) {
        console.error('[YTV] Cleanup error:', e.message);
      }
    }, 1000);

  } catch (err) {
    console.error('[YTV] Error:', err.message, err.stack);
    m.reply(`❌ *Error:* ${err.message}`);
  }
};

handler.help = ['ytmp4 <url> [quality]'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytv)$/i;
handler.limit = true;

export default handler;