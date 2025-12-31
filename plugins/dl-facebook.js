import fetch from 'node-fetch';
import { promisify } from 'util';
import { pipeline } from 'stream';
import path from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import axios from 'axios';
import * as cheerio from 'cheerio';
import qs from 'qs';
import fs from 'fs';

const streamPipeline = promisify(pipeline);
const execPromise = promisify(exec);

// ============================================================
// PRIMARY: API ikyiizyy.my.id
// ============================================================

async function fetchFromAPI(fbUrl) {
    const apiUrl = `https://ikyiizyy.my.id/download/facebook?apikey=new&url=${encodeURIComponent(fbUrl)}`;
    
    try {
        const res = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });
        
        if (!res.ok) {
            throw new Error(`API HTTP ${res.status}`);
        }
        
        const json = await res.json();
        
        if (!json.status || !json.result) {
            throw new Error('API returned invalid response');
        }
        
        return {
            success: true,
            data: json.result
        };
        
    } catch (error) {
        console.error('[fetchFromAPI] Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

function selectBestVideoFromAPI(result) {
    if (!result) return null;
    
    // Priority: Direct fbcdn URLs dari video array
    if (result.video && Array.isArray(result.video)) {
        const videos = result.video.filter(v => {
            if (!v.url) return false;
            // Skip snapcdn token URLs
            if (v.url.includes('snapcdn.app') && v.url.includes('token=')) return false;
            return true;
        });
        
        // Sort by quality
        const qualityPriority = { '1080p': 100, '1080': 100, '720p': 80, 'hd': 70, '360p': 40, 'sd': 30 };
        
        videos.sort((a, b) => {
            const scoreA = qualityPriority[a.quality?.toLowerCase()] || 0;
            const scoreB = qualityPriority[b.quality?.toLowerCase()] || 0;
            return scoreB - scoreA;
        });
        
        if (videos.length > 0) {
            return {
                quality: videos[0].quality || 'Unknown',
                url: videos[0].url,
                title: result.title || 'Facebook Video',
                duration: result.duration || 'Unknown'
            };
        }
    }
    
    // Fallback: result.media
    if (result.media) {
        return {
            quality: 'HD',
            url: result.media,
            title: result.title || 'Facebook Video',
            duration: result.duration || 'Unknown'
        };
    }
    
    return null;
}


// ============================================================
// DOWNLOAD
// ============================================================

async function downloadWithProgress(url, outputFile, conn, m, statusMsg, quality) {
    let lastUpdate = 0;
    
    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            timeout: 300000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.facebook.com/'
            }
        });
        
        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;
        
        const writer = fs.createWriteStream(outputFile);
        
        response.data.on('data', async (chunk) => {
            downloadedLength += chunk.length;
            const progress = (downloadedLength / totalLength) * 100;
            
            // Update setiap 5%
            if (progress - lastUpdate >= 5) {
                lastUpdate = Math.floor(progress / 5) * 5;
                const bar = createProgressBar(progress);
                
                try {
                    await conn.sendMessage(m.chat, {
                        text: `⏬ Downloading...\n\n${bar}\n${progress.toFixed(1)}%\n\n🎬 ${quality}`,
                        edit: statusMsg.key
                    });
                } catch (e) {}
            }
        });
        
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
            response.data.on('error', reject);
        });
        
    } catch (error) {
        throw new Error(`Download failed: ${error.message}`);
    }
}

