import path from 'path';
import { tmpdir } from 'os';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

// ============================================================
// ExistDownloader - SolutionExist Scraper
// ============================================================

class ExistDownloader {
    constructor() {
        this.baseUrl = 'https://download.solutionexist.com/';
    }

    prs(html) {
        const $ = cheerio.load(html);
        const title = $('h3.uvd-video-title').text().trim() || 'Facebook Video';
        const thumbEl = $('.uvd-thumbnail img').eq(0);
        const thumbUrl = thumbEl.attr('src') || thumbEl.attr('data-src') || null;
        const downloadLinks = $('#uvdDownloadGrid').find('.uvd-download-item a.uvd-download-btn').map((i, el) => {
            const em = $(el);
            const link = em.attr('href') || '#';
            const quality = em.find('span').text().trim() || 'Unknown';
            const type = link.endsWith('.mp4') ? 'Video (MP4)' : quality.toLowerCase().includes('audio') ? 'Audio' : 'File Lain';
            return { index: i, quality, url: link, type };
        }).get();
        return { title, thumb: thumbUrl, links: downloadLinks };
    }

    async download(videoUrl) {
        const reqHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'id-ID',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': this.baseUrl.slice(0, -1),
            'Referer': this.baseUrl,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        const postData = `uvd_video_url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.post(this.baseUrl, postData, {
            headers: reqHeaders,
            timeout: 30000
        });
        return this.prs(response.data);
    }
}

function selectBestLink(links) {
    if (!links || links.length === 0) return null;
    const videoLinks = links.filter(l => l.url && l.url !== '#' && l.type === 'Video (MP4)');
    if (videoLinks.length === 0) return links.find(l => l.url && l.url !== '#') || null;
    const qualityScore = { '1080p': 100, '720p': 80, 'hd': 70, '480p': 50, '360p': 40, 'sd': 20 };
    videoLinks.sort((a, b) => {
        const scoreA = qualityScore[a.quality?.toLowerCase()] || 0;
        const scoreB = qualityScore[b.quality?.toLowerCase()] || 0;
        return scoreB - scoreA;
    });
    return videoLinks[0];
}

// ============================================================
// DOWNLOAD WITH PROGRESS
// ============================================================

async function downloadWithProgress(url, outputFile, conn, m, statusMsg, quality) {
    let lastUpdate = 0;

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
        if (!totalLength) return;
        const progress = (downloadedLength / totalLength) * 100;
        if (progress - lastUpdate >= 5) {
            lastUpdate = Math.floor(progress / 5) * 5;
            const filled = Math.floor(progress / 5);
            const empty = 20 - filled;
            const bar = `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
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
}

// ============================================================
// MAIN HANDLER
// ============================================================

const downloader = new ExistDownloader();

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `Gunakan contoh ${usedPrefix}${command} https://fb.watch/xxx`;

    const statusMsg = await conn.sendMessage(m.chat, {
        text: '🔍 Mencari video...'
    });

    try {
        await conn.sendMessage(m.chat, {
            text: '🔍 Memeriksa url valid atau tidak...',
            edit: statusMsg.key
        });

        console.log('[FB-DL] Fetching video info...');
        const result = await downloader.download(args[0]);

        if (!result.links || result.links.length === 0) {
            throw new Error('Tidak ditemukan link download dari video tersebut.');
        }

        const best = selectBestLink(result.links);
        if (!best || !best.url || best.url === '#') {
            throw new Error('Link download tidak valid.');
        }

        console.log('[FB-DL] Best quality:', best.quality);

        await conn.sendMessage(m.chat, {
            text: `📹 Video ditemukan!\n\n📝 ${result.title}\n🎬 ${best.quality}\n⏬ Downloading...`,
            edit: statusMsg.key
        });

        const tempFile = path.join(tmpdir(), `fb_${Date.now()}.mp4`);

        try {
            await downloadWithProgress(best.url, tempFile, conn, m, statusMsg, best.quality);

            if (!fs.existsSync(tempFile)) {
                throw new Error('Download failed');
            }

            const stats = fs.statSync(tempFile);
            const fileSizeMB = stats.size / (1024 * 1024);

            if (fileSizeMB > 100) {
                fs.unlinkSync(tempFile);
                throw new Error(`Video terlalu besar (${fileSizeMB.toFixed(2)} MB)`);
            }

            if (fileSizeMB < 0.01) {
                fs.unlinkSync(tempFile);
                throw new Error(`File corrupt (${fileSizeMB.toFixed(2)} MB)`);
            }

            const caption = [
                `*Facebook Downloader*`,
                ``,
                `📝 ${result.title}`,
                `🎬 ${best.quality}`,
                `📦 ${fileSizeMB.toFixed(2)} MB`,
                ``,
                `✨ Success!`
            ].join('\n');

            await conn.sendFile(m.chat, tempFile, 'facebook_video.mp4', caption, m);
            await conn.sendMessage(m.chat, { delete: statusMsg.key });

            try { fs.unlinkSync(tempFile); } catch (e) {}
            return;
        } catch (downloadErr) {
            try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) {}
            throw downloadErr;
        }

    } catch (error) {
        console.error('[FB-DL Error]', error);

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
