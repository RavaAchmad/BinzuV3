import axios from 'axios';

const API_URL = 'https://ravaja.my.id/api/download/twitter/v10';
const API_KEY = global.btc || 'ravaja';
const MAX_MEDIA_SEND = 5;

function normalizeTwitterResult(data) {
    const result = data?.result || data?.data?.result || data?.data || data;
    const source = result?.source || result?.url || result?.tweetUrl || '';
    const caption = result?.text || result?.caption || result?.title || '';
    const candidates = [
        result?.result,
        result?.media,
        result?.mediaURLs,
        result?.downloads,
        result?.videos,
        result?.images,
        Array.isArray(result) ? result : null
    ];
    const media = candidates.find(Array.isArray) || [];

    return {
        source,
        caption,
        media: media
            .map((item, index) => normalizeMediaItem(item, index))
            .filter(item => item.url)
    };
}

function normalizeMediaItem(item, index) {
    if (typeof item === 'string') {
        return {
            index,
            type: inferMediaType(item),
            quality: '',
            url: item,
            thumbnail: ''
        };
    }

    const url = item?.url || item?.link || item?.download || item?.downloadUrl || item?.download_url || '';
    return {
        index: item?.index ?? index,
        type: normalizeMediaType(item?.type || inferMediaType(url, item)),
        quality: item?.quality || item?.label || '',
        url,
        thumbnail: item?.thumbnail || item?.thumb || ''
    };
}

function normalizeMediaType(type) {
    type = String(type || '').toLowerCase();
    if (type.includes('photo') || type.includes('image') || type.includes('gambar')) return 'image';
    if (type.includes('video')) return 'video';
    return type || 'file';
}

function inferMediaType(url = '', item = {}) {
    const text = `${url} ${item?.label || ''} ${item?.quality || ''}`.toLowerCase();
    if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) || text.includes('photo') || text.includes('image')) return 'image';
    if (/\.(mp4|mov|webm|mkv)(\?|$)/i.test(url) || text.includes('video')) return 'video';
    return 'file';
}

async function downloadTwitter(url) {
    const { data } = await axios.get(API_URL, {
        params: {
            apikey: API_KEY,
            url
        },
        timeout: 30000,
        validateStatus: status => status >= 200 && status < 500
    });

    if (!data || Number(data.status || 200) >= 400 || data.error) {
        throw new Error(data?.message || data?.error || 'API Twitter gagal mengambil media.');
    }

    const parsed = normalizeTwitterResult(data);
    if (!parsed.media.length) {
        throw new Error('Media tidak ditemukan. Pastikan link publik dan berisi foto/video.');
    }

    return parsed;
}

function buildCaption(result, item, position, total) {
    return [
        '*Twitter/X Downloader*',
        '',
        result.caption || result.source || '',
        '',
        `Media: ${position}/${total}`,
        `Tipe: ${item.type === 'image' ? 'Foto' : item.type === 'video' ? 'Video' : 'File'}`,
        item.quality ? `Kualitas: ${item.quality}` : ''
    ].filter(Boolean).join('\n');
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url) throw `*Contoh:* ${usedPrefix}${command} https://twitter.com/user/status/xxxxx`;
    if (!/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i.test(url)) {
        throw 'Link Twitter/X tidak valid.';
    }

    await m.reply('Sedang memproses Twitter/X...');

    try {
        const result = await downloadTwitter(url);
        const media = result.media.slice(0, MAX_MEDIA_SEND);

        for (let i = 0; i < media.length; i++) {
            const item = media[i];
            const caption = buildCaption(result, item, i + 1, media.length);

            if (i > 0) await new Promise(resolve => setTimeout(resolve, 750));

            if (item.type === 'image') {
                await conn.sendMessage(m.chat, {
                    image: { url: item.url },
                    caption
                }, { quoted: m });
            } else if (item.type === 'video') {
                await conn.sendMessage(m.chat, {
                    video: { url: item.url },
                    caption
                }, { quoted: m });
            } else {
                await conn.sendFile(m.chat, item.url, null, caption, m);
            }
        }
    } catch (e) {
        await m.reply(`Gagal mengunduh Twitter/X:\n${e?.message || e}`);
    }
};

handler.help = ['twitter'];
handler.tags = ['downloader'];
handler.command = /^(twitterdl|twitter|xdl|x)$/i;
handler.limit = true;
export default handler;
