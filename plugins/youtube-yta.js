import ytdlWrapper from '../lib/ytdl-core-wrapper.js';
import fs from 'fs';




const handler = async (m, { conn, text, usedPrefix, command, args }) => {
  if (!text) {
    throw `*Example:* ${usedPrefix + command} https://www.youtube.com/watch?v=Z28dtg_QmFw [bitrate]\n\n*Bitrate:* 128 (default), 192, 320`;
  }

  try {
    m.reply(wait);

    // Extract bitrate dari args
    const bitrate = args[0] || '128';

    console.log('[YTA] Starting download:', { query: text, bitrate });

    // Download audio
    const result = await ytdlWrapper.getAudioFile(text, bitrate);
    const { filePath, title } = result;

    console.log('[YTA] Download success:', filePath);

    // Send file
    const fileName = `${title}.mp3`;

    await conn.sendMessage(m.chat, {
      audio: fs.readFileSync(filePath),
      mimetype: 'audio/mpeg',
      fileName: fileName
    }, { quoted: m });

    // Cleanup after send
    setTimeout(() => ytdlWrapper.cleanup(filePath), 5000);

  } catch (error) {
    console.error('[YTA] Error:', error.message);
    m.reply(`❌ *Error:* ${error.message}`);
  }
};

handler.help = handler.command = ['ytmp3', 'yta'];
handler.tags = ['downloader'];
handler.limit = true;

export default handler;