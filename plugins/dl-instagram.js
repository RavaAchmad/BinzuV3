import axios from 'axios';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        throw `*Contoh:* ${usedPrefix}${command} https://www.instagram.com/p/ByxKbUSnubS/`
    }

    await m.reply('🔍 Sedang memproses, mohon tunggu...')

    try {
        const url = args[0]

        const data = await igdlrava(url)

        if (!data?.status) {
            throw (data?.message || 'Tidak ada data yang ditemukan.')
        }

        const { result } = data

        const allMedia = []

        if (Array.isArray(result.image)) {
            result.image.forEach(img => {
                allMedia.push({
                    url: img.url || img,
                    type: 'image'
                })
            })
        }

        if (Array.isArray(result.video)) {
            result.video.forEach(vid => {
                allMedia.push({
                    url: vid.url || vid,
                    type: 'video'
                })
            })
        }

        if (!allMedia.length) {
            throw 'Konten tidak ditemukan atau akun bersifat privat.'
        }

        const limitnya = 10

        const caption =
`${result.metadata?.caption || ''}`

        for (let i = 0; i < Math.min(limitnya, allMedia.length); i++) {
            const media = allMedia[i]

            try {
                await conn.sendFile(
                    m.chat,
                    media.url,
                    null,
                    i === 0 ? caption : '',
                    m
                )

                if (i < allMedia.length - 1) {
                    await new Promise(r => setTimeout(r, 500))
                }

            } catch (err) {
                console.error('Send media failed:', err)
            }
        }

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
async function igdlrava(instagramUrl) {
    const api_base = 'https://ravaja.my.id/api/download/instagram/v1';

    try {
        const response = await axios.get(api_base, {
            params: {
                url: instagramUrl,
                apikey: 'ravaja'
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        const data = response.data;

        // Validasi level 1
        if (!data || typeof data !== 'object') {
            throw new Error('Response API tidak valid');
        }

        // Validasi level 2
        if (data.status !== 200) {
            throw new Error(`API Error (${data.status})`);
        }

        // Validasi level 3
        if (!data.result?.result) {
            throw new Error('Data result tidak ditemukan');
        }

        const result = data.result.result;

        // Validasi URL media
        if (!Array.isArray(result.url) || result.url.length === 0) {
            throw new Error('Media tidak ditemukan');
        }

        const metadata = result.metadata || {};

        return {
            status: true,
            creator: data.creator || null,
            result: {
                media: result.url,
                isVideo: metadata.isVideo ?? false,
                caption: metadata.caption || '',
                username: metadata.username || '',
                like: Number(metadata.like) || 0,
                comment: Number(metadata.comment) || 0
            }
        };

    } catch (err) {
        return {
            status: false,
            message: err.message
        };
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}