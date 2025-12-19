import fetch from 'node-fetch';
import { promisify } from 'util';
import { pipeline } from 'stream';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { JSDOM } from 'jsdom';

const streamPipeline = promisify(pipeline);
const execPromise = promisify(exec);

// ============================================================
// SNAPVID AJAX CORE
// ============================================================

/**
 * AJAX request ke SnapVid endpoint
 * Returns: { success: boolean, data: string (HTML) }
 */
async function fetchSnapVidAjax(fbUrl) {
    const endpoint = 'https://snapvid.net/api/ajaxSearch';
    
    const headers = {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8,id;q=0.7',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'DNT': '1',
        'Origin': 'https://snapvid.net',
        'Referer': 'https://snapvid.net/en/facebook-downloader',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'sec-ch-ua': '"Chromium";v="143", "Not A;Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
    };
    
    // Build form data
    const formData = new URLSearchParams({
        'q': fbUrl,
        'lang': 'en',
        'v': 'facebook',
        'cftoken': '' // Empty or placeholder
    });
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: formData.toString(),
            redirect: 'follow',
            compress: true
        });
        
        if (!response.ok) {
            throw new Error(`SnapVid AJAX failed: ${response.status} ${response.statusText}`);
        }
        
        const json = await response.json();
        
        // Validate response structure
        if (!json.data || typeof json.data !== 'string') {
            throw new Error('Invalid SnapVid response structure');
        }
        
        return {
            success: true,
            data: json.data
        };
        
    } catch (error) {
        console.error('[fetchSnapVidAjax] Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================================
// HTML PARSER (CRITICAL SECTION)
// ============================================================

/**
 * Parse HTML dari SnapVid response
 * Returns: Array of { quality, type, videoUrl, audioUrl }
 * 
 * RAWAN ERROR:
 * - HTML structure berubah
 * - Class names berubah
 * - Attribute names berubah
 */
function parseSnapVidHTML(htmlString) {
    const results = [];
    
    try {
        const dom = new JSDOM(htmlString);
        const document = dom.window.document;
        
        // Find all download links/buttons
        // PATTERN 1: <a> tags dengan class download-link
        const downloadLinks = document.querySelectorAll('a.download-link, a[href*="fbcdn"], a[href*="video"]');
        
        downloadLinks.forEach(link => {
            const href = link.getAttribute('href');
            const text = link.textContent.trim().toLowerCase();
            
            // Skip invalid URLs
            if (!href || href === '#' || href === 'javascript:void(0)') return;
            
            // Extract quality dari text atau data attribute
            let quality = 'Unknown';
            const qualityMatch = text.match(/(\d+p)|(\d+x\d+)|(hd)|(sd)/i);
            if (qualityMatch) {
                quality = qualityMatch[0];
            }
            
            // Data attributes fallback
            if (link.hasAttribute('data-quality')) {
                quality = link.getAttribute('data-quality');
            }
            
            // Determine type: direct atau render
            let type = 'direct';
            if (text.includes('render') || link.classList.contains('render-required')) {
                type = 'render';
            }
            
            results.push({
                quality: quality,
                type: type,
                videoUrl: href,
                audioUrl: null
            });
        });
        
        // PATTERN 2: Render required dengan separate video + audio
        const renderSections = document.querySelectorAll('.render-section, .quality-item');
        
        renderSections.forEach(section => {
            const qualityEl = section.querySelector('.quality-label, .resolution');
            const videoLink = section.querySelector('a[data-type="video"], a[href*="video"]');
            const audioLink = section.querySelector('a[data-type="audio"], a[href*="audio"]');
            
            if (videoLink) {
                const quality = qualityEl ? qualityEl.textContent.trim() : 'Unknown';
                const videoUrl = videoLink.getAttribute('href');
                const audioUrl = audioLink ? audioLink.getAttribute('href') : null;
                
                results.push({
                    quality: quality,
                    type: 'render',
                    videoUrl: videoUrl,
                    audioUrl: audioUrl
                });
            }
        });
        
        // PATTERN 3: Regex fallback jika DOM parsing gagal
        if (results.length === 0) {
            console.warn('[parseSnapVidHTML] DOM parsing failed, using regex fallback');
            
            // Regex untuk extract URLs dari HTML string
            const urlRegex = /https?:\/\/[^"'\s<>]+(?:fbcdn|video)[^"'\s<>]*/gi;
            const urls = htmlString.match(urlRegex) || [];
            
            urls.forEach(url => {
                // Skip snapcdn token URLs (they expire)
                if (url.includes('snapcdn.app') && url.includes('token=')) {
                    return;
                }
                
                results.push({
                    quality: 'Unknown',
                    type: 'direct',
                    videoUrl: url,
                    audioUrl: null
                });
            });
        }
        
        // Filter duplicates
        const seen = new Set();
        const unique = results.filter(item => {
            const key = item.videoUrl;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        
        return unique;
        
    } catch (error) {
        console.error('[parseSnapVidHTML] Parse error:', error.message);
        
        // EMERGENCY FALLBACK: Pure regex
        return fallbackRegexParse(htmlString);
    }
}

/**
 * Emergency fallback parser using pure regex
 */
function fallbackRegexParse(htmlString) {
    const results = [];
    
    // Extract all video URLs
    const videoUrlRegex = /https:\/\/[^"'\s<>]*fbcdn\.net[^"'\s<>]*/gi;
    const videoUrls = htmlString.match(videoUrlRegex) || [];
    
    videoUrls.forEach(url => {
        // Skip snapcdn token URLs
        if (url.includes('snapcdn') || url.includes('token=')) return;
        
        // Try to extract quality from URL parameters
        let quality = 'Unknown';
        const qualityMatch = url.match(/(\d+p)|tag=dash[^&]*_(\d+p)/i);
        if (qualityMatch) {
            quality = qualityMatch[1] || qualityMatch[2];
        }
        
        results.push({
            quality: quality,
            type: 'direct',
            videoUrl: url,
            audioUrl: null
        });
    });
    
    return results;
}

// ============================================================
// QUALITY SELECTOR (PRIORITY LOGIC)
// ============================================================

/**
 * Select best quality based on priority rules:
 * 1. Direct download + highest quality
 * 2. Render required + highest quality
 * 3. Skip snapcdn tokens
 * 4. Fallback to any working URL
 */
function selectBestQuality(videoArray) {
    if (!videoArray || videoArray.length === 0) return null;
    
    // Filter out invalid URLs
    const valid = videoArray.filter(v => {
        if (!v.videoUrl) return false;
        
        // Skip snapcdn token URLs (they expire in 1 hour)
        if (v.videoUrl.includes('snapcdn.app') && v.videoUrl.includes('token=')) {
            return false;
        }
        
        // Skip javascript: and # links
        if (v.videoUrl.startsWith('javascript:') || v.videoUrl === '#') {
            return false;
        }
        
        return true;
    });
    
    if (valid.length === 0) return null;
    
    // Quality priority map
    const qualityPriority = {
        '1080p': 100,
        '720p': 80,
        'hd': 70,
        '480p': 60,
        '360p': 40,
        'sd': 30
    };
    
    // Score each video
    const scored = valid.map(v => {
        let score = 0;
        
        // Quality score
        const qualityLower = v.quality.toLowerCase();
        for (const [key, value] of Object.entries(qualityPriority)) {
            if (qualityLower.includes(key)) {
                score += value;
                break;
            }
        }
        
        // Type bonus (direct > render)
        if (v.type === 'direct') {
            score += 50;
        }
        
        // fbcdn.net bonus (official Facebook CDN)
        if (v.videoUrl.includes('fbcdn.net')) {
            score += 20;
        }
        
        return { ...v, score };
    });
    
    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0];
}

// ============================================================
// CURL DOWNLOAD (REUSE EXISTING)
// ============================================================

async function downloadWithCurl(url, outputFile, onProgress) {
    const curlCmd = [
        'curl',
        '-L',
        '-#',
        '--compressed',
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
            code === 0 ? resolve(true) : reject(new Error(`Curl exit code ${code}`));
        });
        
        child.on('error', (error) => {
            reject(new Error(`Curl error: ${error.message}`));
        });
    });
}

function createProgressBar(percentage) {
    const filled = Math.floor(percentage / 5);
    const empty = 20 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

// ============================================================
// MAIN HANDLER (INTEGRATED)
// ============================================================

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `Gunakan contoh ${usedPrefix}${command} https://fb.watch/xxx`;
    
    const statusMsg = await conn.sendMessage(m.chat, {
        text: '🔍 Mencari video...'
    });
    
    try {
        await conn.sendMessage(m.chat, {
            text: '🔍 Mengambil informasi video dari SnapVid...',
            edit: statusMsg.key
        });
        
        // STEP 1: AJAX Request
        const ajaxResult = await fetchSnapVidAjax(args[0]);
        
        if (!ajaxResult.success) {
            throw new Error(`SnapVid AJAX failed: ${ajaxResult.error}`);
        }
        
        // STEP 2: Parse HTML
        const videoList = parseSnapVidHTML(ajaxResult.data);
        
        if (videoList.length === 0) {
            throw new Error('No video URLs found in SnapVid response. HTML structure might have changed.');
        }
        
        console.log(`[DEBUG] Found ${videoList.length} video options:`, videoList);
        
        // STEP 3: Select best quality
        const videoData = selectBestQuality(videoList);
        
        if (!videoData) {
            throw new Error('No valid video URL available after filtering');
        }
        
        await conn.sendMessage(m.chat, {
            text: `📹 Video ditemukan!\n\n🎬 Quality: ${videoData.quality}\n📦 Type: ${videoData.type}\n⏬ Memulai download...`,
            edit: statusMsg.key
        });
        
        // STEP 4: Download
        const tempFile = path.join(tmpdir(), `fb_${Date.now()}.mp4`);
        let lastProgress = 0;
        
        await downloadWithCurl(videoData.videoUrl, tempFile, async (progress) => {
            if (Math.floor(progress) - lastProgress >= 10) {
                lastProgress = Math.floor(progress);
                const bar = createProgressBar(progress);
                
                try {
                    await conn.sendMessage(m.chat, {
                        text: `⏬ Mengunduh video...\n\n${bar}\n${progress.toFixed(1)}%\n\n🎬 ${videoData.quality}`,
                        edit: statusMsg.key
                    });
                } catch (e) {
                    // Ignore edit errors
                }
            }
        });
        
        await conn.sendMessage(m.chat, {
            text: '✅ Download selesai!\n📤 Mengirim video...',
            edit: statusMsg.key
        });
        
        // STEP 5: Validate & Send
        if (!fs.existsSync(tempFile)) {
            throw new Error('File download gagal');
        }
        
        const stats = fs.statSync(tempFile);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        if (fileSizeMB > 100) {
            fs.unlinkSync(tempFile);
            throw new Error(`Video terlalu besar (${fileSizeMB.toFixed(2)} MB). Max 100 MB.`);
        }
        
        if (fileSizeMB < 0.1) {
            fs.unlinkSync(tempFile);
            throw new Error(`File corrupt (${fileSizeMB.toFixed(2)} MB)`);
        }
        
        const caption = [
            `*Facebook Downloader*`,
            ``,
            `🎬 Quality: ${videoData.quality}`,
            `📦 Size: ${fileSizeMB.toFixed(2)} MB`,
            `🔗 Source: SnapVid Direct AJAX`,
            ``,
            `✨ Download berhasil!`
        ].join('\n');
        
        await conn.sendFile(m.chat, tempFile, 'facebook_video.mp4', caption, m);
        
        await conn.sendMessage(m.chat, { delete: statusMsg.key });
        
        try {
            fs.unlinkSync(tempFile);
        } catch (e) {
            console.error('Cleanup error:', e);
        }
        
    } catch (error) {
        console.error('[Facebook Download Error]', error);
        
        let errorMessage = '❌ Gagal mengunduh video!\n\n';
        errorMessage += `${error.message}\n`;
        
        if (error.message.includes('HTML structure')) {
            errorMessage += '\n⚠️ SnapVid mungkin mengubah struktur HTML.\n';
            errorMessage += '🔧 Parser perlu diupdate.';
        } else if (error.message.includes('AJAX failed')) {
            errorMessage += '\n⚠️ SnapVid endpoint tidak responsif.\n';
            errorMessage += '💡 Coba lagi atau gunakan API fallback.';
        } else if (error.message.includes('curl')) {
            errorMessage += '\n🔧 Install curl: apt install curl';
        }
        
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
handler.group = false;
handler.premium = false;
handler.owner = false;
handler.admin = false;
handler.botAdmin = false;
handler.fail = null;
handler.private = false;

export default handler;