// Menggunakan ESM (ECMAScript Modules) untuk import
import axios from 'axios';
import { unlinkSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper buat dapetin __dirname di ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fungsi download video dari YouTube dengan scraper ytmp3
 * Fokus ke 720p, fallback ke 360p
 */
const ytmp4Download = async (bitrate, format, url) => {
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
      downloadMode: "video",
      url: url
    }, { headers });

    return {
      success: true,
      title: v?.filename,
      url: v?.url,
      size: v?.size || null
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
};

// Fungsi helper buat format ukuran file biar gampang dibaca
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

// Handler utama buat ngerespon perintah dari user
let handler = async (m, { conn, text }) => {
  if (!text) {
    return m.reply(`*Cara pakenya gini, cuy:*\n.ytmp4 <url youtube>\n\n*Contoh:*\n.ytmp4 https://youtu.be/dQw4w9WgXcQ\n\nFokus download 720p, kalo gak ada fallback ke 360p.`);
  }

  const url = text.split(" ")[0];

  // Validasi URL YouTube
  if (!/youtube\.com|youtu\.be/.test(url)) {
    return m.reply("❌ *URL YouTube-nya gak valid, nih. Coba copy-paste lagi.*");
  }

  try {
    m.reply("⏳ *Sabar ya, lagi di-download video... Bentar lagi beres kok!*");

    // PRIMARY: Coba download 720p
    console.log('[YTV] Trying download 720p...');
    let result = await ytmp4Download('720', 'mp4', url);
    
    // SECONDARY: Fallback ke 360p kalo 720p gagal
    if (!result.success || !result.url) {
      console.log('[YTV] 720p failed, trying 360p fallback...');
      result = await ytmp4Download('360', 'mp4', url);
    }

    if (!result.success || !result.url) {
      throw new Error('Gagal download video dari kedua resolusi');
    }

    const { title, url: downloadUrl, size } = result;
    
    const caption = `
✅ *DOWNLOAD VIDEO BERES!*

🎬 *Judul:* ${title}
📦 *Ukuran:* ${size || 'N/A'}
📺 *Format:* MP4
`.trim();

    await conn.sendMessage(m.chat, {
      video: { url: downloadUrl },
      mimetype: 'video/mp4',
      caption: caption
    }, { quoted: m });

  } catch (err) {
    console.error(err);
    m.reply(`❌ *Yah, gagal download cuy.*\n\n*Error:* ${err.message}`);
  }
};

// Info & konfigurasi command
handler.help = ['ytmp4 <url>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytv)$/i;
handler.limit = true;

// Export handler-nya biar bisa dipake di file utama
export default handler;