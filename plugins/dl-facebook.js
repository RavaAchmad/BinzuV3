import fetch from 'node-fetch';
import { promisify } from 'util';
import { pipeline } from 'stream';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const streamPipeline = promisify(pipeline);

// Fungsi untuk generate headers yang match dengan API Anda
function getAPIHeaders(refererUrl = 'https://api.ryzumi.vip/') {
    return {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Host': 'api.ryzumi.vip',
        'Origin': 'https://api.ryzumi.vip',
        'Pragma': 'no-cache',
        'Referer': refererUrl,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
    };
}

// Fungsi untuk download headers yang sesuai dengan rapidcdn.app
function getDownloadHeaders(videoUrl) {
    const headers = {
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Encoding': 'identity;q=1, *;q=0',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Pragma': 'no-cache',
        'Range': 'bytes=0-',
        'Referer': 'https://api.ryzumi.vip/',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    };
    
    // Jika URL dari rapidcdn, tambahkan host header
    if (videoUrl.includes('rapidcdn.app')) {
        headers['Host'] = 'd.rapidcdn.app';
    }
    
    return headers;
}

// Fungsi untuk request dengan proper headers
async function fetchWithHeaders(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        redirect: 'follow',
        compress: true,
        follow: 10,
        timeout: 30000
    };
    
    return await fetch(url, { ...defaultOptions, ...options });
}

