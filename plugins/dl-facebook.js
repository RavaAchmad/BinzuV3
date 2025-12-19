import fetch from 'node-fetch';
import { promisify } from 'util';
import { pipeline } from 'stream';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';

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
// SECONDARY: SnapVid Raw Text (OPTIONAL, SKIP IF FAILED)
// ============================================================

async function fetchSnapVidRaw(fbUrl) {
    const endpoint = 'https://snapvid.net/api/ajaxSearch';
    
    const headers = {
        'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': 'https://snapvid.net',
        'Referer': 'https://snapvid.net/en/facebook-downloader',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest'
    };
    
    const formData = new URLSearchParams({
        'q': fbUrl,
        'lang': 'en',
        'v': 'facebook',
        'cftoken': ''
    });
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: formData.toString(),
            timeout: 30000
        });
        
        if (!response.ok) return { success: false };
        
        const json = await response.json();
        const rawText = json.data || json.msg || json.html || '';
        
        if (!rawText) return { success: false };
        
        return {
            success: true,
            rawText: rawText
        };
        
    } catch (error) {
        console.error('[fetchSnapVidRaw] Error:', error.message);
        return { success: false };
    }
}

function extractSnapCdnUrls(rawText) {
    // Match: https://dl.snapcdn.app/download?token=...
    // OR: https://dl.snapcdn.app/get?token=...
    const regex = /https:\/\/dl\.snapcdn\.app\/(?:get|download)\?token=[A-Za-z0-9\-\._]+/g;
    const urls = [...new Set(rawText.match(regex) || [])];
    
    return urls;
}

function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
        return JSON.parse(payload);
    } catch (error) {
        return null;
    }
}

function parseSnapCdnUrls(urls) {
    const parsed = urls.map(downloadUrl => {
        const tokenMatch = downloadUrl.match(/token=([^&]+)/);
        if (!tokenMatch) return null;
        
        const token = tokenMatch[1];
        const payload = decodeJwtPayload(token);
        
        if (!payload) return null;
        
        // Extract quality dari filename
        const filename = payload.filename || '';
        const qualityMatch = filename.match(/_(\d{3,4}p)|(\d{3,4}p)/i);
        const quality = qualityMatch ? qualityMatch[1] || qualityMatch[2] : 'Unknown';
        
        return {
            downloadUrl: downloadUrl,
            directVideo: payload.url || '',
            quality: quality.toUpperCase(),
            filename: filename,
            exp: payload.exp || 0
        };
    }).filter(Boolean);
    
    // Sort by quality
    const qualityPriority = { '1080P': 100, '720P': 80, '480P': 60, '360P': 40 };
    parsed.sort((a, b) => {
        const scoreA = qualityPriority[a.quality] || 0;
        const scoreB = qualityPriority[b.quality] || 0;
        return scoreB - scoreA;
    });
    
    return parsed;
}

// ============================================================
// DOWNLOAD
// ============================================================

