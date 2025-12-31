import axios from 'axios';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.instagram.com/p/ByxKbUSnubS/`
    
    await m.reply('🔍 Sedang memproses, mohon tunggu...')

    try {
        let url = args[0]
        let data;

        try {
            data = await downloadInstagram(url)
        } catch (e) {
            throw 'Gagal mengambil data dari API. Coba lagi nanti.'
        }

        if (!data || !data.success) {
            throw data?.error || 'Tidak ada data yang ditemukan.'
        }
        
        const { result } = data;
        const allMedia = [];
        
        // Kumpulkan semua media (image dan video)
        if (result.image && Array.isArray(result.image) && result.image.length > 0) {
            result.image.forEach(img => {
                allMedia.push({
                    url: img.url || img,
                    type: 'image'
                });
            });
        }
        
        if (result.video && Array.isArray(result.video) && result.video.length > 0) {
            result.video.forEach(vid => {
                allMedia.push({
                    url: vid.url || vid,
                    type: 'video'
                });
            });
        }

        if (allMedia.length === 0) {
            throw 'Konten tidak ditemukan atau url bersifat privat.'
        }

        const limitnya = 10;
        
        for (let i = 0; i < Math.min(limitnya, allMedia.length); i++) {
            let fileUrl = allMedia[i].url
            let fileType = allMedia[i].type === 'video' ? '🎥 Video' : '🖼️ Foto'
            
            if (i > 0) await sleep(150);

            try {
                await conn.sendFile(
                    m.chat, 
                    fileUrl, 
                    null, 
                    `*Instagram Downloader*\n${fileType} (${i + 1}/${Math.min(limitnya, allMedia.length)})`, 
                    m
                )
            } catch (sendErr) {
                //
            }
        }

        await m.reply('✅ Semua file berhasil dikirim!')

    } catch (e) {
        await m.reply(`❌ *Error Terjadi:*\n${e}`)
    }
}

handler.help = ['instagram', 'ig'].map(v => v + ' <url>')
handler.tags = ['downloader']
handler.command = /^(ig|instagram|igdl|instagramdl|igstory)$/i
handler.limit = true

export default handler

// ========== INSTAGRAM API DOWNLOADER ==========

async function downloadInstagram(instagramUrl) {
    const API_BASE = 'https://api.ammaricano.my.id/api/download/instagram';
    
    const response = await axios.get(API_BASE, {
        params: {
            url: instagramUrl
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
    });

    const data = response.data;
    
    if (!data.success || !data.result) {
        throw new Error('API gagal mengambil konten')
    }
    
    const { result } = data;
    
    return {
        success: true,
        result: {
            image: result.image || [],
            video: result.video || []
        }
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}