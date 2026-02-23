import search from 'yt-search';
import axios from 'axios';

// ============================================================
// YOUTUBE DOWNLOADER - AMIRA API
// ============================================================

const handler = async (m, { conn, text, usedPrefix }) => {
    if (!text) throw 'Enter Title / Link From YouTube!';
    try {
        await m.reply(wait);

        const look = await search(text);
        const convert = look.videos[0];
        if (!convert) throw 'Video/Audio Tidak Ditemukan';

        if (convert.seconds >= 3600) {
            return conn.reply(m.chat, 'Video is longer than 1 hour!', m);
        }

        // Fetch via Amira API
        const { data: res } = await axios.get(
            `https://chocomilk.amira.us.kg/v1/download/aio?url=${encodeURIComponent(convert.url)}`
        );

        if (!res.success || !res.data?.medias?.length) throw 'Gagal mengambil audio dari API';

        // Ambil audio terbaik (prioritas medium quality m4a)
        const audios = res.data.medias.filter(m => m.type === 'audio');
        const best = audios.find(a => a.audioQuality === 'AUDIO_QUALITY_MEDIUM' && a.extension === 'm4a')
                  || audios.find(a => a.audioQuality === 'AUDIO_QUALITY_MEDIUM')
                  || audios[0];

        if (!best?.url) throw 'Audio stream tidak ditemukan';
         const bufferResult = await fetchAudioAsBuffer(best.url);
        
        if (!bufferResult.success) throw bufferResult.error;

        console.log('Audio stream found:', best.url);
        let caption = '';
        caption += `∘ Title : ${res.data.title || convert.title}\n`;
        caption += `∘ Ext : Search\n`;
        caption += `∘ ID : ${convert.videoId}\n`;
        caption += `∘ Duration : ${convert.timestamp}\n`;
        caption += `∘ Viewers : ${convert.views}\n`;
        caption += `∘ Upload At : ${convert.ago}\n`;
        caption += `∘ Author : ${res.data.author || convert.author.name}\n`;
        caption += `∘ Channel : ${convert.author.url}\n`;
        caption += `∘ Url : ${convert.url}\n`;
        caption += `∘ Description : ${convert.description}\n`;
        caption += `∘ Thumbnail : ${res.data.thumbnail || convert.image}`;

        await conn.relayMessage(m.chat, {
            extendedTextMessage: {
                text: caption,
                contextInfo: {
                    externalAdReply: {
                        title: res.data.title || convert.title,
                        mediaType: 1,
                        previewType: 0,
                        renderLargerThumbnail: true,
                        thumbnailUrl: res.data.thumbnail || convert.image,
                        sourceUrl: convert.url
                    }
                },
                mentions: [m.sender]
            }
        }, {});

        await conn.sendMessage(m.chat, {
            audio: bufferResult.buffer,
            mimetype: 'audio/mpeg',
            fileName: res.data.title || convert.title
        }, { quoted: m });

    } catch (e) {
        console.error('Error in YouTube Play handler:', e);
    }
};

handler.command = handler.help = ['play', 'song', 'xm'];
handler.tags = ['downloader'];
handler.exp = 0;
handler.limit = true;
handler.premium = false;

export default handler;


async function fetchAudioAsBuffer(audioUrl) {
  try {
    const isGooglevideo = audioUrl.includes('googlevideo.com');

    const response = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 90000,
      maxContentLength: 150 * 1024 * 1024, // max 150MB
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
        // Header khusus biar googlevideo ga reject
        ...(isGooglevideo && {
          'Referer': 'https://www.youtube.com/',
          'Origin': 'https://www.youtube.com',
          'Range': 'bytes=0-'
        })
      }
    });

    return {
      success: true,
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'] || 'audio/mpeg'
    };
  } catch (e) {
    console.error('[YTA] fetchAudioAsBuffer error:', e.message);
    return { success: false, error: e.message };
  }
}