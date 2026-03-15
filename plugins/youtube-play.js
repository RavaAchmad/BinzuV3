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
// YOUTUBE DOWNLOADER - YTDLP
// ============================================================

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) throw 'Enter Title / Link From YouTube!';
  try {
    await m.reply(wait);

    console.log('[PLAY] Query:', text);

    // 1. GET VIDEO INFO (SEARCH + METADATA)
    let videoInfo;
    try {
      videoInfo = await ytdlpWrapper.getVideoInfo(text);
    } catch (infoErr) {
      console.error('[PLAY] getVideoInfo error:', infoErr.message);
      const errMsg = infoErr.message.includes('lebih dari 1 jam') 
        ? 'Video terlalu panjang! (Max 1 jam)'
        : infoErr.message.includes('tidak ditemukan')
        ? 'Video tidak ditemukan di YouTube'
        : `Gagal ambil info: ${infoErr.message}`;
      return m.reply(`❌ ${errMsg}`);
    }

    const { title, videoId, duration, author, description, thumbnail, views, url } = videoInfo;
    console.log('[PLAY] Video found:', videoId);

    // 2. DOWNLOAD AUDIO
    let result;
    try {
      result = await ytdlpWrapper.getAudioFile(text, '128');
    } catch (dlErr) {
      console.error('[PLAY] Download error:', dlErr.message);
      const errMsg = dlErr.message.includes('tidak ditemukan')
        ? 'File download tidak ditemukan (Server error)'
        : `Download failed: ${dlErr.message}`;
      return m.reply(`❌ ${errMsg}`);
    }

    const { filePath } = result;
    console.log('[PLAY] Download success:', filePath);

    // 3. VALIDATE FILE
    if (!fs.existsSync(filePath)) {
      console.error('[PLAY] File not found:', filePath);
      return m.reply('❌ File hasil download hilang!');
    }

    const fileStats = fs.statSync(filePath);
    const fileSize = formatSize(fileStats.size);

    // 4. BUILD CAPTION
    let caption = '';
    caption += `🎵 *YOUTUBE DOWNLOADER*\n\n`;
    caption += `📝 *Title:* ${title}\n`;
    caption += `🔗 *ID:* ${videoId}\n`;
    caption += `⏱️ *Duration:* ${formatDuration(duration)}\n`;
    caption += `👤 *Author:* ${author}\n`;
    caption += `👁️ *Views:* ${views || 'N/A'}\n`;
    caption += `💾 *Size:* ${fileSize}\n`;
    caption += `📄 *Desc:* ${description?.substring(0, 80) || 'N/A'}...`;

    // 5. FETCH THUMBNAIL
    let thumbnailBuffer = Buffer.alloc(0);
    try {
      const { data } = await conn.getFile(thumbnail, true);
      thumbnailBuffer = data;
    } catch (thumbErr) {
      console.log('[PLAY] Thumbnail fetch failed:', thumbErr.message);
      if (global.thum) {
        try {
          const { data } = await conn.getFile(global.thum, true);
          thumbnailBuffer = data;
        } catch (e) {
          thumbnailBuffer = Buffer.alloc(0);
        }
      }
    }

    // 6. SEND TEXT MESSAGE WITH THUMBNAIL
    await conn.relayMessage(m.chat, {
      extendedTextMessage: {
        text: caption,
        contextInfo: {
          externalAdReply: {
            title: title,
            mediaType: 1,
            previewType: 0,
            renderLargerThumbnail: true,
            thumbnail: thumbnailBuffer,
            sourceUrl: url
          }
        },
        mentions: [m.sender]
      }
    }, {});

    // 7. SEND AUDIO FILE
    try {
      const fileName = `${title}.mp3`;
      const audioBuffer = fs.readFileSync(filePath);
      
      await conn.sendMessage(m.chat, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: fileName
      }, { quoted: m });

      console.log('[PLAY] Audio sent successfully:', fileName);
    } catch (sendErr) {
      console.error('[PLAY] Send error:', sendErr.message);
      m.reply(`❌ Gagal kirim audio: ${sendErr.message}`);
    }

    // 8. CLEANUP AFTER SEND (5 DETIK)
    setTimeout(() => {
      try {
        ytdlpWrapper.cleanup(filePath);
      } catch (cleanErr) {
        console.error('[PLAY] Cleanup error:', cleanErr.message);
      }
    }, 5000);

  } catch (e) {
    console.error('[PLAY] Error:', e.message, e.stack);
    m.reply(`❌ *Error:* ${e.message}`);
  }
};

handler.command = handler.help = ['play', 'song', 'xm'];
handler.tags = ['downloader'];
handler.exp = 0;
handler.limit = true;
handler.premium = false;

export default handler;