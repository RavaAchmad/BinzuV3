import ytdl from '@distube/ytdl-core';
import yts from 'yt-search';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fluent from 'fluent-ffmpeg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COOKIES_PATH = path.join(__dirname, '../cookies.txt');
const AUDIO_DIR = path.join(__dirname, '../media/audio');
const VIDEO_DIR = path.join(__dirname, '../media/video');

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

/**
 * Parse cookies dari cookies.txt (format Netscape) ke format baru
 */
function parseCookies() {
  try {
    if (!fs.existsSync(COOKIES_PATH)) return [];
    
    const content = fs.readFileSync(COOKIES_PATH, 'utf-8');
    const cookies = [];
    
    content.split('\n').forEach(line => {
      // Skip comments dan empty lines
      if (!line || line.startsWith('#') || line.startsWith('//')) return;
      
      const parts = line.trim().split('\t');
      if (parts.length >= 7) {
        cookies.push({
          name: parts[5],
          value: parts[6],
          domain: parts[0],
          path: parts[2],
          secure: parts[3] === 'TRUE',
          httpOnly: parts[4] === 'TRUE',
          expires: parseInt(parts[1]) || undefined
        });
      }
    });
    
    console.log(`[YTDL] Loaded ${cookies.length} cookies from cookies.txt`);
    return cookies;
  } catch (e) {
    console.warn('[YTDL] Cookie parse error:', e.message);
    return [];
  }
}

// Parse cookies on startup
const COOKIES = parseCookies();

/**
 * Get request options dengan cookies
 */
function getRequestOptions() {
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  };
  
  // Tambahkan cookies sebagai header jika ada
  if (COOKIES.length > 0) {
    const cookieString = COOKIES.map(c => `${c.name}=${c.value}`).join('; ');
    options.headers['Cookie'] = cookieString;
  }
  
  return options;
}

/**
 * Get video dari URL atau search query
 */
async function getVideoUrl(query) {
  const isUrl = /http(s)?:\/\/.*(youtube\.com|youtu\.be)/.test(query);
  let videoUrl, title, videoId, duration;

  if (isUrl) {
    try {
      const u = new URL(query);
      videoId = u.searchParams.get('v') || u.pathname.split('/').pop();
      videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    } catch {
      videoUrl = query;
    }
  } else {
    const result = await yts(query);
    const video = result.videos[0];
    if (!video) throw 'Video tidak ditemukan';
    if (video.seconds >= 3600) throw 'Video lebih dari 1 jam!';
    
    videoUrl = video.url;
    videoId = video.videoId;
    title = video.title;
    duration = video.seconds;
  }

  // Get metadata jika belum ada
  if (!title) {
    try {
      const info = await ytdl.getInfo(videoUrl, { requestOptions: getRequestOptions() });
      title = info.videoDetails.title;
      duration = parseInt(info.videoDetails.lengthSeconds);
      videoId = info.videoDetails.videoId;
    } catch (e) {
      console.warn('[YTDL] Info error:', e.message);
      title = query;
    }
  }

  if (duration && duration >= 3600) throw 'Video lebih dari 1 jam!';

  return { videoUrl, title, videoId, duration };
}

/**
 * Download audio (MP3)
 */
async function getAudioFile(query, bitrate = '128') {
  try {
    console.log('[YTDL-AUDIO] Query:', query);
    const { videoUrl, title, videoId, duration } = await getVideoUrl(query);

    console.log('[YTDL-AUDIO] Metadata:', { title, videoId, duration });

    const fileBase = path.join(AUDIO_DIR, `audio_${videoId}_${Date.now()}`);
    
    // Get stream audio terbaik dengan headers
    const info = await ytdl.getInfo(videoUrl, { requestOptions: getRequestOptions() });
    const audioFormats = ytdl.filterFormats(info.formats, { quality: 'highestaudio' });
    
    if (!audioFormats || audioFormats.length === 0) {
      throw 'Format audio tidak ditemukan';
    }

    const format = audioFormats[0];
    console.log('[YTDL-AUDIO] Format:', format.mimeType);

    const stream = ytdl(videoUrl, { 
      quality: 'highestaudio',
      requestOptions: getRequestOptions()
    });
    const outputPath = fileBase + '.mp3';

    return new Promise((resolve, reject) => {
      fluent(stream)
        .audio()
        .audioBitrate(parseInt(bitrate))
        .format('mp3')
        .on('error', (err) => {
          console.error('[YTDL-AUDIO] Conversion error:', err);
          reject(err);
        })
        .on('end', () => {
          console.log('[YTDL-AUDIO] Saved:', path.basename(outputPath));
          resolve({ filePath: outputPath, title, videoId, duration });
        })
        .save(outputPath);
    });
  } catch (e) {
    console.error('[YTDL-AUDIO] Error:', e.message);
    throw e;
  }
}

/**
 * Download video (MP4)
 */
async function getVideoFile(query, quality = '720') {
  try {
    console.log('[YTDL-VIDEO] Query:', query);
    const { videoUrl, title, videoId, duration } = await getVideoUrl(query);

    console.log('[YTDL-VIDEO] Metadata:', { title, videoId, duration });

    const fileBase = path.join(VIDEO_DIR, `video_${videoId}_${Date.now()}`);
    
    // Download with highest quality available for the specified resolution
    const stream = ytdl(videoUrl, {
      quality: 'highest',
      filter: (format) => {
        // Try to get video matching the quality preference
        if (format.container === 'mp4' && quality === '720') {
          return parseInt(format.height) === 720;
        } else if (format.container === 'mp4' && quality === '360') {
          return parseInt(format.height) === 360;
        }
        // Fallback to highest mp4 video
        return format.container === 'mp4' && format.hasVideo;
      },
      requestOptions: getRequestOptions()
    });

    const outputPath = fileBase + '.mp4';

    return new Promise((resolve, reject) => {
      fluent(stream)
        .format('mp4')
        .on('error', (err) => {
          console.error('[YTDL-VIDEO] Conversion error:', err);
          reject(err);
        })
        .on('end', () => {
          console.log('[YTDL-VIDEO] Saved:', path.basename(outputPath));
          resolve({ filePath: outputPath, title, videoId, duration });
        })
        .save(outputPath);
    });
  } catch (e) {
    console.error('[YTDL-VIDEO] Error:', e.message);
    throw e;
  }
}

/**
 * Get metadata video
 */
async function getVideoInfo(query) {
  try {
    const { videoUrl, title, videoId, duration } = await getVideoUrl(query);
    
    const info = await ytdl.getInfo(videoUrl, { requestOptions: getRequestOptions() });
    const videoDetails = info.videoDetails;

    return {
      title: videoDetails.title,
      videoId: videoDetails.videoId,
      duration: parseInt(videoDetails.lengthSeconds),
      author: videoDetails.author.name,
      channelUrl: videoDetails.author.channel_url,
      description: videoDetails.description,
      thumbnail: videoDetails.thumbnail.thumbnails.pop().url,
      views: videoDetails.viewCount,
      isLiveContent: videoDetails.isLiveContent,
      isUpcomingLive: videoDetails.isUpcomingLive,
      url: videoUrl
    };
  } catch (e) {
    console.error('[YTDL-INFO] Error:', e.message);
    throw e;
  }
}

/**
 * Cleanup file
 */
function cleanup(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[YTDL] Deleted: ${path.basename(filePath)}`);
    }
  } catch (e) {
    console.error('[YTDL] Cleanup error:', e.message);
  }
}

export default {
  getAudioFile,
  getVideoFile,
  getVideoInfo,
  cleanup
};