function createProgressBar(percentage) {
    const filled = Math.floor(percentage / 5);
    const empty = 20 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

// ============================================================
// MAIN HANDLER
// ============================================================

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `Gunakan contoh ${usedPrefix}${command} https://fb.watch/xxx`;
    
    const statusMsg = await conn.sendMessage(m.chat, {
        text: '🔍 Mencari video...'
    });
    
    try {
        // ============================================================
        // PRIMARY: FBDL (Scrape-based)
        // ============================================================
        console.log('[Handler] Trying FBDL scraper (PRIMARY)...');
        
        await conn.sendMessage(m.chat, {
            text: '🔍 Memeriksa url valid atau tidak',
            edit: statusMsg.key
        });
        
        const fbdlResult = await fbdl(args[0]);
        
        if (fbdlResult.success && fbdlResult.url) {
            console.log('[PRIMARY] FBDL berhasil:', fbdlResult.quality);
            
            await conn.sendMessage(m.chat, {
                text: `📹 Video ditemukan!\n\n📝 ${fbdlResult.title}\n🎬 ${fbdlResult.quality}\n⏬ Downloading...`,
                edit: statusMsg.key
            });
            
            // Download dengan progress tracking real-time
            const tempFile = path.join(tmpdir(), `fb_${Date.now()}.mp4`);
            
            try {
                await downloadWithProgress(fbdlResult.url, tempFile, conn, m, statusMsg, fbdlResult.quality);
                
                // Validate file
                if (!fs.existsSync(tempFile)) {
                    throw new Error('Download failed');
                }
                
                const stats = fs.statSync(tempFile);
                const fileSizeMB = stats.size / (1024 * 1024);
                
                if (fileSizeMB > 100) {
                    fs.unlinkSync(tempFile);
                    throw new Error(`Video too large (${fileSizeMB.toFixed(2)} MB)`);
                }
                
                if (fileSizeMB < 0.1) {
                    fs.unlinkSync(tempFile);
                    throw new Error(`File corrupt (${fileSizeMB.toFixed(2)} MB)`);
                }
                
                const caption = [
                    `*Facebook Downloader*`,
                    ``,
                    `📝 ${fbdlResult.title}`,
                    `🎬 ${fbdlResult.quality}`,
                    `📦 ${fileSizeMB.toFixed(2)} MB`,
                    ``,
                    `✨ Success!`
                ].join('\n');
                
                await conn.sendFile(m.chat, tempFile, 'facebook_video.mp4', caption, m);
                await conn.sendMessage(m.chat, { delete: statusMsg.key });
                
                try {
                    fs.unlinkSync(tempFile);
                } catch (e) {}
                
                return; // SUCCESS, EXIT
            } catch (downloadErr) {
                console.error('[PRIMARY] Download error:', downloadErr.message);
                try {
                    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                } catch (e) {}
                // Fall through to secondary method
            }
        }
        
        // ============================================================
        // SECONDARY: API ikyiizyy.my.id
        // ============================================================
        console.log('[Handler] Trying API (SECONDARY)...');
        
        await conn.sendMessage(m.chat, {
            text: '🔍 Mencoba API alternatif...',
            edit: statusMsg.key
        });
        
        const apiResult = await fetchFromAPI(args[0]);
        
        if (apiResult.success) {
            const videoData = selectBestVideoFromAPI(apiResult.data);
            
            if (videoData && videoData.url) {
                console.log('[SECONDARY] API berhasil:', videoData.quality);
                
                await conn.sendMessage(m.chat, {
                    text: `📹 Video ditemukan!\n\n📝 ${videoData.title}\n⏱️ ${videoData.duration}\n🎬 ${videoData.quality}\n⏬ Downloading...`,
                    edit: statusMsg.key
                });
                
                // Download dengan progress tracking real-time
                const tempFile = path.join(tmpdir(), `fb_${Date.now()}.mp4`);
                
                try {
                    await downloadWithProgress(videoData.url, tempFile, conn, m, statusMsg, videoData.quality);
                    
                    // Validate file
                    if (!fs.existsSync(tempFile)) {
                        throw new Error('Download failed');
                    }
                    
                    const stats = fs.statSync(tempFile);
                    const fileSizeMB = stats.size / (1024 * 1024);
                    
                    if (fileSizeMB > 100) {
                        fs.unlinkSync(tempFile);
                        throw new Error(`Video too large (${fileSizeMB.toFixed(2)} MB)`);
                    }
                    
                    if (fileSizeMB < 0.1) {
                        fs.unlinkSync(tempFile);
                        throw new Error(`File corrupt (${fileSizeMB.toFixed(2)} MB)`);
                    }
                    
                    const caption = [
                        `*Facebook Downloader*`,
                        ``,
                        `📝 ${videoData.title}`,
                        `⏱️ ${videoData.duration}`,
                        `🎬 ${videoData.quality}`,
                        `📦 ${fileSizeMB.toFixed(2)} MB`,
                        ``,
                        `✨ Success!`
                    ].join('\n');
                    
                    await conn.sendFile(m.chat, tempFile, 'facebook_video.mp4', caption, m);
                    await conn.sendMessage(m.chat, { delete: statusMsg.key });
                    
                    try {
                        fs.unlinkSync(tempFile);
                    } catch (e) {}
                    
                    return; // SUCCESS, EXIT
                } catch (downloadErr) {
                    console.error('[SECONDARY] Download error:', downloadErr.message);
                    try {
                        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                    } catch (e) {}
                    throw new Error('Failed to download video');
                }
            }
        }
        
        // ============================================================
        // TERTIARY: GIVE UP
        // ============================================================
        throw new Error('Semua metode gagal. Video mungkin private atau tidak tersedia.');
        
    } catch (error) {
        console.error('[Handler Error]', error);
        
        let errorMessage = '❌ Gagal mengunduh video!\n\n';
        errorMessage += `${error.message}\n`;
        errorMessage += '\n💡 Kemungkinan:\n';
        errorMessage += '• Video private/terhapus\n';
        errorMessage += '• Link tidak valid\n';
        errorMessage += '• Downloader sedang maintenance';
        
        try {
            await conn.sendMessage(m.chat, {
                text: errorMessage,
                edit: statusMsg.key
            });
        } catch (e) {
            m.reply(errorMessage);
        }
    }
};

handler.help = ['facebook'].map(v => v + ' <url>');
handler.command = /^(fb|facebook|facebookdl|fbdl|fbdown|dlfb)$/i;
handler.tags = ['downloader'];
handler.limit = true;

export default handler;





