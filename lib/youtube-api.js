import axios from 'axios';
import yts from 'yt-search';

/**
 * Search YouTube videos
 * @param {string} query - Search query
 * @param {number} limit - Number of results (default: 10)
 * @returns {Promise<Array>} Array of video results
 */
export async function searchYouTube(query, limit = 10) {
  try {
    const result = await yts(query);
    if (!result?.videos?.length) {
      throw new Error('Video tidak ditemukan');
    }
    
    const limitedVideos = result.videos.slice(0, limit);
    console.log(`[YT-API] Found ${limitedVideos.length} videos for query: ${query}`);
    
    return limitedVideos;
  } catch (error) {
    console.error('[YT-API] Search error:', error.message);
    throw error;
  }
}

/**
 * Download audio or video from YouTube via external API
 * @param {string} videoUrl - YouTube video URL
 * @param {string} type - 'audio' or 'video'
 * @returns {Promise<Object>} { status, downloadUrl, title, duration, views, fileSize }
 */
export async function downloadFromYouTube(videoUrl, type = 'audio') {
  try {
    if (!videoUrl) {
      throw new Error('URL tidak valid');
    }

    if (!['audio', 'video'].includes(type)) {
      throw new Error('Tipe harus "audio" atau "video"');
    }

    console.log(`[YT-API] Downloading ${type} from: ${videoUrl}`);

    // Call Sawit API
    const apiUrl = 'https://api.sawit.biz.id/api/downloader/youtube';
    const { data } = await axios.get(apiUrl, {
      params: {
        url: videoUrl,
        type: type
      },
      timeout: 30000
    });

    // Validate API response
    if (!data || !data.status || !data.result) {
      throw new Error(data?.message || 'API response invalid');
    }

    const result = data.result;
    const downloadUrl = result.download_url;

    if (!downloadUrl) {
      throw new Error('Download URL tidak didapat dari API');
    }

    console.log(`[YT-API] Download ready: ${result.title}`);

    return {
      status: true,
      downloadUrl,
      title: result.title || 'Unknown',
      duration: result.duration || 'Unknown',
      views: result.views || 'N/A',
      fileSize: result.file_info?.size || 'Unknown',
      type: type
    };
  } catch (error) {
    console.error('[YT-API] Download error:', error.message);
    
    // Provide user-friendly error messages
    let userMessage = error.message;
    if (error.message.includes('timeout')) {
      userMessage = 'API timeout - coba lagi dalam beberapa saat';
    } else if (error.message.includes('404')) {
      userMessage = 'Video tidak ditemukan atau sudah dihapus';
    } else if (error.message.includes('403')) {
      userMessage = 'Video tidak bisa diakses (mungkin private atau regional block)';
    }
    
    throw new Error(userMessage);
  }
}

/**
 * Format file size to human readable format
 * @param {string|number} bytes - File size
 * @returns {string} Formatted size (KB, MB, GB)
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === '0') return '0 B';
  
  // If it's already a string like "123 MB"
  if (typeof bytes === 'string' && /[KMGT]B/.test(bytes)) {
    return bytes;
  }
  
  const b = parseInt(bytes) || 0;
  if (b === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration to HH:MM:SS format
 * @param {string|number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  // If already in HH:MM:SS format
  if (typeof seconds === 'string' && /^\d+:\d+/.test(seconds)) {
    return seconds;
  }
  
  const sec = parseInt(seconds) || 0;
  if (sec === 0) return '00:00';
  
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Validate video duration (reject if > 1 hour)
 * @param {string|number} duration - Duration in seconds or HH:MM:SS format
 * @returns {boolean} True if valid (< 1 hour), false otherwise
 */
export function isValidDuration(duration) {
  let seconds = 0;
  
  if (typeof duration === 'string') {
    // Parse HH:MM:SS format
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else {
      seconds = parseInt(duration) || 0;
    }
  } else {
    seconds = parseInt(duration) || 0;
  }
  
  // 3600 seconds = 1 hour
  return seconds < 3600;
}

export default {
  searchYouTube,
  downloadFromYouTube,
  formatFileSize,
  formatDuration,
  isValidDuration
};
