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

        // Step 2: Submit Instagram URL
        const params = new URLSearchParams({ 
            'ig-sessionid': '',
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
        
        console.log('🔍 Step 3: Extracting links...')
        
        // Method 1: Cari semua script tags
        let allScripts = [];
        $2('script').each((_, el) => {
            const scriptContent = $2(el).html();
            if (scriptContent) {
                allScripts.push(scriptContent);
            }
        });
        
        console.log('✓ Found', allScripts.length, 'script tags')
        
        // Gabungkan semua script jadi satu string
        const fullScript = allScripts.join('\n');
        
        // Method 2: Multiple regex patterns untuk extract URL
        const patterns = [
            // Pattern 1: videoUrl = "..."
            /videoUrl\s*=\s*["']([^"']+)["']/g,
            // Pattern 2: var videoUrl = "..."
            /var\s+videoUrl\s*=\s*["']([^"']+)["']/g,
            // Pattern 3: window.open("...")
            /window\.open\s*\(\s*["']([^"']+)["']/g,
            // Pattern 4: downloadFile("...")
            /downloadFile\s*\(\s*["']([^"']+)["']/g,
            // Pattern 5: Direct CDN Instagram URLs
            /https:\/\/scontent[^"'\s]*/g,
            // Pattern 6: Any cdninstagram.com URL
            /https:\/\/[^"'\s]*cdninstagram\.com[^"'\s]*/g,
            // Pattern 7: href dengan cdninstagram
            /href\s*=\s*["']([^"']*cdninstagram[^"']*)["']/g,
        ];
        
        console.log('🔍 Trying', patterns.length, 'regex patterns...')
        
        patterns.forEach((pattern, index) => {
            const matches = fullScript.matchAll(pattern);
            let count = 0;
            for (const match of matches) {
                let url = match[1] || match[0]; // match[1] untuk capture group, match[0] untuk full match
                url = url.replace(/&amp;/g, '&');
                
                // Filter valid URLs
                if (url.startsWith('http') && (
                    url.includes('cdninstagram.com') || 
                    url.includes('scontent') ||
                    url.includes('.mp4') || 
                    url.includes('.jpg')
                )) {
                    downloadLinks.add(url);
                    count++;
                }
            }
            if (count > 0) {
                console.log(`  ✓ Pattern ${index + 1} found ${count} URLs`)
            }
        });
        
        // Method 3: Cari di <a> tags
        console.log('🔍 Checking <a> tags...')
        let linkCount = 0;
        $2('a').each((_, el) => {
            let href = $2(el).attr('href');
            if (href) {
                href = href.replace(/&amp;/g, '&');
                if ((href.includes('cdninstagram.com') || href.includes('scontent') || href.includes('.mp4') || href.includes('.jpg')) && !href.includes('/article/')) {
                    if (href.startsWith('//')) href = 'https:' + href;
                    if (href.startsWith('http')) {
                        downloadLinks.add(href);
                        linkCount++;
                    }
                }
            }
            
            // Cek onclick attribute
            let onclick = $2(el).attr('onclick');
            if (onclick) {
                const onclickMatch = onclick.match(/["'](https?:\/\/[^"']+)["']/);
                if (onclickMatch) {
                    let url = onclickMatch[1].replace(/&amp;/g, '&');
                    if (url.includes('cdninstagram') || url.includes('scontent')) {
                        downloadLinks.add(url);
                        linkCount++;
                    }
                }
            }
        });
        
        if (linkCount > 0) {
            console.log('✓ Found', linkCount, 'links from <a> tags')
        }

        console.log('✓ Total unique links:', downloadLinks.size)

        if (downloadLinks.size === 0) {
            console.error('❌ No download links found')
            
            // FULL DEBUG: Print semua script content
            console.log('\n========== FULL SCRIPT DEBUG ==========')
            allScripts.forEach((script, i) => {
                if (script.length < 1000) { // Print scripts yang ga terlalu panjang
                    console.log(`\n--- Script ${i + 1} (${script.length} chars) ---`)
                    console.log(script)
                } else {
                    console.log(`\n--- Script ${i + 1} (${script.length} chars - truncated) ---`)
                    console.log(script.substring(0, 500) + '\n...\n' + script.substring(script.length - 500))
                }
            });
            console.log('\n========== END DEBUG ==========\n')
            
            // Print body text
            const bodyText = $2('body').text().replace(/\s+/g, ' ').substring(0, 500);
            console.log('📄 Body text:', bodyText + '...')
            
            throw new Error('No download links found');
        }

        const uniqueLinks = [...downloadLinks];

        console.log('✅ Final links:', uniqueLinks.length)
        uniqueLinks.forEach((link, i) => {
            const type = link.includes('.mp4') ? 'VIDEO' : 'IMAGE';
            console.log(`  ${i + 1}. [${type}]`, link.substring(0, 100) + '...')
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
        }
        
        throw error;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}