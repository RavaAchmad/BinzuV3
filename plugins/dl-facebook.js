import fetch from 'node-fetch';
import { promisify } from 'util';
import { pipeline } from 'stream';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const streamPipeline = promisify(pipeline);

let handler = async (m, { conn, args, usedPrefix, command }) => {  
    if (!args[0]) throw `Gunakan contoh ${usedPrefix}${command} https://fb.watch/mcx9K6cb6t/?mibextid=8103lRmnirLUhozF`;
    
    const statusMsg = await conn.sendMessage(m.chat, {
        text: '🔍 Mencari video...'
    });
    
    try {
        // Fetch video info
        await conn.sendMessage(m.chat, {
            text: '🔍 Mengambil informasi video...',
            edit: statusMsg.key
        });
        
        const res = await fetch(`https://api.ryzumi.vip/api/downloader/fbdl?url=${encodeURIComponent(args[0])}`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });
        
        if (!res.ok) {
            throw `HTTP Error: ${res.status} ${res.statusText}`;
        }
        
        const json = await res.json();
        
        if (!json.status || !json.data || json.data.length === 0) {
            throw `Video tidak ditemukan atau link tidak valid`;
        }
        
        // Prioritas: 1080p > 720p HD
        // Tapi 1080p perlu di-render dulu, jadi pilih 720p HD untuk simplicity
        let videoData = json.data.find(v => 
            v.type === 'video' && 
            v.resolution && 
            v.resolution.includes('HD')
        ) || json.data.find(v => v.type === 'video') || json.data[0];
        
        if (!videoData || !videoData.url) {
            throw `URL video tidak ditemukan dalam response`;
        }
        
        // Jika tipe image dengan shouldRender, skip (perlu proses render yang kompleks)
        if (videoData.type === 'image' && videoData.shouldRender) {
            // Cari alternatif video direct
            videoData = json.data.find(v => v.type === 'video');
            if (!videoData || !videoData.url) {
                throw `Video memerlukan rendering. Coba gunakan link Facebook lain atau tunggu beberapa saat.`;
            }
        }
        
        await conn.sendMessage(m.chat, {
            text: `📹 Video ditemukan!\n🎬 Resolusi: ${videoData.resolution || 'Unknown'}\n⏬ Memulai download...`,
            edit: statusMsg.key
        });
        
        // Download video dengan progress
        const videoUrl = videoData.url;
        const tempFile = path.join(tmpdir(), `fb_${Date.now()}.mp4`);
        
        // Download dengan headers yang sesuai
        const downloadResponse = await fetch(videoUrl, {
            method: 'GET',
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'accept': 'video/mp4,video/*,*/*',
                'accept-language': 'en-US,en;q=0.9',
                'referer': 'https://www.facebook.com/',
                'sec-fetch-dest': 'video',
                'sec-fetch-mode': 'no-cors',
                'sec-fetch-site': 'cross-site'
            },
            redirect: 'follow'
        });
        
        if (!downloadResponse.ok) {
            throw `Gagal mengunduh video: ${downloadResponse.status} ${downloadResponse.statusText}`;
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
                // Fallback jika tidak ada content-length
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
            throw `Video terlalu besar (${fileSizeMB.toFixed(2)} MB). Maksimal 100 MB.`;
        }
        
        if (fileSizeMB < 0.1) {
            throw `File video terlalu kecil atau corrupt (${fileSizeMB.toFixed(2)} MB)`;
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
            // Ignore cleanup errors
        }
        
    } catch (error) {
        console.error('Facebook Download Error:', error);
        
        let errorMessage = '❌ Gagal mengunduh video!\n\n';
        
        if (error.message) {
            errorMessage += `Error: ${error.message}\n`;
        } else {
            errorMessage += `${error}\n`;
        }
        
        errorMessage += '\n💡 Tips:\n';
        errorMessage += '• Pastikan link Facebook valid\n';
        errorMessage += '• Video tidak private/terhapus\n';
        errorMessage += '• Coba link alternatif (fb.watch)';
        
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