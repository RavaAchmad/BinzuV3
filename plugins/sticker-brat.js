import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import axios from 'axios';
import sharp from 'sharp';

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
 * Generate brat using Sawit API
 */
async function generateBrat(text) {
    try {
        if (!text) return { success: false, errors: "missing text input!" };
        
        console.log('📡 Calling Sawit API...');
        
        const response = await axios.get('https://api.sawit.biz.id/api/maker/brat', {
            params: { text },
            timeout: 15000
        });

        if (!response.data.status || !response.data.result?.url) {
            throw new Error('Invalid API response');
        }

        console.log('✓ Got image URL from API:', response.data.result.url);

        // Download image
        const imageResponse = await axios.get(response.data.result.url, {
            responseType: 'arraybuffer',
            timeout: 15000
        });

        console.log('✓ Image downloaded, size:', imageResponse.data.length, 'bytes');

        return {
            success: true,
            images: [{
                filename: `brat-${Date.now()}.png`,
                buffer: imageResponse.data
            }]
        };

    } catch (error) {
        console.error('❌ API error:', error.message);
        return {
            success: false,
            errors: error.message || error
        };
    }
}
