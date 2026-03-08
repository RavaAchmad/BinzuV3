import { YtDlp } from 'ytdlp-nodejs';
import ytSearch from 'yt-search';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BINARY_PATH = path.join(__dirname, '../bin/yt-dlp');
const COOKIES_PATH = path.join(__dirname, '../cookies.txt');
const AUDIO_DIR = path.join(__dirname, '../audio');

// semua folder yang mungkin jadi tempat yt-dlp naruh file
const SCAN_DIRS = [
  AUDIO_DIR,
  '/tmp',
  process.cwd(),
  __dirname,
];

const MEDIA_EXTS = ['.mp3', '.mp4', '.webm', '.m4a', '.opus', '.ogg', '.wav', '.mkv', '.mov', '.avi'];
const MAX_AGE_MS = 10 * 60 * 1000; // 10 menit

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

const ytdlp = new YtDlp({
  binaryPath: fs.existsSync(BINARY_PATH) ? BINARY_PATH : undefined,
});

function getCookieArgs() {
  return fs.existsSync(COOKIES_PATH) ? ['--cookies', COOKIES_PATH] : [];
}

const BASE_ARGS = [
  '--no-playlist', '--geo-bypass', '--quiet',
  '--extractor-args', 'youtube:player_client=tv_embedded,web',
];

const META_ARGS = [
  '--dump-single-json', '--no-playlist', '--geo-bypass', '--quiet',
  '--extractor-args', 'youtube:player_client=tv_embedded,web',
];

// hapus file spesifik + semua file sisa di scan dirs yang udah tua
function cleanup(filePath) {
  // hapus file yang dikasih
  if (filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[YTDLP] deleted: ${path.basename(filePath)}`);
      }
    } catch (e) {
      console.error('[YTDLP] cleanup error:', e.message);
    }
  }

  // scan semua folder, hapus file media yang udah lebih dari MAX_AGE_MS
  const now = Date.now();
  for (const dir of SCAN_DIRS) {
    if (!fs.existsSync(dir)) continue;
    let files;
    try { files = fs.readdirSync(dir); } catch { continue; }

    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (!MEDIA_EXTS.includes(ext)) continue;

      // cuma hapus file yang namanya dari bot kita (track_ / video_) atau udah tua banget
      const fullPath = path.join(dir, f);
      try {
        const stat = fs.statSync(fullPath);
        const isOurs = f.startsWith('track_') || f.startsWith('video_');
        const isTooOld = (now - stat.mtimeMs) > MAX_AGE_MS;

        if (isOurs || isTooOld) {
          fs.unlinkSync(fullPath);
          console.log(`[YTDLP] auto-cleanup: ${fullPath}`);
        }
      } catch { /* skip kalau gagal */ }
    }
  }
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
  if (!video) throw new Error('Video tidak ditemukan');
  if (video.seconds >= 3600) throw new Error('Video lebih dari 1 jam!');
  return `https://www.youtube.com/watch?v=${video.videoId}`;
}

function getMetadata(videoUrl) {
  try {
    const raw = execFileSync(BINARY_PATH, [
      videoUrl,
      ...META_ARGS,
      ...getCookieArgs(),
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(raw);
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

    const info = getMetadata(videoUrl);
    const title = info?.title || query;
    if ((info?.duration || 0) >= 3600) throw new Error('Video lebih dari 1 jam!');

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
    if (!filePath) throw new Error('File hasil download tidak ditemukan');

    console.log(`[YTDLP-AUDIO] saved: ${path.basename(filePath)}`);
    return { filePath, title };
  },

  getVideoInfo: async (query) => {
    const videoUrl = await resolveUrl(query);
    const info = getMetadata(videoUrl);
    if (!info) throw new Error('Gagal ambil info video');
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

    const info = getMetadata(videoUrl);
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
    if (!filePath) throw new Error('File hasil download tidak ditemukan');

    console.log(`[YTDLP-VIDEO] saved: ${path.basename(filePath)}`);
    return { filePath, title, quality };
  },

  cleanup,
};

export default wrapper;
export { wrapper };