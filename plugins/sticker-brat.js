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
 * Generate brat sticker with auto fallback and proxy support
 * @param {string} text - Text to display
 * @returns {Promise<Buffer>} Image buffer
 */
export async function generateBratSticker(text) {
    // Try API first (faster)
    try {
        const apiUrl = `https://api.ryzumi.vip/api/image/brat?text=${encodeURIComponent(text)}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'accept': 'image/png,image/gif,*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://api.ryzumi.vip/'
            },
            responseType: 'arraybuffer',
            timeout: 15000,
            httpAgent: proxyAgent,
            httpsAgent: proxyAgent,
            proxy: false // Disable axios default proxy, use agent instead
        });
        
        const buffer = await sharp(response.data, { animated: false })
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png()
            .toBuffer();
        
        return buffer;
        
    } catch (apiError) {
        console.log('API failed, trying fallback...', apiError.message);
        
        // Fallback to scraper
        try {
            return await generateBratStickerScrape(text);
        } catch (scrapeError) {
            console.error('Both methods failed:', scrapeError.message);
            throw new Error('Failed to generate brat sticker');
        }
    }
}

/**
 * Generate animated brat GIF
 * @param {string} text - Text to display
 * @returns {Promise<Buffer>} Animated GIF buffer
 */
export async function generateBratAnimated(text) {
    try {
        const apiUrl = `https://api.ryzumi.vip/api/image/brat/animated?text=${encodeURIComponent(text)}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'accept': 'image/png,image/gif,*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://api.ryzumi.vip/'
            },
            responseType: 'arraybuffer',
            timeout: 15000,
            httpAgent: proxyAgent,
            httpsAgent: proxyAgent,
            proxy: true
        });
        
        if (!response.data) {
            throw new Error('Failed to generate animated Brat GIF');
        }

        return Buffer.from(response.data);
        
    } catch (apiError) {
        console.error('Animated API failed:', apiError.message);
        throw new Error('Failed to generate animated brat sticker');
    }
}

/**
 * Scraper fallback with proxy
 */
async function generateBratStickerScrape(text) {
    const code = `
const { chromium } = require('playwright');
const config = {
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

let browser, page;

const utils = {
  async initialize() {
    if (!browser) {
      browser = await chromium.launch({ 
        headless: true,
        args: ['--proxy-server=${PROXY_CONFIG.host}:${PROXY_CONFIG.port}']
      });
      
      const context = await browser.newContext({
        viewport: config.viewport,
        userAgent: config.userAgent,
        httpCredentials: {
          username: '${PROXY_CONFIG.auth.username}',
          password: '${PROXY_CONFIG.auth.password}'
        }
      });
      
      await context.route('**/*', (route) => {
        const url = route.request().url();
        if (url.endsWith('.png') || url.endsWith('.jpg') || url.includes('google-analytics')) {
          return route.abort();
        }
        route.continue();
      });
      
      page = await context.newPage();
      await page.goto('https://www.bratgenerator.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      
      try {
        await page.click('#onetrust-accept-btn-handler', { timeout: 2000 });
      } catch {}
      
      await page.evaluate(() => setupTheme('white'));
    }
  },
  
  async generateBrat(text) {
    await this.initialize();
    await page.fill('#textInput', text);
    const overlay = page.locator('#textOverlay');
    return overlay.screenshot({
      timeout: 3000,
      path: "brat-" + Date.now() + ".png"
    });
  },
  
  async close() {
    if (browser) await browser.close();
  }
};

(async () => {
  try {
    await utils.initialize();
    await utils.generateBrat(${JSON.stringify(text)});
    await utils.close();
  } catch (error) {
    console.error(error);
  }
})();
`;

    const response = await axios.post(
        "https://try.playwright.tech/service/control/run",
        { language: "javascript", code },
        {
            headers: {
                "content-type": "application/json",
                "origin": "https://try.playwright.tech",
                "referer": "https://try.playwright.tech/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            timeout: 30000,
            httpAgent: proxyAgent,
            httpsAgent: proxyAgent,
            proxy: false
        }
    );

    if (!response.data.success) throw new Error("Scraper failed");

    const imageUrl = "https://try.playwright.tech" + response.data.files[0].publicURL;
    
    const imageResponse = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000,
        httpAgent: proxyAgent,
        httpsAgent: proxyAgent,
        proxy: false
    });
    
    return await sharp(imageResponse.data)
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();
}
