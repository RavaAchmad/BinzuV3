import YTDlpWrap from 'yt-dlp-wrap';
import ytSearch from 'yt-search';
import path from 'path';
import fs from 'fs';

// determine binary path, allow windows executable suffix
let BINARY_PATH = path.join(__dirname, '../bin/yt-dlp');
if (process.platform === 'win32' && !BINARY_PATH.endsWith('.exe')) {
  BINARY_PATH += '.exe';
}

// ensure binary exists or warn
if (!fs.existsSync(BINARY_PATH)) {
  console.warn(`[YTDLP] binary not found at ${BINARY_PATH}, please download from https://github.com/foxesdocode/yt-dlp-wrap or npm install yt-dlp-wrap`);
}

const COOKIES_PATH = path.join(__dirname, '../cookies.txt');
const AUDIO_DIR = path.join(__dirname, '../audio');

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

const ytdlp = fs.existsSync(BINARY_PATH)
  ? new YTDlpWrap(BINARY_PATH)
  : new YTDlpWrap(); // let package locate binary in PATH or its cache

function getCookieArgs() {
  return fs.existsSync(COOKIES_PATH) ? ['--cookies', COOKIES_PATH] : [];
}

async function resolveVideo(query) {
  const isUrl = /^https?:\/\//i.test(query);
  let videoUrl;
  let fallbackTitle = query;

  if (isUrl) {
    try {
      const u = new URL(query);
      const videoId = u.searchParams.get('v') || u.pathname.split('/').pop();
      videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    } catch {
      videoUrl = query;
    }
  } else {
    const result = await ytSearch(query);
    const video = result.videos && result.videos[0];
    if (!video) throw 'Video tidak ditemukan';
    if (video.seconds >= 3600) throw 'Video lebih dari 1 jam!';
    videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
    fallbackTitle = video.title;
  }

  // fetch metadata using ytdlp
  let info = {};
  try {
    const meta = await ytdlp.execPromise([
      videoUrl,
      '--dump-single-json',
      '--no-playlist',
      '--quiet',
      ...getCookieArgs(),
    ]);
    info = JSON.parse(meta);
  } catch (e) {
    console.warn('[YTDLP] metadata warn:', e.message);
    info = { title: fallbackTitle, duration: 0 };
  }

  return { videoUrl, info };
}

const wrapper = {
  getAudioFile: async (query, bitrate = '128') => {
    const { videoUrl, info } = await resolveVideo(query);
    let title = info.title || query;
    if ((info.duration || 0) >= 3600) throw 'Video lebih dari 1 jam!';

    const fileBase = path.join(AUDIO_DIR, `track_${Date.now()}`);
    console.log(`[YTDLP-AUDIO] downloading: ${title}`);

    await ytdlp.execPromise([
      videoUrl,
      '-f', 'bestaudio',
      '--no-playlist',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0', // always best
      '-o', fileBase,
      '--quiet',
      ...getCookieArgs(),
    ]);

    // find generated file
    let filePath = null;
    for (const ext of ['.mp3', '.webm', '.m4a', '.opus', '.ogg', '.wav']) {
      const candidate = fileBase + ext;
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    // fallback scanning folder
    if (!filePath) {
      const files = fs.readdirSync(AUDIO_DIR)
        .filter(f => f.startsWith('track_'))
        .map(f => ({ f, t: fs.statSync(path.join(AUDIO_DIR, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
      if (files.length > 0) filePath = path.join(AUDIO_DIR, files[0].f);
    }

    if (!filePath) throw 'File hasil download tidak ditemukan';
    console.log(`[YTDLP-AUDIO] saved: ${path.basename(filePath)}`);
    return { filePath, title };
  },

  getVideoInfo: async (query) => {
    const { videoUrl, info } = await resolveVideo(query);
    // normalize fields
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
    const { videoUrl, info } = await resolveVideo(query);
    let title = info.title || query;

    const fileBase = path.join(AUDIO_DIR, `video_${Date.now()}`);
    console.log(`[YTDLP-VIDEO] downloading: ${title} @${quality}p`);

    await ytdlp.execPromise([
      videoUrl,
      '-f', `bestvideo[height<=${quality}]+bestaudio/best`,
      '--no-playlist',
      '-o', fileBase,
      '--quiet',
      ...getCookieArgs(),
    ]);

    let filePath = null;
    for (const ext of ['.mp4', '.mkv', '.webm', '.mov', '.avi']) {
      const candidate = fileBase + ext;
      if (fs.existsSync(candidate)) { filePath = candidate; break; }
    }

    if (!filePath) {
      const files = fs.readdirSync(AUDIO_DIR)
        .filter(f => f.startsWith('video_'))
        .map(f => ({ f, t: fs.statSync(path.join(AUDIO_DIR, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
      if (files.length > 0) filePath = path.join(AUDIO_DIR, files[0].f);
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
