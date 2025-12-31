import axios from 'axios';
import * as cheerio from 'cheerio';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.instagram.com/p/ByxKbUSnubS/`
    
    await m.reply('🔍 Sedang memproses, mohon tunggu...')

    try {
        let url = args[0]
        console.log('📡 Starting Instagram download for:', url)
        
        let data;

        try {
            data = await dlpanda(url)
            console.log('✅ DLPanda success!')
        } catch (e) {
            console.error('❌ DLPanda failed:', e.message)
            throw 'Scraper gagal mengambil data. Coba lagi nanti.'
        }

        if (!data || !data.success) {
            console.error('❌ Data validation failed:', data?.error || 'No data')
            throw data?.error || 'Tidak ada data yang ditemukan.'
        }
        
        console.log('📦 Data received:', data.data.length, 'files')
        
        let results = data.data

        if (results.length === 0) {
            console.error('❌ No results found')
            throw 'Konten tidak ditemukan atau url bersifat privat.'
        }

        // Filter duplikat URL
        const seen = new Set();
        const filteredResults = [];

        for (let item of results) {
            let itemUrl = item.url || item;
            
            if (typeof itemUrl === 'string' && !seen.has(itemUrl)) {
                if (!itemUrl.includes('.m4a')) { 
                    filteredResults.push({
                        url: itemUrl,
                        type: item.type || (itemUrl.includes('.mp4') ? 'video' : 'image')
                    });
                    seen.add(itemUrl);
                }
            }
        }

        console.log('✓ Filtered results:', filteredResults.length, 'unique files')

        const limitnya = 10;
        console.log('📤 Sending', Math.min(limitnya, filteredResults.length), 'files...')
        
        for (let i = 0; i < Math.min(limitnya, filteredResults.length); i++) {
            let fileUrl = filteredResults[i].url
            let fileType = filteredResults[i].type === 'video' ? '🎥 Video' : '🖼️ Foto'
            
            console.log(`📤 Sending file ${i + 1}:`, fileType, fileUrl.substring(0, 80) + '...')
            
            if (i > 0) await sleep(150);

            try {
                await conn.sendFile(
                    m.chat, 
                    fileUrl, 
                    null, 
                    `*Instagram Downloader*\n${fileType} (${i + 1}/${Math.min(limitnya, filteredResults.length)})`, 
                    m
                )
                console.log(`✅ File ${i + 1} sent successfully`)
            } catch (sendErr) {
                console.error(`❌ Failed to send file ${i + 1}:`, sendErr.message)
            }
        }

        console.log('✅ Process completed!')
        await m.reply('✅ Semua file berhasil dikirim!')

    } catch (e) {
        console.error('❌ MAIN ERROR:', e)
        await m.reply(`❌ *Error Terjadi:*\n${e}`)
    }
}

handler.help = ['instagram', 'ig'].map(v => v + ' <url>')
handler.tags = ['downloader']
handler.command = /^(ig|instagram|igdl|instagramdl|igstory)$/i
handler.limit = true

export default handler

// ========== SCRAPER DLPANDA ==========

async function dlpanda(instagramUrl) {
    const BASE_URL = 'https://dlpanda.com/id';
    
    try {
        console.log('🌐 Step 1: Getting homepage...')
        
        // Step 1: Get token
        const response1 = await axios.get(BASE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 15000
        });

        console.log('✓ Homepage status:', response1.status)

        const $1 = cheerio.load(response1.data);
        const token = $1('#token').val() || $1('input[name="token"]').val();
        
        console.log('✓ Token found:', token ? 'YES' : 'NO')
        if (token) console.log('  Token value:', token.substring(0, 20) + '...')

        // Step 2: Submit Instagram URL (TANPA sessionid)
        const params = new URLSearchParams({ 
            'ig-sessionid': '',  // Kosong tapi tetap kirim
            url: instagramUrl 
        });
        if (token) params.append('token', token);
        
        const targetUrl = `${BASE_URL}?${params.toString()}`;
        
        console.log('🌐 Step 2: Submitting URL...')
        console.log('  Target:', targetUrl.substring(0, 100) + '...')
        
        const response2 = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            maxRedirects: 5,
            timeout: 15000
        });

        console.log('✓ Submit status:', response2.status)

        const $2 = cheerio.load(response2.data);
        const downloadLinks = new Set();
        
        console.log('🔍 Step 3: Extracting links from JavaScript...')
        
        // FOKUS: Extract dari script tags
        let scriptCount = 0;
        $2('script').each((_, el) => {
            const scriptContent = $2(el).html();
            if (scriptContent) {
                // Method 1: videoUrl variable (PALING PENTING!)
                const videoMatch = scriptContent.match(/videoUrl\s*=\s*["']([^"']+)["']/);
                if (videoMatch) {
                    let url = videoMatch[1].replace(/&amp;/g, '&');
                    downloadLinks.add(url);
                    scriptCount++;
                    console.log('  ✓ Found videoUrl:', url.substring(0, 80) + '...')
                }
                
                // Method 2: Direct CDN URLs
                const cdnMatches = scriptContent.matchAll(/https:\/\/[^"'\s]*cdninstagram\.com[^"'\s]*/g);
                for (const match of cdnMatches) {
                    let url = match[0].replace(/&amp;/g, '&');
                    downloadLinks.add(url);
                    scriptCount++;
                    console.log('  ✓ Found CDN URL:', url.substring(0, 80) + '...')
                }
                
                // Method 3: window.open atau downloadFile
                const onclickMatches = scriptContent.matchAll(/(?:window\.open|downloadFile)\s*\(\s*["']([^"']+)["']/g);
                for (const match of onclickMatches) {
                    let url = match[1].replace(/&amp;/g, '&');
                    if (url.includes('cdninstagram.com') || url.includes('.mp4') || url.includes('.jpg')) {
                        downloadLinks.add(url);
                        scriptCount++;
                        console.log('  ✓ Found onclick URL:', url.substring(0, 80) + '...')
                    }
                }
            }
        });

        console.log('✓ Found', scriptCount, 'links from <script> tags')
        
        // Backup: Cari di <a> tags juga
        let linkCount = 0;
        $2('a').each((_, el) => {
            let href = $2(el).attr('href');
            if (href && (href.includes('cdninstagram.com') || href.includes('.mp4') || href.includes('.jpg'))) {
                href = href.replace(/&amp;/g, '&');
                if (!href.includes('/article/')) {
                    if (href.startsWith('//')) href = 'https:' + href;
                    downloadLinks.add(href);
                    linkCount++;
                    console.log('  ✓ Found <a> href:', href.substring(0, 80) + '...')
                }
            }
        });

        if (linkCount > 0) {
            console.log('✓ Found', linkCount, 'links from <a> tags (backup)')
        }

        console.log('✓ Total unique links:', downloadLinks.size)

        if (downloadLinks.size === 0) {
            console.error('❌ No download links found')
            
            // Debug: Show script content
            let scriptPreview = '';
            $2('script').each((i, el) => {
                const content = $2(el).html();
                if (content && (content.includes('videoUrl') || content.includes('cdninstagram'))) {
                    scriptPreview = content.substring(0, 500);
                    return false; // break
                }
            });
            
            if (scriptPreview) {
                console.log('📄 Script preview:', scriptPreview + '...')
            } else {
                console.log('📄 No relevant scripts found')
                // Show body text untuk debug
                const bodyText = $2('body').text().substring(0, 300);
                console.log('📄 Body preview:', bodyText + '...')
            }
            
            throw new Error('No download links found in scripts');
        }

        const uniqueLinks = [...downloadLinks];

        console.log('✅ Final links:', uniqueLinks.length)
        uniqueLinks.forEach((link, i) => {
            const type = link.includes('.mp4') ? 'VIDEO' : 'IMAGE';
            console.log(`  ${i + 1}. [${type}]`, link)
        })

        return {
            success: true,
            data: uniqueLinks.map(url => ({
                url,
                type: url.includes('.mp4') ? 'video' : 'image'
            }))
        };

    } catch (error) {
        console.error('❌ DLPanda Error:', error.message)
        if (error.response) {
            console.error('  HTTP Status:', error.response.status)
            console.error('  Response data:', JSON.stringify(error.response.data).substring(0, 200))
        }
        
        throw error;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}