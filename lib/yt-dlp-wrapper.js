import { YtDlp } from 'ytdlp-nodejs';
import ytSearch from 'yt-search';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BINARY_PATH = path.join(__dirname, '../bin/yt-dlp');
const COOKIES_PATH = path.join(__dirname, '../cookies.txt');
const AUDIO_DIR = path.join(__dirname, '../audio');

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

// init ytdlp-nodejs dengan binary yang udah ada
const ytdlp = new YtDlp({
  binaryPath: fs.existsSync(BINARY_PATH) ? BINARY_PATH : undefined,
});

function getCookieArgs() {
  return fs.existsSync(COOKIES_PATH) ? ['--cookies', COOKIES_PATH] : [];
}

async function resolveUrl(query) {
  const isUrl = /^https?:\/\//i.test(query);
  if (isUrl) {
    try {
      const u = new URL(query);
      const videoId = u.searchParams.get('v') || u.pathname.split('/').pop();
      return `https://www.youtube.com/watch?v=${videoId}`;
    } catch {
      return query;
    }
  }

  const result = await ytSearch(query);
  const video = result.videos?.[0];
  if (!video) throw 'Video tidak ditemukan';
  if (video.seconds >= 3600) throw 'Video lebih dari 1 jam!';
  return `https://www.youtube.com/watch?v=${video.videoId}`;
}

const wrapper = {
  getAudioFile: async (query, _bitrate = '128') => {
    const videoUrl = await resolveUrl(query);
    const fileBase = path.join(AUDIO_DIR, `track_${Date.now()}.mp3`);

    console.log(`[YTDLP-AUDIO] downloading: ${videoUrl}`);

    const result = await ytdlp.downloadAsync(videoUrl, {
      format: { filter: 'audioonly', type: 'mp3' },
      output: fileBase,
      extraArgs: getCookieArgs(),
    });

    const filePath = result?.filePaths?.[0] ?? fileBase;

    if (!fs.existsSync(filePath)) throw 'File hasil download tidak ditemukan';

    // ambil title dari metadata
    let title = query;
    try {
      const info = await ytdlp.getInfoAsync(videoUrl);
      title = info.title || query;
      if ((info.duration || 0) >= 3600) {
        fs.unlinkSync(filePath);
        throw 'Video lebih dari 1 jam!';
      }
    } catch (e) {
      if (typeof e === 'string') throw e;
      console.warn('[YTDLP-AUDIO] metadata warn:', e.message);
    }

    console.log(`[YTDLP-AUDIO] saved: ${path.basename(filePath)}`);
    return { filePath, title };
  },

  getVideoInfo: async (query) => {
    const videoUrl = await resolveUrl(query);
    const info = await ytdlp.getInfoAsync(videoUrl);
    return {
      title: info.title,
      videoId: info.id || info.video_id,
      duration: info.duration || 0,
      author: info.uploader || info.channel || '',
      description: info.description || '',
      thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
      views: info.view_count || info.views || 0,
      url: videoUrl,
    };
  },

  getVideoFile: async (query, quality = '720') => {
    const videoUrl = await resolveUrl(query);
    const fileBase = path.join(AUDIO_DIR, `video_${Date.now()}.mp4`);

    console.log(`[YTDLP-VIDEO] downloading: ${videoUrl} @${quality}p`);

    const result = await ytdlp.downloadAsync(videoUrl, {
      format: {
        filter: 'mergevideo',
        quality: `${quality}p`,
        type: 'mp4',
      },
      output: fileBase,
      extraArgs: getCookieArgs(),
    });

    const filePath = result?.filePaths?.[0] ?? fileBase;

    if (!fs.existsSync(filePath)) throw 'File hasil download tidak ditemukan';

    let title = query;
    try {
      const info = await ytdlp.getInfoAsync(videoUrl);
      title = info.title || query;
    } catch (e) {
      console.warn('[YTDLP-VIDEO] metadata warn:', e.message);
    }

    console.log(`[YTDLP-VIDEO] saved: ${path.basename(filePath)}`);
    return { filePath, title, quality };
  },

  cleanup: (filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[YTDLP] deleted: ${path.basename(filePath)}`);
      }
    } catch (e) {
      console.error('[YTDLP] cleanup error:', e.message);
    }
  },
};

export default wrapper;
export { wrapper };