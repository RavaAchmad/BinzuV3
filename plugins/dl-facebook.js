import axios from 'axios';

const API_URL = 'https://ravaja.my.id/api/download/facebook/v4';
const API_KEY = 'ravaja';

function getQualityScore(item = {}) {
    const quality = String(item.quality || '').toLowerCase();
    const resolution = quality.match(/(\d{3,4})p/);
    if (resolution) return Number(resolution[1]);
    if (quality.includes('hd')) return 720;
    if (quality.includes('sd')) return 360;
    return 0;
}

function getDownloadLink(item = {}) {
    return item.link || item.url || item.href || item.downloadUrl || item.download_url || '';
}

function pickBestVideo(downloads = []) {
    return downloads
        .filter(item => {
            const quality = String(item.quality || '').toLowerCase();
            return getDownloadLink(item) && !quality.includes('mp3') && !quality.includes('audio');
        })
        .sort((a, b) => getQualityScore(b) - getQualityScore(a))[0] || null;
}

function pickAudio(downloads = []) {
    return downloads.find(item => {
        const quality = String(item.quality || '').toLowerCase();
        return getDownloadLink(item) && (quality.includes('mp3') || quality.includes('audio'));
    }) || null;
}

function trimCaption(text = '') {
    const normalized = String(text || '').trim();
    return normalized.length > 1200 ? normalized.slice(0, 1197) + '...' : normalized;
}

async function getFacebookMedia(url) {
    const { data } = await axios.get(API_URL, {
        params: {
            apikey: API_KEY,
            url
        },
        timeout: 30000,
        validateStatus: status => status >= 200 && status < 500
    });

    const result = extractFacebookResult(data);
    if (!result) {
        const status = data?.status || data?.code || data?.statusCode || 'unknown';
        throw new Error(data?.message || data?.error || `API tidak mengembalikan result. Status: ${status}`);
    }

    return result;
}

function extractFacebookResult(data) {
    const candidates = [
        data?.result,
        data?.data?.result,
        data?.data,
        data?.response?.result,
        data?.response,
        data
    ];

    for (const item of candidates) {
        if (!item || typeof item !== 'object') continue;
        if (Array.isArray(item.downloads)) return item;
        if (Array.isArray(item.download)) return { ...item, downloads: item.download };
        if (Array.isArray(item.links)) return { ...item, downloads: item.links };
    }

    return null;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url) throw `Gunakan contoh ${usedPrefix}${command} https://fb.watch/xxx`;
    if (!/^https?:\/\//i.test(url) || !/(facebook\.com|fb\.watch|fb\.com)/i.test(url)) {
        throw 'Link Facebook tidak valid.';
    }

    const statusMsg = await conn.sendMessage(m.chat, {
        text: 'Mencari media Facebook...'
    }, { quoted: m });

    try {
        const result = await getFacebookMedia(url);
        const downloads = Array.isArray(result.downloads) ? result.downloads : [];
        const video = pickBestVideo(downloads);
        const audio = pickAudio(downloads);

        if (!video && !audio) {
            throw new Error('Tidak ditemukan link video atau audio dari API.');
        }

        const caption = [
            '*Facebook Downloader*',
            '',
            result.text ? trimCaption(result.text) : 'Tanpa caption',
            '',
            video ? `Video: ${video.quality || 'Unknown quality'}` : 'Video: Not found'
        ].join('\n');

        if (video) {
            await conn.sendMessage(m.chat, {
                video: { url: getDownloadLink(video) },
                caption
            }, { quoted: m });
        }

        if (audio) {
            await conn.sendMessage(m.chat, {
                audio: { url: getDownloadLink(audio) },
                mimetype: 'audio/mpeg',
                fileName: 'facebook-audio.mp3'
            }, { quoted: m });
        }

        await conn.sendMessage(m.chat, { delete: statusMsg.key });
    } catch (error) {
        console.error('[FB-DL Error]', error);

        const errorMessage = [
            'Gagal mengunduh media Facebook.',
            '',
            error?.message || String(error),
            '',
            'Kemungkinan:',
            '- Video private/terhapus',
            '- Link tidak valid',
            '- API sedang maintenance'
        ].join('\n');

        try {
            await conn.sendMessage(m.chat, {
                text: errorMessage,
                edit: statusMsg.key
            });
        } catch {
            m.reply(errorMessage);
        }
    }
};

handler.help = ['facebook'].map(v => v + ' <url>');
handler.command = /^(fb|facebook|facebookdl|fbdl|fbdown|dlfb)$/i;
handler.tags = ['downloader'];
handler.limit = true;

export default handler;
