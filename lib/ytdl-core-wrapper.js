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
 * Parse cookies dari cookies.txt (format Netscape)
 */
function parseCookies() {
  try {
    if (!fs.existsSync(COOKIES_PATH)) return {};
    
    const content = fs.readFileSync(COOKIES_PATH, 'utf-8');
    const cookies = {};
    
    content.split('\n').forEach(line => {
      if (line && !line.startsWith('#') && !line.startsWith('//')) {
        const parts = line.trim().split('\t');
        if (parts.length >= 7) {
          cookies[parts[5]] = parts[6];
        }
      }
    });
    
    return cookies;
  } catch (e) {
    console.warn('[YTDL] Cookie parse error:', e.message);
    return {};
  }
}

/**
 * Setup ytdl dengan cookies
 */
function setupYtdl() {
  const cookies = parseCookies();
  if (Object.keys(cookies).length > 0) {
    ytdl.setDefaultHeaders({
      'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
    });
  }
}

setupYtdl();

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
      const info = await ytdl.getInfo(videoUrl);
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
    
    // Get stream audio terbaik
    const info = await ytdl.getInfo(videoUrl);
    const audioFormats = ytdl.filterFormats(info.formats, { quality: 'highestaudio' });
    
    if (!audioFormats || audioFormats.length === 0) {
      throw 'Format audio tidak ditemukan';
    }

    const format = audioFormats[0];
    console.log('[YTDL-AUDIO] Format:', format.mimeType);

    const stream = ytdl(videoUrl, { quality: 'highestaudio' });
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
      }
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
    
    const info = await ytdl.getInfo(videoUrl);
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
      isUpcomingLive: videoDetails.isUpcomingLive
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
