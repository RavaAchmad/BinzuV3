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
// SNAPVID AJAX - DEFENSIVE APPROACH
// ============================================================

async function fetchSnapVidAjax(fbUrl) {
    const endpoint = 'https://snapvid.net/api/ajaxSearch';
    
    const headers = {
        'Accept': '*/*',
        'accept-encoding': 'gzip, deflate, br',
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
            redirect: 'follow',
            compress: true,
            timeout: 30000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const json = await response.json();
        
        // ✅ DEFENSIVE VALIDATION (bukan expect struktur fix)
        // Yang penting ada data string, apapun field lainnya
        if (!json || typeof json.data !== 'string') {
            // Coba field alternatif
            if (json.msg && typeof json.msg === 'string') {
                return { success: true, data: json.msg };
            }
            if (json.html && typeof json.html === 'string') {
                return { success: true, data: json.html };
            }
            
            throw new Error('SnapVid response has no HTML data');
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
// HTML PARSER - CHAOS-READY
// ============================================================

/**
 * Parse HTML chaos dari SnapVid
 * Tiga layer parsing:
 * 1. Multi-regex patterns (cover berbagai format HTML)
 * 2. URL extraction fallback
 * 3. Emergency fbcdn.net scraper
 */
function parseSnapVidHTML(htmlString) {
    const results = [];
    
    // 🐛 DEBUG MODE (uncomment untuk investigasi)
    // fs.writeFileSync('/tmp/snapvid_debug.html', htmlString);
    // console.log('[DEBUG] HTML saved to /tmp/snapvid_debug.html');
    
    try {
        // ============================================================
        // PATTERN 1: Link dengan quality explicit
        // <a href="URL">Download 1080p</a>
        // <a href="URL">Render 720p (HD)</a>
        // ============================================================
        const pattern1 = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
        let match;
        
        while ((match = pattern1.exec(htmlString)) !== null) {
            const url = match[1];
            const linkText = match[2];
            
            // Skip invalid links
            if (!url || url === '#' || url.startsWith('javascript:')) continue;
            
            // Skip snapcdn token URLs (expire dalam 1 jam)
            if (url.includes('snapcdn.app') && url.includes('token=')) continue;
            
            // Extract quality dari text
            const qualityMatch = linkText.match(/(\d+p|HD|SD|Full\s*HD|1080|720|480|360)/i);
            const quality = qualityMatch ? qualityMatch[1].toUpperCase() : 'Unknown';
            
            // Detect type
            const isRender = linkText.toLowerCase().includes('render');
            const type = isRender ? 'render' : 'direct';
            
            results.push({
                quality: quality,
                type: type,
                videoUrl: url,
                audioUrl: null
            });
        }
        
        // ============================================================
        // PATTERN 2: Data attributes
        // <div data-url="VIDEO_URL" data-quality="1080p">
        // ============================================================
        const pattern2 = /data-url=["']([^"']+)["'][^>]*data-quality=["']([^"']+)["']/gi;
        
        while ((match = pattern2.exec(htmlString)) !== null) {
            const url = match[1];
            const quality = match[2];
            
            if (!url || url === '#') continue;
            if (url.includes('snapcdn.app') && url.includes('token=')) continue;
            
            results.push({
                quality: quality.toUpperCase(),
                type: 'direct',
                videoUrl: url,
                audioUrl: null
            });
        }
        
        // ============================================================
        // PATTERN 3: Quality dalam class + href
        // <a class="quality-720p" href="URL">
        // ============================================================
        const pattern3 = /<a[^>]*class=["'][^"']*quality[^"']*["'][^>]*href=["']([^"']+)["']/gi;
        
        while ((match = pattern3.exec(htmlString)) !== null) {
            const url = match[1];
            const fullMatch = match[0];
            
            if (!url || url === '#') continue;
            if (url.includes('snapcdn.app') && url.includes('token=')) continue;
            
            const qualityMatch = fullMatch.match(/quality[-_]?(\d+p)/i);
            const quality = qualityMatch ? qualityMatch[1].toUpperCase() : 'Unknown';
            
            results.push({
                quality: quality,
                type: 'direct',
                videoUrl: url,
                audioUrl: null
            });
        }
        
        // ============================================================
        // PATTERN 4: Pure URL extraction (last resort)
        // Ambil semua fbcdn.net URLs
        // ============================================================
        if (results.length === 0) {
            console.warn('[parseSnapVidHTML] No structured data found, using URL extraction');
            
            const urlPattern = /https?:\/\/[^\s"'<>]+fbcdn\.net[^\s"'<>]*/gi;
            const urls = htmlString.match(urlPattern) || [];
            
            urls.forEach(url => {
                // Try extract quality dari URL parameter
                let quality = 'Unknown';
                const qualityMatch = url.match(/(\d+p)|tag=dash[^&]*_(\d+p)/i);
                if (qualityMatch) {
                    quality = (qualityMatch[1] || qualityMatch[2]).toUpperCase();
                }
                
                results.push({
                    quality: quality,
                    type: 'direct',
                    videoUrl: url,
                    audioUrl: null
                });
            });
        }
        
        // ============================================================
        // DEDUPLICATION
        // ============================================================
        const seen = new Set();
        const unique = results.filter(item => {
            // Normalize URL untuk comparison (remove query params untuk dedupe)
            const baseUrl = item.videoUrl.split('?')[0];
            if (seen.has(baseUrl)) return false;
            seen.add(baseUrl);
            return true;
        });
        
        console.log(`[parseSnapVidHTML] Found ${unique.length} unique video URLs`);
        
        return unique;
        
    } catch (error) {
        console.error('[parseSnapVidHTML] Parse error:', error.message);
        
        // ============================================================
        // EMERGENCY FALLBACK: Brute force fbcdn URLs
        // ============================================================
        console.warn('[parseSnapVidHTML] Using emergency fallback parser');
        
        const fbcdnRegex = /https:\/\/video-[^"'\s<>]+fbcdn\.net[^"'\s<>]*/gi;
        const urls = htmlString.match(fbcdnRegex) || [];
        
        return urls.map(url => ({
            quality: 'Unknown',
            type: 'direct',
            videoUrl: url,
            audioUrl: null
        }));
    }
}

// ============================================================
// QUALITY SELECTOR - PRIORITY SCORING
// ============================================================

function selectBestQuality(videoArray) {
    if (!videoArray || videoArray.length === 0) {
        console.error('[selectBestQuality] Empty video array');
        return null;
    }
    
    // Filter valid URLs
    const valid = videoArray.filter(v => {
        if (!v.videoUrl) return false;
        
        // Skip snapcdn expired tokens
        if (v.videoUrl.includes('snapcdn.app') && v.videoUrl.includes('token=')) {
            console.warn('[selectBestQuality] Skipping snapcdn token URL');
            return false;
        }
        
        // Skip invalid protocols
        if (v.videoUrl.startsWith('javascript:') || v.videoUrl === '#') {
            return false;
        }
        
        return true;
    });
    
    if (valid.length === 0) {
        console.error('[selectBestQuality] No valid URLs after filtering');
        return null;
    }
    
    console.log(`[selectBestQuality] ${valid.length} valid URLs to score`);
    
    // Quality scoring
    const qualityMap = {
        '1080P': 100,
        '1080': 100,
        'FULL HD': 95,
        '720P': 80,
        '720': 80,
        'HD': 70,
        '480P': 60,
        '480': 60,
        '360P': 40,
        '360': 40,
        'SD': 30
    };
    
    const scored = valid.map(v => {
        let score = 0;
        
        // Quality score
        const qualityUpper = v.quality.toUpperCase().replace(/\s/g, '');
        for (const [key, value] of Object.entries(qualityMap)) {
            if (qualityUpper.includes(key)) {
                score += value;
                break;
            }
        }
        
        // Type bonus
        if (v.type === 'direct') {
            score += 50; // Direct download lebih baik dari render
        }
        
        // CDN bonus
        if (v.videoUrl.includes('fbcdn.net')) {
            score += 20; // Official Facebook CDN
        }
        
        // Penalty for unknown quality
        if (v.quality === 'Unknown') {
            score -= 10;
        }
        
        return { ...v, score };
    });
    
    // Sort descending
    scored.sort((a, b) => b.score - a.score);
    
    console.log('[selectBestQuality] Top 3 results:');
    scored.slice(0, 3).forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.quality} (${v.type}) - Score: ${v.score}`);
    });
    
    return scored[0];
}

// ============================================================
// CURL DOWNLOAD
// ============================================================

async function downloadWithCurl(url, outputFile, onProgress) {
    const curlCmd = [
        'curl',
        '-L',
        '-#',
        '--compressed',
        '--max-time', '300', // 5 min timeout
        '-H', `"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"`,
        '-H', `"Referer: https://www.facebook.com/"`,
        '-H', `"Accept: video/mp4,video/*,*/*"`,
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
// MAIN HANDLER
// ============================================================

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `Gunakan contoh ${usedPrefix}${command} https://fb.watch/xxx`;
    
    const statusMsg = await conn.sendMessage(m.chat, {
        text: '🔍 Mencari video...'
    });
    
    try {
        await conn.sendMessage(m.chat, {
            text: '🔍 Menghubungi SnapVid AJAX endpoint...',
            edit: statusMsg.key
        });
        
        // STEP 1: AJAX Request
        const ajaxResult = await fetchSnapVidAjax(args[0]);
        
        if (!ajaxResult.success) {
            throw new Error(`SnapVid AJAX failed: ${ajaxResult.error}`);
        }
        
        console.log(`[DEBUG] Received HTML length: ${ajaxResult.data.length} chars`);
        
        // STEP 2: Parse HTML chaos
        await conn.sendMessage(m.chat, {
            text: '🔍 Parsing HTML response...',
            edit: statusMsg.key
        });
        
        const videoList = parseSnapVidHTML(ajaxResult.data);
        
        if (videoList.length === 0) {
            // Save debug HTML
            const debugFile = path.join(tmpdir(), `snapvid_debug_${Date.now()}.html`);
            fs.writeFileSync(debugFile, ajaxResult.data);
            
            throw new Error(`No video URLs found in response. HTML structure might have changed. Debug saved to: ${debugFile}`);
        }
        
        console.log(`[DEBUG] Parsed ${videoList.length} video options`);
        
        // STEP 3: Select best
        const videoData = selectBestQuality(videoList);
        
        if (!videoData) {
            throw new Error('No valid video URL after quality filtering');
        }
        
        console.log(`[DEBUG] Selected: ${videoData.quality} (${videoData.type})`);
        
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
                    // Ignore
                }
            }
        });
        
        await conn.sendMessage(m.chat, {
            text: '✅ Download selesai!\n📤 Mengirim video...',
            edit: statusMsg.key
        });
        
        // STEP 5: Validate & Send
        if (!fs.existsSync(tempFile)) {
            throw new Error('File download tidak ditemukan');
        }
        
        const stats = fs.statSync(tempFile);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        if (fileSizeMB > 100) {
            fs.unlinkSync(tempFile);
            throw new Error(`Video terlalu besar (${fileSizeMB.toFixed(2)} MB). Max 100 MB.`);
        }
        
        if (fileSizeMB < 0.1) {
            fs.unlinkSync(tempFile);
            throw new Error(`File corrupt atau terlalu kecil (${fileSizeMB.toFixed(2)} MB)`);
        }
        
        const caption = [
            `*Facebook Downloader*`,
            ``,
            `🎬 Quality: ${videoData.quality}`,
            `📦 Size: ${fileSizeMB.toFixed(2)} MB`,
            `🔗 Source: SnapVid Direct AJAX`,
            `⚡ Type: ${videoData.type}`,
            ``,
            `✨ Download berhasil!`
        ].join('\n');
        
        await conn.sendFile(m.chat, tempFile, 'facebook_video.mp4', caption, m);
        
        await conn.sendMessage(m.chat, { delete: statusMsg.key });
        
        try {
            fs.unlinkSync(tempFile);
        } catch (e) {
            console.error('[Cleanup]', e);
        }
        
    } catch (error) {
        console.error('[Facebook Download Error]', error);
        
        let errorMessage = '❌ Gagal mengunduh video!\n\n';
        errorMessage += `${error.message}\n`;
        
        if (error.message.includes('HTML structure')) {
            errorMessage += '\n⚠️ CRITICAL: SnapVid mengubah struktur HTML\n';
            errorMessage += '🔧 Parser perlu update segera\n';
            errorMessage += '📁 Debug file tersimpan untuk investigasi';
        } else if (error.message.includes('AJAX failed')) {
            errorMessage += '\n⚠️ SnapVid endpoint tidak responsif\n';
            errorMessage += '💡 Coba lagi dalam beberapa menit';
        } else if (error.message.includes('curl')) {
            errorMessage += '\n🔧 Install curl: apt install curl';
        } else if (error.message.includes('No video URLs')) {
            errorMessage += '\n⚠️ Parsing gagal - HTML structure berubah\n';
            errorMessage += '🐛 Mode debug aktif, check console logs';
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

export default handler;