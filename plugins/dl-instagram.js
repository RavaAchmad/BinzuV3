import axios from 'axios';
import * as cheerio from 'cheerio';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // Validasi input URL
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.instagram.com/p/ByxKbUSnubS/`;
    
    const url = args[0];
    
    // Validasi URL Instagram
    if (!url.match(/instagram\.com\/(p|reel|tv|stories)\/[\w-]+/i)) {
        throw 'URL Instagram tidak valid!';
    }
    
    m.reply('Sedang memproses, mohon tunggu...');

    try {
        const mediaUrls = await instasaveDownload(url);
        
        if (!mediaUrls || mediaUrls.length === 0) {
            throw 'Konten tidak ditemukan atau URL bersifat privat.';
        }

        const limit = 99; // Batasi maksimal 10 media
        const totalMedia = Math.min(limit, mediaUrls.length);

        for (let i = 0; i < totalMedia; i++) {
            const { url: mediaUrl, type } = mediaUrls[i];
            
            // Delay untuk mencegah banned
            if (i > 0) await sleep(200);

            try {
                await conn.sendFile(
                    m.chat, 
                    mediaUrl, 
                    null, 
                    `*Instagram Downloader*\nTipe: ${type}\n(${i + 1}/${totalMedia})`, 
                    m
                );
            } catch (err) {
                console.error(`Gagal mengirim media ${i + 1}:`, err);
            }
        }

    } catch (e) {
        console.error(e);
        const errorMsg = e.message || 'Terjadi kesalahan saat memproses.';
        m.reply(`❌ ${errorMsg}\n\nCoba lagi nanti atau gunakan URL yang berbeda.`);
    }
}


handler.help = ['instagram', 'ig'].map(v => v + ' <url>');
handler.tags = ['downloader'];
handler.command = /^(ig|instagram|igdl|instagramdl|igreels?)$/i;
handler.limit = true;

export default handler;


/**
 * Download dari instasave.website dengan deteksi tipe media
 */
async function instasaveDownload(url) {
    try {
        // Request ke API instasave
        const response = await axios.post(
            'https://api.instasave.website/media',
            `url=${encodeURIComponent(url)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            }
        );

        const html = response.data;
        
        // Extract semua URL CDN menggunakan regex
        const cdnUrlRegex = /https:\/\/cdn\.instasave\.website\/\?token=[^"'\s\\]+/g;
        const matches = html.match(cdnUrlRegex);
        
        if (!matches || matches.length === 0) {
            throw new Error('Tidak ada media ditemukan');
        }

        // Hapus duplikat
        const uniqueUrls = [...new Set(matches)];
        const mediaUrls = uniqueUrls.slice(1);
        // Deteksi tipe media untuk setiap URL
        const mediaList = await Promise.all(
            mediaUrls.map(async (cdnUrl) => {
                const type = await detectMediaType(cdnUrl);
                return { url: cdnUrl, type };
            })
        );

        return mediaList;

    } catch (error) {
        console.error('Error instasaveDownload:', error.message);
        throw new Error('Gagal mengambil data dari Instagram');
    }
}

/**
 * Deteksi tipe media melalui HEAD request dan analisis URL
 */
async function detectMediaType(url) {
    try {
        // Cek dari URL pattern terlebih dahulu (lebih cepat)
        const urlLower = url.toLowerCase();
        
        // Decode JWT token untuk cek filename
        if (url.includes('?token=')) {
            try {
                const token = url.split('?token=')[1];
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                
                if (payload.filename) {
                    const ext = payload.filename.split('.').pop().toLowerCase();
                    if (ext === 'mp4' || ext === 'mov') return 'video';
                    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image';
                }
            } catch (e) {
                // Jika gagal decode, lanjut ke method lain
            }
        }

        // Fallback: HEAD request untuk cek Content-Type
        const response = await axios.head(url, {
            timeout: 5000,
            maxRedirects: 5,
            validateStatus: () => true
        });

        const contentType = response.headers['content-type'] || '';
        
        if (contentType.includes('video')) return 'video';
        if (contentType.includes('image')) return 'image';
        
        // Default ke image jika tidak terdeteksi
        return 'image';

    } catch (error) {
        console.error('Error detectMediaType:', error.message);
        // Default return image jika error
        return 'image';
    }
}

/**
 * Helper function untuk delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}