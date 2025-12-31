import axios from 'axios';
import * as cheerio from 'cheerio';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // Cek input url
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.instagram.com/p/ByxKbUSnubS/`
    
    // Memberitahu user sedang diproses
    await m.reply('🔍 Sedang memproses, mohon tunggu...')

    try {
        let url = args[0]
        let debugLog = []
        let data;

        // SCRAPER DLPanda
        try {
            debugLog.push('📡 Trying DLPanda scraper...')
            await m.reply(debugLog.join('\n'))
            
            data = await dlpanda(url, debugLog, m)
            
            debugLog.push('✅ DLPanda success!')
            await m.reply(debugLog.join('\n'))
        } catch (e) {
            debugLog.push(`❌ DLPanda failed: ${e.message}`)
            await m.reply(debugLog.join('\n'))
            throw 'Scraper gagal mengambil data. Coba lagi nanti.'
        }

        // Validasi data hasil scrape
        if (!data || !data.success) {
            debugLog.push(`❌ Data validation failed: ${data?.error || 'No data'}`)
            await m.reply(debugLog.join('\n'))
            throw data?.error || 'Tidak ada data yang ditemukan.'
        }
        
        debugLog.push(`📦 Data received: ${JSON.stringify(data).substring(0, 200)}...`)
        await m.reply(debugLog.join('\n'))
        
        // Normalisasi hasil output
        let results = []
        
        if (data.data && Array.isArray(data.data)) {
            results = data.data
            debugLog.push(`✓ Using data.data array (${results.length} items)`)
        } else if (data.url) {
            results = [{ url: data.url, extension: data.extension || 'mp4', type: 'video' }]
            debugLog.push(`✓ Using single data.url`)
        } else {
            results = Object.values(data).filter(v => v && typeof v === 'object' && v.url)
            debugLog.push(`✓ Extracted from object values (${results.length} items)`)
        }

        await m.reply(debugLog.join('\n'))

        if (results.length === 0) {
            debugLog.push('❌ No results after normalization')
            await m.reply(debugLog.join('\n'))
            throw 'Konten tidak ditemukan atau url bersifat privat.'
        }

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

        debugLog.push(`✓ Filtered results: ${filteredResults.length} unique files`)
        await m.reply(debugLog.join('\n'))

        // Kirim hasil ke chat
        const limitnya = 10;
        
        debugLog.push(`📤 Sending ${Math.min(limitnya, filteredResults.length)} files...`)
        await m.reply(debugLog.join('\n'))
        
        for (let i = 0; i < Math.min(limitnya, filteredResults.length); i++) {
            let fileUrl = filteredResults[i].url
            let fileType = filteredResults[i].type === 'video' ? '🎥 Video' : '🖼️ Foto'
            
            debugLog.push(`📤 Sending file ${i + 1}: ${fileType}`)
            await m.reply(debugLog.join('\n'))
            
            // Delay biar ga spam
            if (i > 0) await sleep(150);

            try {
                await conn.sendFile(
                    m.chat, 
                    fileUrl, 
                    null, 
                    `*Instagram Downloader*\n${fileType} (${i + 1}/${Math.min(limitnya, filteredResults.length)})`, 
                    m
                )
                debugLog.push(`✅ File ${i + 1} sent successfully`)
            } catch (sendErr) {
                debugLog.push(`❌ Failed to send file ${i + 1}: ${sendErr.message}`)
                await m.reply(debugLog.join('\n'))
            }
        }

        debugLog.push('✅ Process completed!')
        await m.reply(debugLog.join('\n'))

    } catch (e) {
        console.error('MAIN ERROR:', e)
        await m.reply(`❌ *Error Terjadi:*\n${e}\n\n*Debug Info:*\nCheck console for details`)
    }
}

handler.help = ['instagram', 'ig'].map(v => v + ' <url>')
handler.tags = ['downloader']
handler.command = /^(ig|instagram|igdl|instagramdl|igstory)$/i
handler.limit = true

export default handler

// ========== SCRAPER DLPANDA ==========

async function dlpanda(instagramUrl, debugLog = [], m = null) {
    const BASE_URL = 'https://dlpanda.com/id';
    
    try {
        debugLog.push('🌐 Step 1: Getting homepage...')
        if (m) await m.reply(debugLog.join('\n'))
        
        // Step 1: Get token dari homepage
        const response1 = await axios.get(BASE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 15000
        });

        debugLog.push(`✓ Homepage status: ${response1.status}`)
        if (m) await m.reply(debugLog.join('\n'))

        const $1 = cheerio.load(response1.data);
        const token = $1('#token').val() || $1('input[name="token"]').val();
        
        debugLog.push(`✓ Token found: ${token ? 'YES' : 'NO'}`)
        if (token) debugLog.push(`  Token value: ${token.substring(0, 20)}...`)
        if (m) await m.reply(debugLog.join('\n'))

        // Step 2: Submit Instagram URL
        const params = new URLSearchParams({ url: instagramUrl });
        if (token) params.append('token', token);
        
        const targetUrl = `${BASE_URL}?${params.toString()}`;
        
        debugLog.push(`🌐 Step 2: Submitting URL...`)
        debugLog.push(`  Target: ${targetUrl.substring(0, 80)}...`)
        if (m) await m.reply(debugLog.join('\n'))
        
        const response2 = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': BASE_URL
            },
            maxRedirects: 5,
            timeout: 15000
        });

        debugLog.push(`✓ Submit status: ${response2.status}`)
        if (m) await m.reply(debugLog.join('\n'))

        const $2 = cheerio.load(response2.data);
        const downloadLinks = new Set();
        
        debugLog.push('🔍 Step 3: Extracting links...')
        if (m) await m.reply(debugLog.join('\n'))
        
        // Extract dari <a> tags
        let linkCount = 0;
        $2('a').each((_, el) => {
            let href = $2(el).attr('href');
            
            if (href) {
                href = href.replace(/&amp;/g, '&');
                
                if (
                    href.includes('cdninstagram.com') || 
                    href.includes('.mp4') || 
                    href.includes('.jpg') ||
                    href.includes('.jpeg') ||
                    href.includes('pass.work.ink')
                ) {
                    if (!href.includes('/article/')) {
                        if (href.startsWith('//')) href = 'https:' + href;
                        downloadLinks.add(href);
                        linkCount++;
                    }
                }
            }
        });

        debugLog.push(`✓ Found ${linkCount} links from <a> tags`)
        if (m) await m.reply(debugLog.join('\n'))

        // Extract dari script tags
        let scriptCount = 0;
        $2('script').each((_, el) => {
            const scriptContent = $2(el).html();
            if (scriptContent) {
                const videoMatch = scriptContent.match(/videoUrl\s*=\s*["']([^"']+)["']/);
                if (videoMatch) {
                    let url = videoMatch[1].replace(/&amp;/g, '&');
                    downloadLinks.add(url);
                    scriptCount++;
                }
                
                const cdnMatches = scriptContent.matchAll(/https:\/\/[^"'\s]*cdninstagram\.com[^"'\s]*/g);
                for (const match of cdnMatches) {
                    downloadLinks.add(match[0].replace(/&amp;/g, '&'));
                    scriptCount++;
                }
            }
        });

        debugLog.push(`✓ Found ${scriptCount} links from <script> tags`)
        debugLog.push(`✓ Total unique links: ${downloadLinks.size}`)
        if (m) await m.reply(debugLog.join('\n'))

        if (downloadLinks.size === 0) {
            debugLog.push('❌ No download links found in HTML')
            if (m) await m.reply(debugLog.join('\n'))
            
            // Debug: tampilkan sebagian HTML
            const bodyText = $2('body').text().substring(0, 200);
            debugLog.push(`📄 Body preview: ${bodyText}...`)
            if (m) await m.reply(debugLog.join('\n'))
            
            throw new Error('No download links found');
        }

        // Step 4: Resolve redirects
        debugLog.push('🔄 Step 4: Resolving redirects...')
        if (m) await m.reply(debugLog.join('\n'))
        
        const finalLinks = [];
        let redirectCount = 0;
        
        for (const link of downloadLinks) {
            if (link.includes('pass.work.ink')) {
                try {
                    debugLog.push(`  Resolving: ${link.substring(0, 60)}...`)
                    if (m) await m.reply(debugLog.join('\n'))
                    
                    const { data } = await axios.get(link, {
                        params: {
                            fingerprint: `ig-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                            adblockerInstalled: 0,
                            base64: 1,
                            json: 1
                        },
                        timeout: 10000
                    });
                    
                    if (data && data.to) {
                        finalLinks.push(data.to);
                        redirectCount++;
                        debugLog.push(`  ✓ Resolved to: ${data.to.substring(0, 60)}...`)
                    } else {
                        finalLinks.push(link);
                        debugLog.push(`  ⚠️ No redirect data, using original`)
                    }
                    if (m) await m.reply(debugLog.join('\n'))
                } catch (err) {
                    debugLog.push(`  ❌ Redirect failed: ${err.message}`)
                    finalLinks.push(link);
                    if (m) await m.reply(debugLog.join('\n'))
                }
            } else {
                finalLinks.push(link);
            }
        }

        debugLog.push(`✓ Resolved ${redirectCount} redirects`)
        if (m) await m.reply(debugLog.join('\n'))

        const uniqueLinks = [...new Set(finalLinks)];

        debugLog.push(`✅ Final unique links: ${uniqueLinks.length}`)
        uniqueLinks.forEach((link, i) => {
            const type = link.includes('.mp4') ? 'VIDEO' : 'IMAGE';
            debugLog.push(`  ${i + 1}. [${type}] ${link.substring(0, 60)}...`)
        })
        if (m) await m.reply(debugLog.join('\n'))

        if (uniqueLinks.length > 0) {
            return {
                success: true,
                data: uniqueLinks.map(url => ({
                    url,
                    type: url.includes('.mp4') ? 'video' : 'image'
                }))
            };
        }
        
        throw new Error('No final links after processing');

    } catch (error) {
        debugLog.push(`❌ DLPanda Error: ${error.message}`)
        if (error.response) {
            debugLog.push(`  HTTP Status: ${error.response.status}`)
            debugLog.push(`  Response: ${JSON.stringify(error.response.data).substring(0, 100)}`)
        }
        if (m) await m.reply(debugLog.join('\n'))
        
        throw error;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}