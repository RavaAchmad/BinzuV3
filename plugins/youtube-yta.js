import fetch from 'node-fetch';
import axios from 'axios';

// ============================================================
// YOUTUBE SCRAPER - YTMP3 & EZCONV
// ============================================================

const ytmp3Download = async (bitrate, format, url) => {
  try {
    const headers = {
      'accept': 'application/json',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'content-type': 'application/json',
      'origin': 'https://ytmp3.gg',
      'priority': 'u=1, i',
      'referer': 'https://ytmp3.gg/',
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36'
    };

    const { data: v } = await axios.post('https://hub.y2mp3.co/', {
      audioBitrate: bitrate,
      audioFormat: format,
      brandName: "ytmp3.gg",
      downloadMode: "audio",
      url: url
    }, { headers });

    return {
      success: true,
      title: v?.filename,
      url: v?.url,
      size: v?.size || null
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

async function downloadYoutubeShort(videoUrl) {
  try {
    const cfApiUrl = 'https://api.nekolabs.web.id/tools/bypass/cf-turnstile';
    const cfPayload = {
      url: 'https://ezconv.cc',
      siteKey: '0x4AAAAAAAi2NuZzwS99-7op'
    };

    const { data: cfResponse } = await axios.post(cfApiUrl, cfPayload);

    if (!cfResponse.success || !cfResponse.result) {
      return { success: false, error: 'Gagal dapat captcha token' };
    }

    const { data: convertResponse } = await axios.post('https://ds1.ezsrv.net/api/convert', {
      url: videoUrl,
      quality: '320',
      trim: false,
      startT: 0,
      endT: 0,
      captchaToken: cfResponse.result
    }, { headers: { 'Content-Type': 'application/json' } });

    if (convertResponse.status !== 'done') {
      return { success: false, error: `Konversi gagal. Status: ${convertResponse.status}` };
    }

    return {
      success: true,
      data: {
        title: convertResponse.title,
        downloadUrl: convertResponse.url,
        status: convertResponse.status
      }
    };
  } catch (error) {
    return { success: false, error: error.response?.data ?? error.message };
  }
}

// ============================================================
// HELPER: Fetch audio as buffer
// Wajib untuk googlevideo.com — URL-nya signed & expire,
// kalau langsung kasih ke baileys via { url: ... } → 403
// Solusi: download dulu ke buffer, baru kirim ke sendMessage
// ============================================================
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

let handler = async (m, { conn, text, usedPrefix, command, args }) => {
  if (!text) throw `*Example:* ${usedPrefix + command} https://www.youtube.com/watch?v=Z28dtg_QmFw [format] [bitrate]\n\n*Format:* mp3 (default), m4a\n*Bitrate:* 128, 192, 320 (default 128)`;

  m.reply(wait);

  try {
    const urlMatch = text.match(/https?:\/\/\S+/);
    const url = urlMatch ? urlMatch[0] : text;
    const format = args[1] || 'mp3';
    const bitrate = args[2] || '128';

    let result;

    // PRIMARY: YTMP3 Scraper
    console.log('[YTA] Trying YTMP3 scraper...');
    const scraperResult = await ytmp3Download(bitrate, format, url);

    if (scraperResult.success && scraperResult.url) {
      console.log('[YTA] YTMP3 scraper success');
      result = {
        status: true,
        result: {
          mp3: scraperResult.url,
          title: scraperResult.title,
          size: scraperResult.size
        }
      };
    } else {
      // SECONDARY: EZCONV Scraper
      console.log('[YTA] Trying EZCONV scraper...');
      const ezconvResult = await downloadYoutubeShort(url);

      if (ezconvResult.success && ezconvResult.data?.downloadUrl) {
        console.log('[YTA] EZCONV scraper success');
        result = {
          status: true,
          result: {
            mp3: ezconvResult.data.downloadUrl,
            title: ezconvResult.data.title
          }
        };
      } else {
        // TERTIARY: Fallback API amira
        console.log('[YTA] Trying fallback API...');
        const response = await fetch(`https://chocomilk.amira.us.kg/v1/download/aio?url=${encodeURIComponent(url)}`);
        const res = await response.json();

        if (!res.success || !res.data?.medias?.length) throw 'Gagal mengambil audio dari API amira';

        const audios = res.data.medias.filter(x => x.type === 'audio');
        const best = audios.find(a => a.audioQuality === 'AUDIO_QUALITY_MEDIUM' && a.extension === 'm4a')
          || audios.find(a => a.audioQuality === 'AUDIO_QUALITY_MEDIUM')
          || audios[0];

        if (!best?.url) throw 'Audio stream tidak ditemukan';

        console.log('[YTA] Fallback API success, URL:', best.url.substring(0, 60) + '...');
        result = {
          status: true,
          result: {
            mp3: best.url,
            title: res.data.title || 'audio.mp3',
            size: best.size || null
          }
        };
      }
    }

    // ============================================================
    // SEND AUDIO
    // FIX #1: Hapus semua kode "jid" yang nyasar — di sini
    //         variabelnya adalah m.chat, bukan jid
    //
    // FIX #2: Kalau URL dari googlevideo.com / videoplayback
    //         (signed URL yang expire) → download ke buffer dulu,
    //         jangan langsung kasih ke baileys via { url: ... }
    //         karena baileys fetch ulang → 403
    // ============================================================
    if (result?.status && result?.result?.mp3) {
      const audioUrl = result.result.mp3;
      const title = result.result.title || 'audio';
      const fileName = title.endsWith('.mp3') || title.endsWith('.m4a') ? title : title + '.mp3';
      const isSignedUrl = audioUrl.includes('googlevideo.com') || audioUrl.includes('videoplayback');

      if (isSignedUrl) {
        // URL signed dari Google → HARUS download buffer dulu
        console.log('[YTA] Signed URL detected, downloading to buffer first...');
        const bufferResult = await fetchAudioAsBuffer(audioUrl);

        if (!bufferResult.success) throw `Gagal download audio: ${bufferResult.error}`;

        console.log('[YTA] Buffer ready, size:', (bufferResult.buffer.length / 1024 / 1024).toFixed(2), 'MB');

        await conn.sendMessage(m.chat, {
          audio: bufferResult.buffer,   // ← Buffer langsung, bukan { url: ... }
          mimetype: 'audio/mpeg',
          fileName: fileName
        }, { quoted: m });

      } else {
        // URL CDN stabil (ytmp3/ezconv) → langsung via URL, lebih cepet
        await conn.sendMessage(m.chat, {
          audio: { url: audioUrl },
          mimetype: 'audio/mpeg',
          fileName: fileName
        }, { quoted: m });
      }

    } else {
      throw 'Gagal mendapatkan audio, semua sumber gagal';
    }

  } catch (error) {
    console.error('[YTA] Handler error:', error);
    throw error;
  }
};

handler.help = handler.command = ['ytmp3', 'yta'];
handler.tags = ['downloader'];
handler.limit = true;

export default handler;