async function fbdl(videourl) {
    const TARGET_URL = 'https://fdownloader.net/es';
    try {
        console.log('[FBDL] Fetching main page...');
        const pageResponse = await axios.get(TARGET_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const html = pageResponse.data;
        const kExpMatch = html.match(/k_exp="(.*?)"/);
        const kTokenMatch = html.match(/k_token="(.*?)"/);

        const k_exp = kExpMatch ? kExpMatch[1] : null;
        const k_token = kTokenMatch ? kTokenMatch[1] : null;

        if (!k_exp || !k_token) {
            console.error('[FBDL] Could not find tokens on the page.');
            return { success: false, error: 'Token extraction failed' };
        }

        console.log('[FBDL] Performing search...');
        const searchPayload = {
            k_exp: k_exp,
            k_token: k_token,
            q: videourl,
            lang: 'es',
            web: 'fdownloader.net',
            v: 'v2',
            w: '',
            cftoken: ''
        };

        const searchResponse = await axios.post('https://v3.fdownloader.net/api/ajaxSearch', qs.stringify(searchPayload), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://fdownloader.net',
                'Referer': 'https://fdownloader.net/'
            }
        });

        console.log('[FBDL] Search Status:', searchResponse.data.status);
        
        if (searchResponse.data.status === 'ok') {
            const htmlData = searchResponse.data.data;
            const $result = cheerio.load(htmlData);
            
            // Priority: 1080p render button
            const renderButton = $result('button[onclick*="convertFile"]');
            if (renderButton.length > 0) {
                console.log('[FBDL] Found 1080p Render Button');
                const videoUrl = renderButton.attr('data-videourl');
                const videoCodec = renderButton.attr('data-videocodec');
                const videoType = renderButton.attr('data-videotype');
                const fquality = renderButton.attr('data-fquality');
                
                const audioUrl = $result('#audioUrl').val();
                const audioType = $result('#audioType').val();
                const v_id = $result('#FbId').val();

                const cTokenMatch = htmlData.match(/c_token\s*=\s*"(.*?)"/);
                const kExpMatchRes = htmlData.match(/k_exp\s*=\s*"(.*?)"/);
                const kUrlConvertMatch = htmlData.match(/k_url_convert\s*=\s*"(.*?)"/);

                const c_token = cTokenMatch ? cTokenMatch[1] : null;
                const k_exp_res = kExpMatchRes ? kExpMatchRes[1] : null;
                const k_url_convert = kUrlConvertMatch ? kUrlConvertMatch[1] : 'https://s3.vidcdn.app/api/json/convert';

                if (videoUrl && audioUrl && c_token) {
                    console.log('[FBDL] Initiating 1080p Conversion...');
                    
                    const convertPayload = {
                        ftype: 'mp4',
                        v_id: v_id,
                        videoUrl: videoUrl,
                        videoType: videoType,
                        videoCodec: videoCodec,
                        audioUrl: audioUrl,
                        audioType: audioType,
                        fquality: fquality,
                        fname: 'FDownloader.net',
                        exp: k_exp_res,
                        token: c_token,
                        cv: 'v2'
                    };

                    try {
                        const convertResponse = await axios.post(k_url_convert, qs.stringify(convertPayload), {
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Origin': 'https://fdownloader.net',
                                'Referer': 'https://fdownloader.net/'
                            }
                        });

                        if (convertResponse.data && convertResponse.data.d) {
                            console.log('[FBDL] 1080p download ready:', convertResponse.data.d);
                            return {
                                success: true,
                                quality: '1080p',
                                url: convertResponse.data.d,
                                title: 'Facebook Video',
                                duration: 'Unknown'
                            };
                        }
                    } catch (convErr) {
                        console.error('[FBDL] Conversion Error:', convErr.message);
                    }
                }
            }

            // Fallback: Direct download links
            const downloadLinks = [];
            $result('a.download-link-fb').each((i, el) => {
                const quality = $result(el).closest('tr').find('.video-quality').text().trim();
                const href = $result(el).attr('href');
                if (href) {
                    downloadLinks.push({ quality, url: href });
                }
            });

            if (downloadLinks.length > 0) {
                // Sort by quality: prioritize HD
                const qualityScore = { '1080p': 100, '720p': 80, 'hd': 70, '480p': 50, '360p': 40, 'sd': 20 };
                downloadLinks.sort((a, b) => {
                    const scoreA = qualityScore[a.quality?.toLowerCase()] || 0;
                    const scoreB = qualityScore[b.quality?.toLowerCase()] || 0;
                    return scoreB - scoreA;
                });

                console.log('[FBDL] Found download links, best quality:', downloadLinks[0].quality);
                return {
                    success: true,
                    quality: downloadLinks[0].quality,
                    url: downloadLinks[0].url,
                    title: 'Facebook Video',
                    duration: 'Unknown'
                };
            }
        }

        return { success: false, error: 'No video found' };

    } catch (error) {
        console.error('[FBDL] Error:', error.message);
        return { success: false, error: error.message };
    }
}
