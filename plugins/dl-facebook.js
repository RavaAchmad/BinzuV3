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
        
        const res = await fetch(`https://api.ryzumi.vip/api/downloader/fbdl?url=${args[0]}`, {
            headers: {
                'accept': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!res.ok) {
            throw `HTTP Error: ${res.status} ${res.statusText}`;
        }
        
        const json = await res.json();
        
        if (!json.status || !json.data || json.data.length === 0) {
            throw `Tidak dapat mendapatkan video dari tautan yang diberikan`;
        }
        
        // Cari video dengan resolusi tertinggi (HD/720p)
        let videoData = json.data.find(v => v.resolution && v.resolution.includes('HD')) || json.data[0];
        
        if (!videoData || !videoData.url) {
            throw `URL video tidak ditemukan`;
        }
        
        await conn.sendMessage(m.chat, {
            text: `📹 Video ditemukan!\n🎬 Resolusi: ${videoData.resolution || 'Unknown'}\n⏬ Memulai download...`,
            edit: statusMsg.key
        });
        
        // Download video dengan progress
        const videoUrl = videoData.url;
        const tempFile = path.join(tmpdir(), `fb_${Date.now()}.mp4`);
        
        const downloadResponse = await fetch(videoUrl, {
            headers: {
                'user-agent': 'TelegramBot (like TwitterBot)'
            }
        });
        
        if (!downloadResponse.ok) {
            throw `Gagal mengunduh video: ${downloadResponse.status}`;
        }
        
        const totalSize = parseInt(downloadResponse.headers.get('content-length') || '0');
        let downloadedSize = 0;
        let lastProgress = 0;
        
        // Create write stream
        const fileStream = fs.createWriteStream(tempFile);
        
        // Download dengan progress tracking
        downloadResponse.body.on('data', async (chunk) => {
            downloadedSize += chunk.length;
            
            if (totalSize > 0) {
                const progress = Math.floor((downloadedSize / totalSize) * 100);
                
                // Update setiap 10% untuk menghindari spam
                if (progress - lastProgress >= 10) {
                    lastProgress = progress;
                    const bar = createProgressBar(progress);
                    const sizeMB = (downloadedSize / (1024 * 1024)).toFixed(2);
                    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
                    
                    try {
                        await conn.sendMessage(m.chat, {
                            text: `⏬ Mengunduh video...\n\n${bar}\n${progress}%\n\n📦 ${sizeMB} MB / ${totalMB} MB`,
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
        
        // Kirim video
        await conn.sendFile(
            m.chat, 
            tempFile, 
            'facebook_video.mp4', 
            `*Facebook Downloader*\n\n📹 Resolusi: ${videoData.resolution || 'Unknown'}\n📦 Ukuran: ${(totalSize / (1024 * 1024)).toFixed(2)} MB\n✨ Download berhasil!`, 
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
        
        try {
            await conn.sendMessage(m.chat, {
                text: `❌ Gagal mengunduh video!\n\n${error.message || error}`,
                edit: statusMsg.key
            });
        } catch (e) {
            // Jika edit gagal, kirim pesan baru
            m.reply(`❌ Gagal mengunduh video!\n\n${error.message || error}`);
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