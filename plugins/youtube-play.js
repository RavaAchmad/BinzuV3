import ytdlWrapper from '../lib/ytdl-core-wrapper.js';
import search from 'yt-search';
import fs from 'fs';

// ============================================================
// YOUTUBE DOWNLOADER - YTDL-CORE
// ============================================================

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) throw 'Enter Title / Link From YouTube!';
  try {
    await m.reply(wait);

    console.log('[PLAY] Query:', text);

    // Get video info (search + metadata)
    const videoInfo = await ytdlWrapper.getVideoInfo(text);
    const { title, videoId, duration, author, description, thumbnail, views, url } = videoInfo;

    console.log('[PLAY] Video found:', videoId);

    // Download audio
    const result = await ytdlWrapper.getAudioFile(text, '128');
    const { filePath } = result;

    console.log('[PLAY] Download success:', filePath);

    // Build caption dengan info lengkap
    let caption = '';
    caption += `∘ Title : ${title}\n`;
    caption += `∘ ID : ${videoId}\n`;
    caption += `∘ Duration : ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}\n`;
    caption += `∘ Viewers : ${views || 'N/A'}\n`;
    caption += `∘ Author : ${author}\n`;
    caption += `∘ Description : ${description?.substring(0, 100) || 'N/A'}...\n`;
    caption += `∘ Url : ${url}`;

    // Fetch thumbnail with error handling
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

    // Send text message with thumbnail
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

    // Send audio file
    const fileName = `${title}.mp3`;
    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(filePath),
      mimetype: 'audio/mpeg',
      fileName: fileName
    }, { quoted: m });

    // Cleanup after send
    setTimeout(() => ytdlWrapper.cleanup(filePath), 5000);

  } catch (e) {
    console.error('[PLAY] Error:', e.message);
    m.reply(`❌ *Error:* ${e.message}`);
  }
};

handler.command = handler.help = ['play', 'song', 'xm'];
handler.tags = ['downloader'];
handler.exp = 0;
handler.limit = true;
handler.premium = false;

export default handler;