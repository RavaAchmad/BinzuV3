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
        // Fetch video info dengan retry
        await conn.sendMessage(m.chat, {
            text: '🔍 Mengambil informasi video...',
            edit: statusMsg.key
        });
        
        let json;
        let lastError;
        
        // Coba beberapa kali dengan delay
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const res = await fetch(`https://api.ryzumi.vip/api/downloader/fbdl?url=${encodeURIComponent(args[0])}`, {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                        'referer': 'https://api.ryzumi.vip/',
                        'origin': 'https://api.ryzumi.vip',
                        'accept-language': 'en-US,en;q=0.9',
                        'accept-encoding': 'gzip, deflate, br',
                        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                        'sec-fetch-dest': 'empty',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-site': 'same-origin'
                    },
                    timeout: 30000
                });
                
                if (res.ok) {
                    json = await res.json();
                    break;
                } else {
                    lastError = `HTTP ${res.status}: ${res.statusText}`;
                    
                    if (attempt < 3) {
                        await conn.sendMessage(m.chat, {
                            text: `⚠️ Percobaan ${attempt} gagal (${res.status})\n🔄 Mencoba lagi...`,
                            edit: statusMsg.key
                        });
                        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Delay bertahap
                    }
                }
            } catch (err) {
                lastError = err.message;
                
                if (attempt < 3) {
                    await conn.sendMessage(m.chat, {
                        text: `⚠️ Percobaan ${attempt} gagal\n🔄 Mencoba lagi...`,
                        edit: statusMsg.key
                    });
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                }
            }
        }
        
        if (!json) {
            throw `Gagal mengambil data setelah 3 percobaan.\nError: ${lastError}\n\nKemungkinan:\n• API sedang down\n• Rate limit exceeded\n• Link tidak valid\n• Video private/terhapus`;
        }
        
        if (!json.status || !json.data || json.data.length === 0) {
            throw `Video tidak ditemukan atau link tidak valid`;
        }
        
        // Cari video dengan resolusi tertinggi (HD/720p)
        let videoData = json.data.find(v => v.resolution && v.resolution.includes('HD')) || json.data[0];
        
        if (!videoData || !videoData.url) {
            throw `URL video tidak ditemukan dalam response`;
        }
        
        await conn.sendMessage(m.chat, {
            text: `📹 Video ditemukan!\n🎬 Resolusi: ${videoData.resolution || 'Unknown'}\n⏬ Memulai download...`,
            edit: statusMsg.key
        });
        
        // Download video dengan progress
        const videoUrl = videoData.url;
        const tempFile = path.join(tmpdir(), `fb_${Date.now()}.mp4`);
        
        // Download dengan headers yang lebih lengkap
        const downloadResponse = await fetch(videoUrl, {
            method: 'GET',
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'accept': 'video/mp4,video/*,*/*',
                'accept-encoding': 'identity',
                'accept-language': 'en-US,en;q=0.9',
                'referer': 'https://www.facebook.com/',
                'origin': 'https://www.facebook.com',
                'sec-fetch-dest': 'video',
                'sec-fetch-mode': 'no-cors',
                'sec-fetch-site': 'cross-site',
                'range': 'bytes=0-'
            },
            redirect: 'follow',
            timeout: 60000
        });
        
        if (!downloadResponse.ok) {
            throw `Gagal mengunduh video: ${downloadResponse.status} ${downloadResponse.statusText}`;
        }
        
        const totalSize = parseInt(downloadResponse.headers.get('content-length') || '0');
        let downloadedSize = 0;
        let lastProgress = -10; // Mulai dari -10 agar update pertama langsung muncul
        let lastUpdateTime = Date.now();
        
        // Create write stream
        const fileStream = fs.createWriteStream(tempFile);
        
        // Download dengan progress tracking
        downloadResponse.body.on('data', async (chunk) => {
            downloadedSize += chunk.length;
            
            if (totalSize > 0) {
                const progress = Math.floor((downloadedSize / totalSize) * 100);
                const now = Date.now();
                
                // Update setiap 10% atau setiap 3 detik (mana yang lebih dulu)
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
                // Jika content-length tidak ada, update berdasarkan waktu
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
        
        errorMessage += '\n💡 Solusi:\n';
        errorMessage += '• Pastikan link Facebook valid\n';
        errorMessage += '• Video tidak private/terhapus\n';
        errorMessage += '• Coba beberapa saat lagi\n';
        errorMessage += '• Gunakan link alternatif (fb.watch atau facebook.com)';
        
        try {
            await conn.sendMessage(m.chat, {
                text: errorMessage,
                edit: statusMsg.key
            });
        } catch (e) {
            // Jika edit gagal, kirim pesan baru
            m.reply(errorMessage);
        }
    }
}

// Fungsi untuk membuat progress bar
function createProgressBar(percentage) {
    const filled = Math.floor(percentage / 5); // 20 blok untuk 100%
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}]`;
}