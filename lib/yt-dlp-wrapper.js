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

const ytdlp = new YtDlp({
  binaryPath: fs.existsSync(BINARY_PATH) ? BINARY_PATH : undefined,
});

function getCookieArgs() {
  return fs.existsSync(COOKIES_PATH) ? ['--cookies', COOKIES_PATH] : [];
}

const BASE_ARGS = ['--no-playlist', '--geo-bypass', '--quiet'];

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

async function getMetadata(videoUrl) {
  try {
    const raw = await ytdlp.execAsync([
      videoUrl,
      '--dump-single-json',
      ...BASE_ARGS,
      ...getCookieArgs(),
    ]);
    if (typeof raw === 'object' && raw !== null) return raw;
    if (typeof raw === 'string') return JSON.parse(raw);
    return null;
  } catch (e) {
    console.warn('[YTDLP] metadata warn:', e.message);
    return null;
  }
}

const wrapper = {
  getAudioFile: async (query, _bitrate = '128') => {
    const videoUrl = await resolveUrl(query);
    const fileBase = path.join(AUDIO_DIR, `track_${Date.now()}`);

    console.log(`[YTDLP-AUDIO] downloading: ${videoUrl}`);

    // cek durasi dulu sebelum download
    const info = await getMetadata(videoUrl);
    const title = info?.title || query;
    if ((info?.duration || 0) >= 3600) throw 'Video lebih dari 1 jam!';

    await ytdlp.execAsync([
      videoUrl,
      '-f', 'bestaudio/best',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', fileBase,
      ...BASE_ARGS,
      ...getCookieArgs(),
    ]);

    let filePath = null;
    for (const ext of ['.mp3', '.webm', '.m4a', '.opus', '.ogg', '.wav']) {
      const candidate = fileBase + ext;
      if (fs.existsSync(candidate)) { filePath = candidate; break; }
    }
    if (!filePath) throw 'File hasil download tidak ditemukan';

    console.log(`[YTDLP-AUDIO] saved: ${path.basename(filePath)}`);
    return { filePath, title };
  },

  getVideoInfo: async (query) => {
    const videoUrl = await resolveUrl(query);
    const info = await getMetadata(videoUrl);
    if (!info) throw 'Gagal ambil info video';
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
    const fileBase = path.join(AUDIO_DIR, `video_${Date.now()}`);

    const info = await getMetadata(videoUrl);
    const title = info?.title || query;

    console.log(`[YTDLP-VIDEO] downloading: ${title} @${quality}p`);

    await ytdlp.execAsync([
      videoUrl,
      '-f', `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`,
      '--merge-output-format', 'mp4',
      '-o', fileBase,
      ...BASE_ARGS,
      ...getCookieArgs(),
    ]);

    let filePath = null;
    for (const ext of ['.mp4', '.mkv', '.webm', '.mov']) {
      const candidate = fileBase + ext;
      if (fs.existsSync(candidate)) { filePath = candidate; break; }
    }
    if (!filePath) throw 'File hasil download tidak ditemukan';

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