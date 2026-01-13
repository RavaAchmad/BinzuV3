import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import axios from 'axios';
import sharp from 'sharp';
import { chromium } from 'playwright';

var handler = async (m, { conn, text, command }) => {
    if (!text) return m.reply('Masukan text');
    
    try {
        await conn.sendMessage(m.chat, {
            react: { text: '⏳', key: m.key }
        });

        const emojis = text.match(/[\p{Emoji}\uFE0F-\uFFFF]/gu);
        let emojiText = emojis ? emojis.join('') : '';
        const maxTextLength = 100 - emojiText.length;
        let clippedText = text.substring(0, maxTextLength);

        // Generate brat using scraper
        let result = await generateBrat(clippedText);
        
        if (!result.success) {
            throw new Error(result.errors || 'Failed to generate brat');
        }

        // Process images
        for (let img of result.images) {
            let imageBuffer = img.buffer;
            
            // Process image if it came from buffer
            if (imageBuffer) {
                const buffer = await sharp(imageBuffer)
                    .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 255, g: 255, b: 255, alpha: 1 }
                    })
                    .png()
                    .toBuffer();

                let stiker = await createSticker(buffer, null, 'Brat Generator', 'XMCodes');
                await conn.sendFile(m.chat, stiker, '', '', m);
            } else if (img.image) {
                // If image URL provided
                const imageResponse = await axios.get(img.image, {
                    responseType: 'arraybuffer',
                    timeout: 15000
                });

                const buffer = await sharp(imageResponse.data)
                    .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 255, g: 255, b: 255, alpha: 1 }
                    })
                    .png()
                    .toBuffer();

                let stiker = await createSticker(buffer, null, 'Brat Generator', 'XMCodes');
                await conn.sendFile(m.chat, stiker, '', '', m);
            }
        }
        
        await conn.sendMessage(m.chat, {
            react: { text: '✅', key: m.key }
        });
        
    } catch (e) {
        console.error('Error:', e.message);
        await conn.sendMessage(m.chat, {
            react: { text: '❌', key: m.key }
        });
        m.reply('❌ Gagal membuat stiker: ' + e.message);
    }
}

handler.command = handler.help = ['brat', 'bratvid', 'bratanimated'];
handler.tags = ['sticker'];
handler.limit = true;
handler.register = true;

export default handler;

async function createSticker(img, url, packName, authorName, quality) {
    let stickerMetadata = {
        type: 'full',
        pack: packName || 'Brat Generator',
        author: authorName || 'XMCodes',
        quality: quality || 80
    };
    return (new Sticker(img ? img : url, stickerMetadata)).toBuffer();
}

/**
 * Generate brat using local playwright
 */
async function generateBrat(text) {
    let browser, page;
    const screenshotPath = `/tmp/brat-${Date.now()}.png`;
    
    try {
        if (!text) return { success: false, errors: "missing text input!" };
        
        console.log('📸 Launching local playwright...');
        
        browser = await chromium.launch({
            headless: true
        });
        
        const context = await browser.newContext({
            viewport: {
                width: 1920,
                height: 1080
            },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        // Block unnecessary resources
        await context.route('**/*', (route) => {
            const url = route.request().url();
            if (url.endsWith('.png') || url.endsWith('.jpg') || url.includes('google-analytics') || url.includes('analytics.js')) {
                return route.abort();
            }
            route.continue();
        });

        page = await context.newPage();
        
        console.log('✓ Opening bratgenerator.com...');
        await page.goto('https://www.bratgenerator.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        });

        // Accept cookies
        try {
            await page.click('#onetrust-accept-btn-handler', {
                timeout: 2000
            });
            console.log('✓ Cookies accepted');
        } catch {}

        // Setup theme
        await page.evaluate(() => setupTheme('white'));
        console.log('✓ Theme set to white');

        // Fill text and generate
        console.log('✓ Filling text:', text);
        await page.fill('#textInput', text);
        
        await page.waitForTimeout(1000); // Wait for render
        
        const overlay = page.locator('#textOverlay');
        console.log('✓ Taking screenshot...');
        
        await overlay.screenshot({
            path: screenshotPath,
            timeout: 3000
        });

        console.log('✓ Screenshot saved to:', screenshotPath);

        // Read the file
        const fs = await import('fs');
        const imageBuffer = fs.readFileSync(screenshotPath);

        await browser.close();
        
        console.log('✓ Image buffer size:', imageBuffer.length, 'bytes');

        return {
            success: true,
            images: [{
                filename: `brat-${Date.now()}.png`,
                buffer: imageBuffer
            }]
        };

    } catch (error) {
        console.error('❌ Playwright error:', error.message);
        if (browser) await browser.close();
        return {
            success: false,
            errors: error.message || error
        };
    }
}
