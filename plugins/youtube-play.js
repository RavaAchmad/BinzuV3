import { searchYouTube, downloadFromYouTube, formatFileSize, formatDuration, isValidDuration } from '../lib/youtube-api.js';

// ============================================================
// YOUTUBE INTERACTIVE DOWNLOADER (AUDIO/VIDEO SELECTION)
// ============================================================

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    throw `Gunakan contoh *${usedPrefix + command}* judul lagu`;
  }

  if (text.startsWith('https://')) {
    return m.reply(`Silahkan gunakan \`.ytmp3\` atau \`.yta\` untuk audio, atau \`.ytmp4\` atau \`.ytv\` untuk video`);
  }

  conn.youtubePlay = conn.youtubePlay ? conn.youtubePlay : {};

  try {
    // Wait message
    const { key } = await conn.sendMessage(m.chat, {
      text: 'Mencari video di YouTube...'
    }, { quoted: m });

    // Search videos
    const videos = await searchYouTube(text, 10);
    const limitedVideos = videos.slice(0, 10);

    const infoText = `Silahkan pilih lagu yang ingin diunduh dengan mereply pesan ini dengan angka yang sesuai (1-${Math.min(limitedVideos.length, 10)}).\n\n`;

    const orderedLinks = limitedVideos.map((link, index) => {
      const sectionNumber = index + 1;
      const { title, timestamp, author } = link;
      return `${sectionNumber}. *${title}*\n> Duration: ${timestamp}\n> Author: ${author.name}`;
    });

    const orderedLinksText = orderedLinks.join("\n\n");
    const fullText = `${infoText}${orderedLinksText}`;

    await conn.sendMessage(m.chat, {
      text: fullText,
      edit: key
    });

    conn.youtubePlay[m.sender] = {
      limitedVideos,
      key,
      step: 'select_song',
      timeout: setTimeout(() => {
        if (conn.youtubePlay[m.sender]) {
          conn.sendMessage(m.chat, { delete: key }).catch(() => {});
          delete conn.youtubePlay[m.sender];
        }
      }, 60 * 1000),
    };

  } catch (error) {
    console.error('[PLAY] Error:', error.message);
    m.reply(`❌ ${error.message}`);
  }
};

handler.before = async (m, { conn }) => {
  conn.youtubePlay = conn.youtubePlay ? conn.youtubePlay : {};
  if (m.isBaileys || !(m.sender in conn.youtubePlay)) return;

  const { limitedVideos, key, timeout, step } = conn.youtubePlay[m.sender];

  if (!m.quoted || m.quoted.id !== key.id || !m.text) return;

  try {
    // --- STEP 1: SELECT SONG ---
    if (step === 'select_song') {
      const choice = m.text.trim();
      const inputNumber = Number(choice);

      if (inputNumber >= 1 && inputNumber <= limitedVideos.length) {
        const info = limitedVideos[inputNumber - 1];
        
        // Validate duration
        if (!isValidDuration(info.timestamp)) {
          return m.reply('❌ Video terlalu panjang! (Max 1 jam)');
        }

        conn.youtubePlay[m.sender].selectedVideo = info;
        conn.youtubePlay[m.sender].step = 'select_format';

        const formatText = `Anda memilih lagu:
*${info.title}*

Silahkan pilih format yang diinginkan:
1. Audio (MP3)
2. Video (MP4)

Reply dengan angka 1 atau 2`;

        await conn.sendMessage(m.chat, {
          text: formatText,
          edit: key
        });
      } else {
        await m.reply(`❌ Nomor urutan tidak valid. Silakan pilih nomor antara 1 sampai ${limitedVideos.length}`);
      }

    // --- STEP 2: SELECT FORMAT & DOWNLOAD ---
    } else if (step === 'select_format') {
      const formatChoice = m.text.trim();
      const videoInfo = conn.youtubePlay[m.sender].selectedVideo;

      if (!['1', '2'].includes(formatChoice)) {
        return m.reply("❌ Pilihan format tidak valid. Silakan reply dengan:\n1 untuk Audio (MP3)\n2 untuk Video (MP4)");
      }

      clearTimeout(timeout);

      const isAudio = formatChoice === '1';
      const downloadType = isAudio ? 'audio' : 'video';

      const infoText = `*${isAudio ? 'AUDIO' : 'VIDEO'} INFORMATION*
- *Title:* ${videoInfo.title}
- *Duration:* ${videoInfo.timestamp}
- *Author:* ${videoInfo.author.name}
- *Format:* ${isAudio ? 'MP3' : 'MP4'}

${isAudio ? 'AUDIO' : 'VIDEO'} SEDANG DIUNDUH...`;

      await conn.sendMessage(m.chat, {
        text: infoText,
        edit: key
      });

      try {
        // Download from API
        const downloadData = await downloadFromYouTube(videoInfo.url, downloadType);
        const { downloadUrl, title, duration, views, fileSize } = downloadData;

        if (isAudio) {
          // --- AUDIO HANDLER ---
          try {
            await conn.sendMessage(m.chat, {
              audio: { url: downloadUrl },
              mimetype: 'audio/mpeg',
              fileName: `${title}.mp3`
            }, { quoted: m });

            console.log('[PLAY] Audio sent:', title);
          } catch (errAudio) {
            console.error('[PLAY] Audio send error:', errAudio.message);
            await m.reply('❌ Gagal mengirim audio.');
          }
        } else {
          // --- VIDEO HANDLER ---
          try {
            const caption = `🎬 *Title:* ${title}\n⏱️ *Duration:* ${duration}\n👁️ *Views:* ${views}\n📁 *Size:* ${fileSize}`;

            await conn.sendMessage(m.chat, {
              video: { url: downloadUrl },
              mimetype: 'video/mp4',
              fileName: `${title}.mp4`,
              caption: caption
            }, { quoted: m });

            console.log('[PLAY] Video sent:', title);
          } catch (vidErr) {
            console.error('[PLAY] Video send error, trying as document:', vidErr.message);
            
            // Fallback to document
            try {
              await conn.sendMessage(m.chat, {
                document: { url: downloadUrl },
                mimetype: 'video/mp4',
                fileName: `${title}.mp4`,
                caption: `🎬 Title: ${title}\n\n(Dikirim sebagai dokumen)`
              }, { quoted: m });
            } catch (docErr) {
              await m.reply('❌ Gagal mengirim video.');
            }
          }
        }
      } catch (downloadErr) {
        console.error('[PLAY] Download error:', downloadErr.message);
        await m.reply(`❌ Gagal mengunduh: ${downloadErr.message}`);
      } finally {
        delete conn.youtubePlay[m.sender];
        conn.sendMessage(m.chat, { delete: key }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('[PLAY] Handler error:', error.message);
    delete conn.youtubePlay[m.sender];
  }
};

handler.help = ['play', 'song', 'xm'];
handler.tags = ['downloader'];
handler.command = /^(play|song|xm)$/i;

export default handler;