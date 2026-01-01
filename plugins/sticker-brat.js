import { Sticker } from 'wa-sticker-formatter';
import sharp from 'sharp';

var handler = async (m, { conn, text, command }) => {
    if (!text) return m.reply('Masukan text');
    
    try {
        const emojis = text.match(/[\p{Emoji}\uFE0F-\uFFFF]/gu);
        let emojiText = emojis ? emojis.join('') : '';
        const maxTextLength = 151 - emojiText.length;
        let clippedText = text.substring(0, maxTextLength);

        // Generate brat sticker locally
        let imageBuffer = await generateBratSticker(clippedText, 512, 512);
        
        let stiker = await createSticker(imageBuffer, false, '', '');
        await conn.sendFile(m.chat, stiker, '', '', m);
        
    } catch (e) {
        console.log(e);
        m.reply('Gagal membuat stiker');
    }
}

handler.command = handler.help = ['brat'];
handler.tags = ['sticker'];
handler.limit = true;
handler.register = true;

export default handler;

async function createSticker(img, url, packName, authorName, quality) {
    let stickerMetadata = {
        type: 'full',
        pack: stickpack,
        author: stickauth,
        quality
    };
    return (new Sticker(img ? img : url, stickerMetadata)).toBuffer();
}


/**
 * Generate brat sticker with white background
 * @param {string} text - Text to display on sticker
 * @param {number} width - Image width (default: 512)
 * @param {number} height - Image height (default: 512)
 * @returns {Promise<Buffer>} Image buffer
 */
export async function generateBratSticker(text, width = 512, height = 512) {
    try {
        // Text configuration
        const fontSize = 48;
        const lineHeight = 60;
        const maxWidth = width - 80; // padding 40px each side
        
        // Word wrap function
        const wrapText = (text, maxWidth) => {
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            
            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                // Approximate width calculation (rough estimate)
                const estimatedWidth = testLine.length * (fontSize * 0.6);
                
                if (estimatedWidth <= maxWidth) {
                    currentLine = testLine;
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            }
            if (currentLine) lines.push(currentLine);
            
            return lines;
        };
        
        const lines = wrapText(text.toLowerCase(), maxWidth);
        const totalTextHeight = lines.length * lineHeight;
        const startY = (height - totalTextHeight) / 2 + fontSize;
        
        // Create SVG text
        let svgText = '';
        lines.forEach((line, index) => {
            const y = startY + (index * lineHeight);
            svgText += `<text x="50%" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#000000" style="filter: blur(0.5px);">${escapeXml(line)}</text>`;
        });
        
        // Create SVG
        const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#FFFFFF"/>
            ${svgText}
        </svg>
        `;
        
        // Convert SVG to PNG buffer using sharp
        const buffer = await sharp(Buffer.from(svg))
            .png()
            .toBuffer();
        
        return buffer;
        
    } catch (error) {
        console.error('Error generating brat sticker:', error);
        throw error;
    }
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Example usage:
// const buffer = await generateBratSticker('life is too short to argue just say KOCAK and move on');