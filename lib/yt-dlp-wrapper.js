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
const AUDIO_DIR = path.join(__dirname, '../tmp'); // Ubah ke tmp folder untuk auto cleanup

const MEDIA_EXTS = ['.mp3', '.mp4', '.webm', '.m4a', '.opus', '.ogg', '.wav', '.mkv', '.mov', '.avi'];
const MAX_AGE_MS = 10 * 60 * 1000; // 10 menit

// semua folder yang mungkin jadi tempat yt-dlp kabur
const SCAN_DIRS = [
  AUDIO_DIR,
  path.join(__dirname, '../tmp/audio'),
  '/tmp',
  process.cwd(),
  __dirname,
  path.join(__dirname, '..'),
];

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

const ytdlp = new YtDlp({
  binaryPath: fs.existsSync(BINARY_PATH) ? BINARY_PATH : undefined,
});

function getCookieArgs() {
  return fs.existsSync(COOKIES_PATH) ? ['--cookies', COOKIES_PATH] : [];
}

const BASE_ARGS = [
  '--no-playlist', '--geo-bypass', '--quiet',
  '--skip-unavailable-fragments',
  '--extractor-args', 'youtube:player_client=web,mweb',
];

const META_ARGS = [
  '--dump-single-json', '--no-playlist', '--geo-bypass', '--quiet',
  '--skip-unavailable-fragments',
  '--extractor-args', 'youtube:player_client=web,mweb',
];

// ============================================================
// SCAN: jemput file ke manapun yt-dlp kabur
// ============================================================
function findNewestFile(prefix) {
  const candidates = [];
  for (const dir of SCAN_DIRS) {
    if (!fs.existsSync(dir)) continue;
    try {
      fs.readdirSync(dir)
        .filter(f => f.startsWith(prefix) && MEDIA_EXTS.includes(path.extname(f).toLowerCase()))
        .forEach(f => {
          const full = path.join(dir, f);
          try { candidates.push({ full, t: fs.statSync(full).mtimeMs }); } catch {}
        });
    } catch {}
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.t - a.t);
  return candidates[0].full;
}

// ============================================================
// CLEANUP: hapus file spesifik + sweep semua scan dirs
// ============================================================
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

  // sweep semua scan dirs dari file lama / file milik bot
  const now = Date.now();
  for (const dir of SCAN_DIRS) {
    if (!fs.existsSync(dir)) continue;
    let files;
    try { files = fs.readdirSync(dir); } catch { continue; }
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (!MEDIA_EXTS.includes(ext)) continue;
      const fullPath = path.join(dir, f);
      try {
        const stat = fs.statSync(fullPath);
        const isOurs = f.startsWith('track_') || f.startsWith('video_');
        const isTooOld = (now - stat.mtimeMs) > MAX_AGE_MS;
        if (isOurs || isTooOld) {
          fs.unlinkSync(fullPath);
          console.log(`[YTDLP] auto-sweep: ${fullPath}`);
        }
      } catch {}
    }
  }
}

// ============================================================
// HELPERS
// ============================================================
async function resolveUrl(query) {
  const isUrl = /^https?:\/\//i.test(query);
  if (isUrl) {
    try {
      const u = new URL(query);
      const videoId = u.searchParams.get('v') || u.pathname.split('/').pop();
      const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log(`[YTDLP] URL detected, extracted videoId: ${videoId}`);
      return standardUrl;
    } catch (e) {
      console.warn('[YTDLP] URL parse failed, fallback to search:', e.message);
      // Fallback ke search jika parsing gagal
    }
  }
  
  // Jika bukan URL atau parsing URL gagal, search dengan yt-search
  console.log(`[YTDLP] Searching: ${query}`);
  const result = await ytSearch(query);
  const video = result.videos?.[0];
  if (!video) throw new Error('Video tidak ditemukan');
  if (video.seconds >= 3600) throw new Error('Video lebih dari 1 jam!');
  
  const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  console.log(`[YTDLP] Found video: ${video.title} (${video.videoId})`);
  return videoUrl;
}

