import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import axios from 'axios';
import sharp from 'sharp';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Proxy configuration
const PROXY_CONFIG = {
    host: '34.101.119.108',
    port: 3128,
    auth: {
        username: 'xmaze',
        password: 'xmpanel'
    }
};

// Create proxy agent
const proxyUrl = `http://${PROXY_CONFIG.auth.username}:${PROXY_CONFIG.auth.password}@${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;
const proxyAgent = new HttpsProxyAgent(proxyUrl);

var handler = async (m, { conn, text, command }) => {
    if (!text) return m.reply('Masukan text');
    
    try {
        await conn.sendMessage(m.chat, {
            react: { text: '⏳', key: m.key }
        });

        const emojis = text.match(/[\p{Emoji}\uFE0F-\uFFFF]/gu);
        let emojiText = emojis ? emojis.join('') : '';
        const maxTextLength = 151 - emojiText.length;
        let clippedText = text.substring(0, maxTextLength);

        // Generate based on command
        let imageBuffer;
        if (command === 'bratvid' || command === 'bratanimated') {
            imageBuffer = await generateBratAnimated(clippedText);
        } else {
            imageBuffer = await generateBratSticker(clippedText);
        }
        
        // Create and send sticker
        let stiker = await createSticker(imageBuffer, null, 'Brat Generator', 'XMCodes');
        await conn.sendFile(m.chat, stiker, '', '', m);
        
        await conn.sendMessage(m.chat, {
            react: { text: '✅', key: m.key }
        });
        
    } catch (e) {
        console.log(e);
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
 * Generate brat sticker with proxy support and detailed debugging
 * @param {string} text - Text to display
 * @returns {Promise<Buffer>} Image buffer
 */
export async function generateBratSticker(text) {
    const apiUrl = `https://api.ryzumi.vip/api/image/brat?text=${encodeURIComponent(text)}`;
    
    console.log('🔍 API Debug Info:');
    console.log('URL:', apiUrl);
    console.log('Proxy:', `${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`);
    console.log('Text:', text);
    
    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'accept': 'image/png,image/gif,*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://api.ryzumi.vip/',
                'Cache-Control': 'no-cache'
            },
            responseType: 'arraybuffer',
            timeout: 15000,
            httpAgent: proxyAgent,
            httpsAgent: proxyAgent,
            proxy: false,
            validateStatus: () => true // Accept all status codes
        });
        
        console.log('✓ Response Status:', response.status);
        console.log('✓ Response Headers:', response.headers);
        console.log('✓ Response Data Size:', response.data.length, 'bytes');
        
        if (response.status !== 200) {
            console.error('❌ API Error Status:', response.status);
            console.error('❌ Response Body:', response.data.toString());
            throw new Error(`API returned status ${response.status}`);
        }
        
        if (!response.data || response.data.length === 0) {
            throw new Error('API returned empty data');
        }
        
        const buffer = await sharp(response.data, { animated: false })
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png()
            .toBuffer();
        
        console.log('✓ Image processed successfully:', buffer.length, 'bytes');
        return buffer;
        
    } catch (error) {
        console.error('❌ API Request Failed:');
        console.error('Error Message:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
            console.error('Response Headers:', error.response.headers);
        }
        if (error.code) {
            console.error('Error Code:', error.code);
        }
        throw error;
    }
}

/**
 * Generate animated brat GIF
 * @param {string} text - Text to display
 * @returns {Promise<Buffer>} Animated GIF buffer
 */
export async function generateBratAnimated(text) {
    const apiUrl = `https://api.ryzumi.vip/api/image/brat/animated?text=${encodeURIComponent(text)}`;
    
    console.log('🎬 Animated API Debug Info:');
    console.log('URL:', apiUrl);
    console.log('Text:', text);
    
    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'accept': 'image/png,image/gif,*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://api.ryzumi.vip/',
                'Cache-Control': 'no-cache'
            },
            responseType: 'arraybuffer',
            timeout: 15000,
            httpAgent: proxyAgent,
            httpsAgent: proxyAgent,
            proxy: false,
            validateStatus: () => true
        });
        
        console.log('✓ Response Status:', response.status);
        console.log('✓ Response Data Size:', response.data.length, 'bytes');
        
        if (response.status !== 200) {
            console.error('❌ API Error Status:', response.status);
            throw new Error(`API returned status ${response.status}`);
        }
        
        if (!response.data || response.data.length === 0) {
            throw new Error('API returned empty data');
        }

        return Buffer.from(response.data);
        
    } catch (error) {
        console.error('❌ Animated API Request Failed:');
        console.error('Error Message:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
        throw error;
    }
}
