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
const AUDIO_DIR = path.join(__dirname, '../tmp');

const MEDIA_EXTS = ['.mp3', '.mp4', '.webm', '.m4a', '.opus', '.ogg', '.wav', '.mkv', '.mov', '.avi'];

const ytdlp = new YtDlp({
  binaryPath: fs.existsSync(BINARY_PATH) ? BINARY_PATH : undefined,
});

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

function getCookieArgs() {
  return fs.existsSync(COOKIES_PATH) ? ['--cookies', COOKIES_PATH] : [];
}

const META_ARGS = [
  '--dump-single-json', '--no-playlist', '--geo-bypass', '--quiet',
  '--skip-unavailable-fragments',
  '--extractor-args', 'youtube:player_client=web,mweb',
];

const FORMAT_ARGS = [
  '--dump-json', '--no-playlist', '--geo-bypass', '--quiet',
  '--skip-unavailable-fragments',
  '--extractor-args', 'youtube:player_client=web,mweb',
];

const DOWNLOAD_ARGS = [
  '--no-playlist', '--geo-bypass', '--quiet',
  '--skip-unavailable-fragments',
  '--extractor-args', 'youtube:player_client=web,mweb',
];

// Find newest media file dengan prefix tertentu
function findNewestFile(prefix) {
  const candidates = [];
  const dirs = [AUDIO_DIR, process.cwd()];
  
  for (const dir of dirs) {
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

// Cleanup file
function cleanup(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`[YTDLP] deleted: ${path.basename(filePath)}`);
    } catch (e) {
      console.error('[YTDLP] cleanup error:', e.message);
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

function getFormatInfo(videoUrl) {
  try {
    console.log(`[YTDLP] Fetching format info for: ${videoUrl}`);
    const raw = execFileSync(BINARY_PATH, [
      videoUrl,
      ...FORMAT_ARGS,
      ...getCookieArgs(),
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const info = JSON.parse(raw);
    console.log(`[YTDLP] Format info retrieved for: ${info.title}`);
    return info;
  } catch (e) {
    console.error('[YTDLP] format info error:', e.message);
    return null;
  }
}

// ============================================================
// WRAPPER - SIMPLE RETURN DATA FOR PLUGINS  
// ============================================================
const wrapper = {

  /**
   * Get video metadata
   */
  getVideoInfo: async (query) => {
    try {
      const videoUrl = await resolveUrl(query);
      const info = getMetadata(videoUrl);
      
      if (!info) {
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
      throw error;
    }
  },

  /**
   * Get audio stream data
   */
  getAudioData: async (query) => {
    try {
      const videoUrl = await resolveUrl(query);
      const formatInfo = getFormatInfo(videoUrl);
      
      if (!formatInfo) throw new Error('Gagal ambil format info');
      
      if (formatInfo.duration >= 3600) throw new Error('Video lebih dari 1 jam!');
      
      let bestAudio = null;
      if (formatInfo.formats) {
        const audioFormats = formatInfo.formats.filter(f => 
          f.vcodec === 'none' && (f.ext === 'm4a' || f.ext === 'mp3' || f.ext === 'opus')
        ).sort((a, b) => (b.abr || 0) - (a.abr || 0));
        bestAudio = audioFormats[0];
      }
      
      console.log(`[YTDLP] Best audio: ${bestAudio?.format || 'default'}`);
      
      return {
        title: formatInfo.title,
        videoId: formatInfo.id,
        url: videoUrl,
        duration: formatInfo.duration || 0,
        filesize: bestAudio?.filesize || formatInfo.filesize || 0,
        audioCodec: bestAudio?.acodec || 'unknown',
        bitrate: bestAudio?.abr || 128,
        container: bestAudio?.ext || 'mp3',
      };
    } catch (error) {
      console.error('[YTDLP] getAudioData error:', error.message);
      throw error;
    }
  },

  /**
   * Get video stream data
   */
  getVideoData: async (query, quality = '720') => {
    try {
      const videoUrl = await resolveUrl(query);
      const formatInfo = getFormatInfo(videoUrl);
      
      if (!formatInfo) throw new Error('Gagal ambil format info');
      
      if (formatInfo.duration >= 3600) throw new Error('Video lebih dari 1 jam!');
      
      let bestVideo = null;
      if (formatInfo.formats) {
        const videoFormats = formatInfo.formats.filter(f => 
          f.vcodec !== 'none' && (f.ext === 'mp4' || f.ext === 'mkv' || f.ext === 'webm')
        ).filter(f => !f.height || f.height <= parseInt(quality))
         .sort((a, b) => (b.height || 0) - (a.height || 0));
        bestVideo = videoFormats[0];
      }
      
      console.log(`[YTDLP] Best video: ${bestVideo?.format || 'default'} @${bestVideo?.height || quality}p`);
      
      return {
        title: formatInfo.title,
        videoId: formatInfo.id,
        url: videoUrl,
        duration: formatInfo.duration || 0,
        filesize: bestVideo?.filesize || formatInfo.filesize || 0,
        videoCodec: bestVideo?.vcodec || 'unknown',
        resolution: bestVideo?.height ? `${bestVideo.height}p` : `${quality}p`,
        container: bestVideo?.ext || 'mp4',
      };
    } catch (error) {
      console.error('[YTDLP] getVideoData error:', error.message);
      throw error;
    }
  },

  /**
   * Download audio file ke tmp dan return filePath (untuk plugin compatibility)
   */
  getAudioFile: async (query, _bitrate = '128') => {
    const videoUrl = await resolveUrl(query);
    const ts = Date.now();
    const prefix = `track_${ts}`;

    console.log(`[YTDLP-AUDIO] downloading: ${videoUrl}`);

    // Validasi durasi dari yt-search
    let title = query;
    try {
      const searchResult = await ytSearch(query);
      const video = searchResult.videos?.[0];
      if (video) {
        title = video.title;
        if (video.seconds >= 3600) throw new Error('Video lebih dari 1 jam!');
        console.log(`[YTDLP-AUDIO] Duration check: ${Math.floor(video.seconds / 60)}m`);
      }
    } catch (durError) {
      if (durError.message.includes('lebih dari 1 jam')) throw durError;
      console.warn(`[YTDLP-AUDIO] Duration validation skipped`);
    }

    await ytdlp.execAsync([
      videoUrl,
      '-f', 'bestaudio[ext=m4a]/bestaudio/best',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', path.join(AUDIO_DIR, `${prefix}.%(ext)s`),
      ...DOWNLOAD_ARGS,
      ...getCookieArgs(),
    ]);

    const filePath = findNewestFile(prefix);
    if (!filePath) throw new Error('File hasil download tidak ditemukan');

    console.log(`[YTDLP-AUDIO] found at: ${filePath}`);
    return { filePath, title };
  },

  /**
   * Download video file ke tmp dan return filePath (untuk plugin compatibility)
   */
  getVideoFile: async (query, quality = '720') => {
    const videoUrl = await resolveUrl(query);
    const ts = Date.now();
    const prefix = `video_${ts}`;

    // Validasi durasi dari yt-search
    let title = query;
    try {
      const searchResult = await ytSearch(query);
      const video = searchResult.videos?.[0];
      if (video) {
        title = video.title;
        if (video.seconds >= 3600) throw new Error('Video lebih dari 1 jam!');
        console.log(`[YTDLP-VIDEO] Duration check: ${Math.floor(video.seconds / 60)}m`);
      }
    } catch (durError) {
      if (durError.message.includes('lebih dari 1 jam')) throw durError;
      console.warn(`[YTDLP-VIDEO] Duration validation skipped`);
    }

    console.log(`[YTDLP-VIDEO] downloading: ${title} @${quality}p`);

    await ytdlp.execAsync([
      videoUrl,
      '-f', `best[height<=${quality}]/best`,
      '--merge-output-format', 'mp4',
      '-o', path.join(AUDIO_DIR, `${prefix}.%(ext)s`),
      ...DOWNLOAD_ARGS,
      ...getCookieArgs(),
    ]);

    const filePath = findNewestFile(prefix);
    if (!filePath) throw new Error('File hasil download tidak ditemukan');

    console.log(`[YTDLP-VIDEO] found at: ${filePath}`);
    return { filePath, title, quality };
  },

  cleanup,
};

export default wrapper;
export { wrapper };