import axios from 'axios';
import * as cheerio from 'cheerio';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // Cek input url
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.instagram.com/p/ByxKbUSnubS/`
    
    // Memberitahu user sedang diproses
    m.reply('Sedang memproses, mohon tunggu...')

    try {
        let url = args[0]
        let data;

        // COBA SCRAPER 1 (dlpanda)
        try {
            data = await dlpanda(url)
        } catch (e) {
            console.log(`DLPanda scraper failed: ${e.message}`)
        }

        // Validasi data hasil scrape
        if (!data || !data.success) throw data?.error || 'Tidak ada data yang ditemukan.'
        
        // Normalisasi hasil output
        let results = []
        
        if (data.data && Array.isArray(data.data)) {
            results = data.data
        } else if (data.medias && data.medias.length > 0) {
            results = data.medias
        } else if (data.url) {
            results = [{ url: data.url, extension: data.extension || 'mp4', type: 'video' }]
        } else {
            results = Object.values(data).filter(v => v && typeof v === 'object' && v.url)
        }

        if (results.length === 0) throw 'Konten tidak ditemukan atau url bersifat privat.'

        // Filter duplikat URL
        const seen = new Set();
        const filteredResults = [];

        for (let item of results) {
            let itemUrl = item.url || item;
            
            if (typeof itemUrl === 'string' && !seen.has(itemUrl)) {
                // Skip audio files
                if (!itemUrl.includes('.m4a')) { 
                    filteredResults.push({
                        url: itemUrl,
                        type: item.type || (itemUrl.includes('.mp4') ? 'video' : 'image')
                    });
                    seen.add(itemUrl);
                }
            }
        }

        // Kirim hasil ke chat
        const limitnya = 10; // Batasi jumlah file
        
        for (let i = 0; i < Math.min(limitnya, filteredResults.length); i++) {
            let fileUrl = filteredResults[i].url
            let fileType = filteredResults[i].type === 'video' ? '🎥 Video' : '🖼️ Foto'
            
            // Delay biar ga spam
            if (i > 0) await sleep(150);

            await conn.sendFile(
                m.chat, 
                fileUrl, 
                null, 
                `*Instagram Downloader*\n${fileType} (${i + 1}/${Math.min(limitnya, filteredResults.length)})`, 
                m
            )
        }

    } catch (e) {
        console.error(e)
        m.reply(`❌ Terjadi kesalahan: ${e}`)
    }
}

handler.help = ['instagram', 'ig'].map(v => v + ' <url>')
handler.tags = ['downloader']
handler.command = /^(ig|instagram|igdl|instagramdl|igstory)$/i
handler.limit = true

export default handler

// ========== SCRAPER FUNCTIONS ==========

async function dlpanda(instagramUrl) {
    const BASE_URL = 'https://dlpanda.com/id';
    
    try {
        // Step 1: Get token
        const response1 = await axios.get(BASE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 15000
        });

        const $1 = cheerio.load(response1.data);
        const token = $1('#token').val() || $1('input[name="token"]').val();

        // Step 2: Submit Instagram URL
        const params = new URLSearchParams({ url: instagramUrl });
        if (token) params.append('token', token);
        
        const targetUrl = `${BASE_URL}?${params.toString()}`;
        
        const response2 = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            },
            maxRedirects: 5,
            timeout: 15000
        });

        const $2 = cheerio.load(response2.data);
        const downloadLinks = new Set();
        
        // Extract dari attributes
        $2('a, button').each((_, el) => {
            let href = $2(el).attr('href') || $2(el).attr('onclick');
            
            if (href) {
                if (href.includes('downloadFile') || href.includes('window.open')) {
                    const match = href.match(/['"](https?:\/\/[^'"]+)['"]/);
                    if (match) href = match[1];
                }
                
                href = href.replace(/&amp;/g, '&');
                
                if (href.includes('cdninstagram.com') || 
                    href.includes('.mp4') || 
                    href.includes('.jpg') ||
                    href.includes('pass.work.ink')) {
                    downloadLinks.add(href);
                }
            }
        });

        // Extract dari script tags
        $2('script').each((_, el) => {
            const scriptContent = $2(el).html();
            if (scriptContent) {
                const videoMatch = scriptContent.match(/videoUrl\s*=\s*["']([^"']+)["']/);
                if (videoMatch) {
                    downloadLinks.add(videoMatch[1].replace(/&amp;/g, '&'));
                }
                
                const cdnMatches = scriptContent.matchAll(/https:\/\/[^"'\s]*cdninstagram\.com[^"'\s]*/g);
                for (const match of cdnMatches) {
                    downloadLinks.add(match[0].replace(/&amp;/g, '&'));
                }
            }
        });

        // Resolve redirects
        const finalLinks = [];
        
        for (const link of downloadLinks) {
            if (link.includes('pass.work.ink')) {
                try {
                    const { data } = await axios.get(link, {
                        params: {
                            fingerprint: `ig-${Date.now()}`,
                            adblockerInstalled: 0,
                            base64: 1,
                            json: 1
                        },
                        timeout: 10000
                    });
                    
                    if (data && data.to) {
                        finalLinks.push(data.to);
                    } else {
                        finalLinks.push(link);
                    }
                } catch {
                    finalLinks.push(link);
                }
            } else {
                finalLinks.push(link);
            }
        }

        const uniqueLinks = [...new Set(finalLinks)];

        if (uniqueLinks.length > 0) {
            return {
                success: true,
                data: uniqueLinks.map(url => ({
                    url,
                    type: url.includes('.mp4') ? 'video' : 'image'
                }))
            };
        } else {
            throw new Error('No download links found');
        }

    } catch (error) {
        throw new Error(`DLPanda failed: ${error.message}`);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}