let handler = async (m, { conn, args, usedPrefix, command }) => {  
    if (!args[0]) throw `Gunakan contoh ${usedPrefix}${command} https://fb.watch/mcx9K6cb6t/?mibextid=8103lRmnirLUhozF`;
    
    const statusMsg = await conn.sendMessage(m.chat, {
        text: '🔍 Mencari video...'
    });
    
    try {
        // Fetch video info dengan headers yang sesuai
        await conn.sendMessage(m.chat, {
            text: '🔍 Mengambil informasi video...',
            edit: statusMsg.key
        });
        
        const apiUrl = `https://api.ryzumi.vip/api/downloader/fbdl?url=${encodeURIComponent(args[0])}`;
        
        const res = await fetchWithHeaders(apiUrl, {
            headers: getAPIHeaders(apiUrl)
        });
        
        if (!res.ok) {
            // Log response headers untuk debugging
            const responseHeaders = {};
            res.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            console.log('Response Headers:', responseHeaders);
            
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        // Verify response headers match expected
        const cfCacheStatus = res.headers.get('cf-cache-status');
        const contentType = res.headers.get('content-type');
        
        console.log('CF-Cache-Status:', cfCacheStatus);
        console.log('Content-Type:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            if (text.includes('cloudflare') || text.includes('Access denied')) {
                throw new Error('IP masih di-ban oleh Cloudflare. Solusi: Whitelist IP di Cloudflare dashboard atau gunakan VPN.');
            }
            throw new Error(`Response bukan JSON. Content-Type: ${contentType}`);
        }
        
        const json = await res.json();
        
        if (!json.status || !json.data || json.data.length === 0) {
            throw new Error('Video tidak ditemukan atau link tidak valid');
        }
        
        // Prioritas: 1080p > 720p HD
        let videoData;
        
        // Cari video dengan resolusi tertinggi yang langsung bisa di-download
        const video1080p = json.data.find(v => 
            v.resolution && v.resolution.includes('1080p') && 
            !v.shouldRender && v.type === 'video'
        );
        const video720p = json.data.find(v => 
            v.type === 'video' && 
            v.resolution && v.resolution.includes('HD')
        );
        
        if (video1080p) {
            videoData = video1080p;
        } else if (video720p) {
            videoData = video720p;
        } else {
            videoData = json.data.find(v => v.type === 'video') || json.data[0];
        }
        
        if (!videoData || !videoData.url) {
            throw new Error('URL video tidak ditemukan dalam response');
        }
        
        // Handle relative URL untuk render endpoint
        if (videoData.url.startsWith('/render.php')) {
            videoData.url = `https://api.ryzumi.vip${videoData.url}`;
        }
        
        await conn.sendMessage(m.chat, {
            text: `📹 Video ditemukan!\n🎬 Resolusi: ${videoData.resolution || 'Unknown'}\n⏬ Memulai download...`,
            edit: statusMsg.key
        });
        
        // Download video dengan headers yang sesuai
        const tempFile = path.join(tmpdir(), `fb_${Date.now()}.mp4`);
        
        const downloadResponse = await fetchWithHeaders(videoData.url, {
            headers: getDownloadHeaders(videoData.url),
            timeout: 120000 // 2 menit untuk download
        });
        
        if (!downloadResponse.ok) {
            // Log download response headers
            const dlHeaders = {};
            downloadResponse.headers.forEach((value, key) => {
                dlHeaders[key] = value;
            });
            console.log('Download Response Headers:', dlHeaders);
            
            throw new Error(`Gagal mengunduh video: ${downloadResponse.status} ${downloadResponse.statusText}`);
        }
        
        const totalSize = parseInt(downloadResponse.headers.get('content-length') || '0');
        let downloadedSize = 0;
        let lastProgress = -10;
        let lastUpdateTime = Date.now();
        
        // Create write stream
        const fileStream = fs.createWriteStream(tempFile);
        
        // Download dengan progress tracking
        downloadResponse.body.on('data', async (chunk) => {
            downloadedSize += chunk.length;
            
            if (totalSize > 0) {
                const progress = Math.floor((downloadedSize / totalSize) * 100);
                const now = Date.now();
                
                // Update setiap 10% atau setiap 3 detik
                if (progress - lastProgress >= 10 || now - lastUpdateTime >= 3000) {
                    lastProgress = progress;
                    lastUpdateTime = now;
                    
                    const bar = createProgressBar(progress);
                    const sizeMB = (downloadedSize / (1024 * 1024)).toFixed(2);
                    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
                    
                    try {
                        await conn.sendMessage(m.chat, {
                            text: `⏬ Mengunduh video...\n\n${bar}\n${progress}%\n\n📦 ${sizeMB} MB / ${totalMB} MB\n🎬 ${videoData.resolution || 'Unknown'}`,
                            edit: statusMsg.key
                        });
                    } catch (e) {
                        // Ignore edit errors
                    }
                }
            } else {
                // Fallback tanpa content-length
                const now = Date.now();
                if (now - lastUpdateTime >= 5000) {
                    lastUpdateTime = now;
                    const sizeMB = (downloadedSize / (1024 * 1024)).toFixed(2);
                    
                    try {
                        await conn.sendMessage(m.chat, {
                            text: `⏬ Mengunduh video...\n\n📦 Downloaded: ${sizeMB} MB\n🎬 ${videoData.resolution || 'Unknown'}`,
                            edit: statusMsg.key
                        });
                    } catch (e) {
                        // Ignore edit errors
                    }
                }
            }
        });
        
        // Tunggu download selesai
        await streamPipeline(downloadResponse.body, fileStream);
        
        await conn.sendMessage(m.chat, {
            text: '✅ Download selesai!\n📤 Mengirim video...',
            edit: statusMsg.key
        });
        
        // Cek ukuran file
        const stats = fs.statSync(tempFile);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        if (fileSizeMB > 100) {
            fs.unlinkSync(tempFile); // Hapus file besar
            throw new Error(`Video terlalu besar (${fileSizeMB.toFixed(2)} MB). Maksimal 100 MB.`);
        }
        
        if (fileSizeMB < 0.1) {
            fs.unlinkSync(tempFile); // Hapus file corrupt
            throw new Error(`File video terlalu kecil atau corrupt (${fileSizeMB.toFixed(2)} MB)`);
        }
        
        // Kirim video
        await conn.sendFile(
            m.chat, 
            tempFile, 
            'facebook_video.mp4', 
            `*Facebook Downloader*\n\n📹 Resolusi: ${videoData.resolution || 'Unknown'}\n📦 Ukuran: ${fileSizeMB.toFixed(2)} MB\n✨ Download berhasil!`, 
            m
        );
        
        // Hapus status message setelah berhasil
        await conn.sendMessage(m.chat, {
            delete: statusMsg.key
        });
        
        // Cleanup temp file
        try {
            fs.unlinkSync(tempFile);
        } catch (e) {
            console.error('Cleanup error:', e);
        }
        
    } catch (error) {
        console.error('Facebook Download Error:', error);
        
        let errorMessage = '❌ Gagal mengunduh video!\n\n';
        
        if (error.message) {
            errorMessage += `${error.message}\n`;
        } else {
            errorMessage += `${error}\n`;
        }
        
        // Tambahkan solusi berdasarkan error
        if (error.message.includes('IP') || error.message.includes('ban') || error.message.includes('Access denied')) {
            errorMessage += '\n🔧 Solusi:\n';
            errorMessage += '• Whitelist IP bot di Cloudflare\n';
            errorMessage += '• Atau nonaktifkan Cloudflare untuk /api/*\n';
            errorMessage += '• Atau gunakan Cloudflare Tunnel';
        } else {
            errorMessage += '\n💡 Tips:\n';
            errorMessage += '• Pastikan link Facebook valid\n';
            errorMessage += '• Video tidak private/terhapus\n';
            errorMessage += '• Coba beberapa saat lagi';
        }
        
        try {
            await conn.sendMessage(m.chat, {
                text: errorMessage,
                edit: statusMsg.key
            });
        } catch (e) {
            m.reply(errorMessage);
        }
    }
}

// Fungsi untuk membuat progress bar
function createProgressBar(percentage) {
    const filled = Math.floor(percentage / 5);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}]`;
}

handler.help = ['facebook'].map(v => v + ' <url>');
handler.command = /^(fb|facebook|facebookdl|fbdl|fbdown|dlfb)$/i;
handler.tags = ['downloader'];
handler.limit = true;
handler.group = false;
handler.premium = false;
handler.owner = false;
handler.admin = false;
handler.botAdmin = false;
handler.fail = null;
handler.private = false;

export default handler;