function getMetadata(videoUrl) {
  try {
    console.log(`[YTDLP] Fetching metadata for: ${videoUrl}`);
    const raw = execFileSync(BINARY_PATH, [
      videoUrl,
      ...META_ARGS,
      ...getCookieArgs(),
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const metadata = JSON.parse(raw);
    console.log(`[YTDLP] Metadata retrieved: ${metadata.title}`);
    return metadata;
  } catch (e) {
    console.error('[YTDLP] metadata error:', e.message);
    return null;
  }
}

// ============================================================
// WRAPPER
// ============================================================
const wrapper = {

  getAudioFile: async (query, _bitrate = '128') => {
    const videoUrl = await resolveUrl(query);
    const ts = Date.now();
    const prefix = `track_${ts}`;

    console.log(`[YTDLP-AUDIO] downloading: ${videoUrl}`);

    // Get duration dari yt-search untuk validation tanpa metadata
    let title = query;
    try {
      const isUrl = /^https?:\/\//i.test(query);
      const searchQuery = isUrl ? query : query;
      const searchResult = await ytSearch(searchQuery);
      const video = searchResult.videos?.[0];
      if (video) {
        title = video.title;
        if (video.seconds >= 3600) throw new Error('Video lebih dari 1 jam!');
        console.log(`[YTDLP-AUDIO] Duration check passed: ${Math.floor(video.seconds / 60)}m`);
      }
    } catch (durError) {
      if (durError.message.includes('lebih dari 1 jam')) throw durError;
      console.warn(`[YTDLP-AUDIO] Duration validation skipped: ${durError.message}`);
    }

    await ytdlp.execAsync([
      videoUrl,
      '-f', 'bestaudio[ext=m4a]/bestaudio/best',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', path.join(AUDIO_DIR, `${prefix}.%(ext)s`),
      ...BASE_ARGS,
      ...getCookieArgs(),
    ]);

    // jemput file dimanapun dia berada
    const filePath = findNewestFile(prefix);
    if (!filePath) throw new Error('File hasil download tidak ditemukan');

    console.log(`[YTDLP-AUDIO] found at: ${filePath}`);
    return { filePath, title };
  },

  getVideoInfo: async (query) => {
    try {
      const videoUrl = await resolveUrl(query);
      const info = getMetadata(videoUrl);
      if (!info) {
        // Fallback: jika getMetadata gagal, retry search dengan yt-search langsung
        console.warn('[YTDLP] Metadata fetch failed, trying yt-search fallback');
        const searchResult = await ytSearch(query);
        const video = searchResult.videos?.[0];
        if (!video) throw new Error('Video tidak ditemukan');
        
        return {
          title: video.title,
          videoId: video.videoId,
          duration: video.seconds || 0,
          author: video.author?.name || 'Unknown',
          description: video.description || '',
          thumbnail: video.thumbnail || '',
          views: video.views || 0,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
        };
      }
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
    } catch (error) {
      console.error('[YTDLP] getVideoInfo error:', error.message);
      throw new Error(`Gagal ambil info video: ${error.message}`);
    }
  },

  getVideoFile: async (query, quality = '720') => {
    const videoUrl = await resolveUrl(query);
    const ts = Date.now();
    const prefix = `video_${ts}`;

    // Get duration dari yt-search untuk validation tanpa metadata
    let title = query;
    try {
      const isUrl = /^https?:\/\//i.test(query);
      const searchQuery = isUrl ? query : query;
      const searchResult = await ytSearch(searchQuery);
      const video = searchResult.videos?.[0];
      if (video) {
        title = video.title;
        if (video.seconds >= 3600) throw new Error('Video lebih dari 1 jam!');
        console.log(`[YTDLP-VIDEO] Duration check passed: ${Math.floor(video.seconds / 60)}m`);
      }
    } catch (durError) {
      if (durError.message.includes('lebih dari 1 jam')) throw durError;
      console.warn(`[YTDLP-VIDEO] Duration validation skipped: ${durError.message}`);
    }

    console.log(`[YTDLP-VIDEO] downloading: ${title} @${quality}p`);

    await ytdlp.execAsync([
      videoUrl,
      '-f', `best[height<=${quality}]/best`,
      '--merge-output-format', 'mp4',
      '-o', path.join(AUDIO_DIR, `${prefix}.%(ext)s`),
      ...BASE_ARGS,
      ...getCookieArgs(),
    ]);

    // jemput file dimanapun dia berada
    const filePath = findNewestFile(prefix);
    if (!filePath) throw new Error('File hasil download tidak ditemukan');

    console.log(`[YTDLP-VIDEO] found at: ${filePath}`);
    return { filePath, title, quality };
  },

  cleanup,
};

export default wrapper;
export { wrapper };