import search from 'yt-search';
import fetch from 'node-fetch';
import axios from 'axios';

// ============================================================
// YOUTUBE SCRAPER - EZCONV
// ============================================================

async function downloadYoutubeShort(videoUrl) {
    try {
        const cfApiUrl = 'https://api.nekolabs.web.id/tools/bypass/cf-turnstile';
        const cfPayload = {
            url: 'https://ezconv.cc',
            siteKey: '0x4AAAAAAAi2NuZzwS99-7op'
        };
        
        const { data: cfResponse } = await axios.post(cfApiUrl, cfPayload);
        
        if (!cfResponse.success || !cfResponse.result) {
            return {
                success: false,
                error: 'No se pudo obtener el token de captcha'
            };
        }
        
        const captchaToken = cfResponse.result;
        
        const convertApiUrl = 'https://ds1.ezsrv.net/api/convert';
        const convertPayload = {
            url: videoUrl,
            quality: '320',
            trim: false,
            startT: 0,
            endT: 0,
            captchaToken: captchaToken
        };
        
        const { data: convertResponse } = await axios.post(convertApiUrl, convertPayload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (convertResponse.status !== 'done') {
            return {
                success: false,
                error: `La conversión falló. Estado: ${convertResponse.status}`
            };
        }
        
        return {
            success: true,
            data: {
                title: convertResponse.title,
                downloadUrl: convertResponse.url,
                status: convertResponse.status
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.response?.data ? error.response.data : error.message
        };
    }
}

const handler = async (m, { conn, text, usedPrefix }) => {
    if (!text) throw 'Enter Title / Link From YouTube!';
    try {
        await m.reply(wait)
        const look = await search(text);
        const convert = look.videos[0];
        if (!convert) throw 'Video/Audio Tidak Ditemukan';
        if (convert.seconds >= 3600) {
            return conn.reply(m.chat, 'Video is longer than 1 hour!', m);
        } else {
            let audioUrl;
            
            // PRIMARY: EZCONV Scraper
            console.log('[YT] Trying EZCONV scraper...');
            const scraperResult = await downloadYoutubeShort(convert.url);
            
            if (scraperResult.success && scraperResult.data.downloadUrl) {
                console.log('[YT] EZCONV scraper success');
                audioUrl = {
                    result: {
                        mp3: scraperResult.data.downloadUrl
                    }
                };
            } else {
                // SECONDARY: Fallback API
                console.log('[YT] Trying fallback API...');
                try {
                    const res = await fetch(`https://api.botcahx.eu.org/api/dowloader/yt?url=${convert.url}&apikey=${btc}`);
                    try {
                        audioUrl = await res.json();
                    } catch (e) {
                        conn.reply('6281212035575@s.whatsapp.net', eror, m);
                    }
                } catch (e) {
                    conn.reply('6281212035575@s.whatsapp.net', eror, m);
                    return;
                }
            }

            let caption = '';
            caption += `∘ Title : ${convert.title}\n`;
            caption += `∘ Ext : Search\n`;
            caption += `∘ ID : ${convert.videoId}\n`;
            caption += `∘ Duration : ${convert.timestamp}\n`;
            caption += `∘ Viewers : ${convert.views}\n`;
            caption += `∘ Upload At : ${convert.ago}\n`;
            caption += `∘ Author : ${convert.author.name}\n`;
            caption += `∘ Channel : ${convert.author.url}\n`;
            caption += `∘ Url : ${convert.url}\n`;
            caption += `∘ Description : ${convert.description}\n`;
            caption += `∘ Thumbnail : ${convert.image}`;

            await conn.relayMessage(m.chat, {
                extendedTextMessage: {
                    text: caption,
                    contextInfo: {
                        externalAdReply: {
                            title: convert.title,
                            mediaType: 1,
                            previewType: 0,
                            renderLargerThumbnail: true,
                            thumbnailUrl: convert.image,
                            sourceUrl: convert.url
                        }
                    },
                    mentions: [m.sender]
                }
            }, {});

            await conn.sendMessage(m.chat, { 
                audio: { url: audioUrl.result.mp3 }, 
                mimetype: 'audio/mpeg',
                fileName: convert.title
            }, { quoted: m });
        }
    } catch (e) {
        conn.reply(m.chat, eror, m)
    }
};

handler.command = handler.help = ['play', 'song', 'xm'];
handler.tags = ['downloader'];
handler.exp = 0;
handler.limit = true;
handler.premium = false;

export default handler;