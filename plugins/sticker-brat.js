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
 * Generate brat using playwright scraper
 */
async function generateBrat(text) {
    try {
        if (!text) return { success: false, errors: "missing text input!" };
        
        const code = `
const {
  chromium
} = require('playwright');

const config = {
  maxTextLength: 100,
  viewport: {
    width: 1920,
    height: 1080
  },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let browser, page;

const utils = {
  async initialize() {
    if (!browser) {
      browser = await chromium.launch({
        headless: true
      });
      const context = await browser.newContext({
        viewport: config.viewport,
        userAgent: config.userAgent
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
        await page.click('#onetrust-accept-btn-handler', {
          timeout: 2000
        });
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
    const screenshot = await utils.generateBrat("${text}");
    console.log(screenshot);
    await utils.close();
  } catch (error) {
    console.error(error);
  }
})();
`;

        console.log('📸 Generating brat sticker using playwright...');
        
        const response = await axios.post(
            "https://try.playwright.tech/service/control/run",
            {
                language: "javascript",
                code: code
            },
            {
                headers: {
                    "content-type": "application/json",
                    "origin": "https://try.playwright.tech",
                    "referer": "https://try.playwright.tech/",
                },
                timeout: 30000
            }
        );

        const data = response.data;
        
        console.log('✓ Response status:', response.status);
        console.log('✓ Success:', data.success);
        
        if (!data.success) {
            console.error('❌ Failed to generate brat');
            return { success: false, errors: "failed generate brat" };
        }

        console.log('✓ Generated files:', data.files.length);
        
        return {
            success: true,
            images: data.files.map(d => ({
                filename: d.fileName,
                image: "https://try.playwright.tech" + d.publicURL
            }))
        };

    } catch (error) {
        console.error('❌ Scraper error:', error.message);
        return {
            success: false,
            errors: error.message || error
        };
    }
}