async function downloadWithCurl(url, outputFile, onProgress) {
    const curlCmd = [
        'curl',
        '-L',
        '-#',
        '--compressed',
        '--max-time', '300',
        '-H', `"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"`,
        '-H', `"Referer: https://www.facebook.com/"`,
        '-o', `"${outputFile}"`,
        `"${url}"`
    ].join(' ');
    
    return new Promise((resolve, reject) => {
        const child = exec(curlCmd);
        let lastProgress = 0;
        
        child.stderr.on('data', (data) => {
            const output = data.toString();
            const progressMatch = output.match(/(\d+\.\d+)%/);
            if (progressMatch) {
                const progress = parseFloat(progressMatch[1]);
                if (progress - lastProgress >= 5) {
                    lastProgress = progress;
                    onProgress(progress);
                }
            }
        });
        
        child.on('close', (code) => {
            code === 0 ? resolve(true) : reject(new Error(`Curl exit ${code}`));
        });
        
        child.on('error', (err) => reject(err));
    });
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
        // PRIMARY: API ikyiizyy.my.id
        // ============================================================
        await conn.sendMessage(m.chat, {
            text: '🔍 Mengambil dari API...',
            edit: statusMsg.key
        });
        
        const apiResult = await fetchFromAPI(args[0]);
        
        if (apiResult.success) {
            const videoData = selectBestVideoFromAPI(apiResult.data);
            
            if (videoData && videoData.url) {
                console.log('[PRIMARY] API berhasil:', videoData.quality);
                
                await conn.sendMessage(m.chat, {
                    text: `📹 Video ditemukan!\n\n📝 ${videoData.title}\n⏱️ ${videoData.duration}\n🎬 ${videoData.quality}\n⏬ Downloading...`,
                    edit: statusMsg.key
                });
                
                // Download
                const tempFile = path.join(tmpdir(), `fb_${Date.now()}.mp4`);
                let lastProgress = 0;
                
                await downloadWithCurl(videoData.url, tempFile, async (progress) => {
                    if (Math.floor(progress) - lastProgress >= 10) {
                        lastProgress = Math.floor(progress);
                        const bar = createProgressBar(progress);
                        
                        try {
                            await conn.sendMessage(m.chat, {
                                text: `⏬ Downloading...\n\n${bar}\n${progress.toFixed(1)}%\n\n🎬 ${videoData.quality}`,
                                edit: statusMsg.key
                            });
                        } catch (e) {}
                    }
                });
                
                // Validate & Send
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
            }
        }
        
        // ============================================================
        // SECONDARY: SnapVid (OPTIONAL)
        // ============================================================
        console.log('[SECONDARY] Trying SnapVid...');
        
        await conn.sendMessage(m.chat, {
            text: '🔍 Mencoba SnapVid...',
            edit: statusMsg.key
        });
        
        const snapResult = await fetchSnapVidRaw(args[0]);
        
        if (snapResult.success) {
            const snapUrls = extractSnapCdnUrls(snapResult.rawText);
            
            if (snapUrls.length > 0) {
                const parsed = parseSnapCdnUrls(snapUrls);
                
                if (parsed.length > 0) {
                    const best = parsed[0];
                    
                    console.log('[SECONDARY] SnapVid found:', best.quality);
                    
                    await conn.sendMessage(m.chat, {
                        text: `📹 Video (SnapVid)\n\n🎬 ${best.quality}\n⏬ Downloading...`,
                        edit: statusMsg.key
                    });
                    
                    const tempFile = path.join(tmpdir(), `fb_${Date.now()}.mp4`);
                    
                    // Try direct video URL first, fallback to download wrapper
                    const downloadUrl = best.directVideo || best.downloadUrl;
                    
                    await downloadWithCurl(downloadUrl, tempFile, async (progress) => {
                        if (Math.floor(progress) % 10 === 0) {
                            try {
                                await conn.sendMessage(m.chat, {
                                    text: `⏬ ${progress.toFixed(1)}%\n\n🎬 ${best.quality}`,
                                    edit: statusMsg.key
                                });
                            } catch (e) {}
                        }
                    });
                    
                    const stats = fs.statSync(tempFile);
                    const fileSizeMB = stats.size / (1024 * 1024);
                    
                    if (fileSizeMB > 0.1 && fileSizeMB < 100) {
                        await conn.sendFile(m.chat, tempFile, 'facebook_video.mp4', 
                            `*Facebook Downloader*\n\n🎬 ${best.quality}\n📦 ${fileSizeMB.toFixed(2)} MB\n\n✨ Success!`, m);
                        await conn.sendMessage(m.chat, { delete: statusMsg.key });
                        
                        try {
                            fs.unlinkSync(tempFile);
                        } catch (e) {}
                        
                        return; // SUCCESS
                    }
                }
            }
        }
        
        // ============================================================
        // TERTIARY: GIVE UP
        // ============================================================
        throw new Error('All methods failed. Video might be private or unavailable.');
        
    } catch (error) {
        console.error('[Handler Error]', error);
        
        let errorMessage = '❌ Gagal mengunduh video!\n\n';
        errorMessage += `${error.message}\n`;
        errorMessage += '\n💡 Kemungkinan:\n';
        errorMessage += '• Video private/terhapus\n';
        errorMessage += '• Link tidak valid\n';
        errorMessage += '• API sedang maintenance';
        
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