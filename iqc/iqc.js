//iqc.js (working 100%)
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import EmojiDbLib from 'emoji-db';
import emojiImageByBrand from './lib/emoji-image.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const emojiDb = new EmojiDbLib({ useDefaultDb: true });

/**
 * Copyright Hann Universe @2025
 * 
 * Thanks To LyoSu
 * 
 * Terima kasih atas LyoSu. Kami mengizinkan untuk ambil sebuah file Emoji dan lainnya terkecuali iqc.js
 * 
 * Terima kasih atas semua yang sudah memberi saran ke Saya (Hann Universe)
 * 
 * Kami menyediakan fitur baterai, operator, timebar, wifi, filter keburaman dan sebagai lainnya
 */

const emojiImageJson = emojiImageByBrand.apple;
const fallbackEmojiImageJson = emojiImageByBrand.google;

async function preloadEmojis(text) {
  const emojis = emojiDb.searchFromText({
    input: text,
    fixCodePoints: true
  });

  const emojiCache = new Map();
  const emojiLoadPromises = [];

  for (const emoji of emojis) {
    if (!emojiCache.has(emoji.found)) {
      emojiLoadPromises.push((async () => {
        try {
          let base64 = emojiImageJson[emoji.found];
          
          if (!base64) {
            base64 = fallbackEmojiImageJson[emoji.found];
          }
          
          if (base64) {
            const buffer = Buffer.from(base64, 'base64');
            const img = await loadImage(buffer);
            emojiCache.set(emoji.found, img);
            console.log('✓ Loaded emoji:', emoji.found);
          } else {
            console.log('✗ No image for emoji:', emoji.found, 'Code:', emoji.code);
          }
        } catch (err) {
          console.error('✗ Failed to load emoji:', emoji.found, err.message);
        }
      })());
    }
  }

  await Promise.all(emojiLoadPromises);
  
  console.log('Total emojis cached:', emojiCache.size, '/', emojis.length);
  
  return { emojis, emojiCache };
}

async function generateIQC(text, time, options = {}) {
  const width = 680;
  const height = 1100;
  
  const config = {
    baterai: options.baterai !== undefined ? options.baterai : [true, "100"],
    operator: options.operator !== undefined ? options.operator : true,
    timebar: options.timebar !== undefined ? options.timebar : true,
    wifi: options.wifi !== undefined ? options.wifi : true
  };
  
  const FONT_PATH = path.join(__dirname, 'assets', 'SFPRODISPLAYREGULAR.otf');
  GlobalFonts.registerFromPath(FONT_PATH, 'SFPRODISPLAYREGULAR');
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const { emojis, emojiCache } = await preloadEmojis(text);
  
  console.log('Detected emojis:', emojis);
  console.log('Emoji cache size:', emojiCache.size);
  console.log('Cached emojis:', Array.from(emojiCache.keys()));
  
  emojis.forEach(emoji => {
  console.log('Emoji found:', emoji.found, 'at offset:', emoji.offset, 'length:', emoji.length);
  console.log('Has image:', emojiCache.has(emoji.found));
});

  const BG_PATH = path.join(__dirname, 'assets', 'background.png');
  const backgroundImg = await loadImage(BG_PATH);
  
  const scale = 1.05; 
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;
  
  ctx.save();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  
  ctx.drawImage(backgroundImg, offsetX, offsetY, scaledWidth, scaledHeight);
  
  ctx.filter = 'blur(6px)';
  ctx.drawImage(backgroundImg, offsetX, offsetY, scaledWidth, scaledHeight);
  ctx.filter = 'none';
  
  ctx.restore();
  
  ctx.fillStyle = 'rgba(13, 13, 13, 0.7)';
  ctx.fillRect(0, 0, width, height);

const emojiMap = new Map();
for (const emoji of emojis) {
  emojiMap.set(emoji.offset, {
    code: emoji.found,
    length: emoji.length
  });
}

if (config.timebar || config.operator || config.baterai[0] || config.wifi) {
    const statusBarY = 30;

    if (config.timebar) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px SFPRODISPLAYREGULAR';
      ctx.fillText(time, 30, statusBarY);
    }

    let currentX = width - 30;
    ctx.textAlign = 'right';

        if (config.baterai[0]) {
  const drawBatteryWithText = (x, y, percentage) => {
    const batteryLevel = Math.min(100, Math.max(0, parseInt(percentage)));
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    const batteryWidth = 40;
    const batteryHeight = 24;
    const bodyRadius = 3.5;
    
    ctx.beginPath();
    ctx.moveTo(x - batteryWidth + bodyRadius, y - batteryHeight/2);
    ctx.lineTo(x - bodyRadius, y - batteryHeight/2);
    ctx.quadraticCurveTo(x, y - batteryHeight/2, x, y - batteryHeight/2 + bodyRadius);
    ctx.lineTo(x, y + batteryHeight/2 - bodyRadius);
    ctx.quadraticCurveTo(x, y + batteryHeight/2, x - bodyRadius, y + batteryHeight/2);
    ctx.lineTo(x - batteryWidth + bodyRadius, y + batteryHeight/2);
    ctx.quadraticCurveTo(x - batteryWidth, y + batteryHeight/2, x - batteryWidth, y + batteryHeight/2 - bodyRadius);
    ctx.lineTo(x - batteryWidth, y - batteryHeight/2 + bodyRadius);
    ctx.quadraticCurveTo(x - batteryWidth, y - batteryHeight/2, x - batteryWidth + bodyRadius, y - batteryHeight/2);
    ctx.closePath();
    ctx.stroke();
    
    const tipWidth = 3.5;
    const tipHeight = 13;
    const tipRadius = 1.75;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - tipHeight/2 + tipRadius);
    ctx.quadraticCurveTo(x, y - tipHeight/2, x + tipRadius, y - tipHeight/2);
    ctx.lineTo(x + tipWidth - tipRadius, y - tipHeight/2);
    ctx.quadraticCurveTo(x + tipWidth, y - tipHeight/2, x + tipWidth, y - tipHeight/2 + tipRadius);
    ctx.lineTo(x + tipWidth, y + tipHeight/2 - tipRadius);
    ctx.quadraticCurveTo(x + tipWidth, y + tipHeight/2, x + tipWidth - tipRadius, y + tipHeight/2);
    ctx.lineTo(x + tipRadius, y + tipHeight/2);
    ctx.quadraticCurveTo(x, y + tipHeight/2, x, y + tipHeight/2 - tipRadius);
    ctx.closePath();
    ctx.fill();
    
    const fillMargin = 3.5;
    const fillWidth = (batteryWidth - fillMargin * 2) * batteryLevel / 100;
    const fillHeight = batteryHeight - fillMargin * 2;
    const fillRadius = 2;
    
    ctx.fillStyle = batteryLevel <= 20 ? '#ff3b30' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - batteryWidth + fillMargin + fillRadius, y - fillHeight/2);
    ctx.lineTo(x - batteryWidth + fillMargin + fillWidth - fillRadius, y - fillHeight/2);
    ctx.quadraticCurveTo(x - batteryWidth + fillMargin + fillWidth, y - fillHeight/2, 
                         x - batteryWidth + fillMargin + fillWidth, y - fillHeight/2 + fillRadius);
    ctx.lineTo(x - batteryWidth + fillMargin + fillWidth, y + fillHeight/2 - fillRadius);
    ctx.quadraticCurveTo(x - batteryWidth + fillMargin + fillWidth, y + fillHeight/2,
                         x - batteryWidth + fillMargin + fillWidth - fillRadius, y + fillHeight/2);
    ctx.lineTo(x - batteryWidth + fillMargin + fillRadius, y + fillHeight/2);
    ctx.quadraticCurveTo(x - batteryWidth + fillMargin, y + fillHeight/2,
                         x - batteryWidth + fillMargin, y + fillHeight/2 - fillRadius);
    ctx.lineTo(x - batteryWidth + fillMargin, y - fillHeight/2 + fillRadius);
    ctx.quadraticCurveTo(x - batteryWidth + fillMargin, y - fillHeight/2,
                         x - batteryWidth + fillMargin + fillRadius, y - fillHeight/2);
    ctx.closePath();
    ctx.fill();
    
    ctx.font = 'bold 14px SFPRODISPLAYREGULAR';
    ctx.fillStyle = batteryLevel <= 20 ? '#ffffff' : '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(percentage, x - batteryWidth/2, y + 4);
    ctx.textAlign = 'right';
  };

  drawBatteryWithText(currentX, statusBarY - 7, config.baterai[1]);
  currentX -= 48;
}

    if (config.wifi) {
      const wifiSize = 1.3;
      const wifiY = statusBarY - 22;
      
      ctx.save();
      ctx.translate(currentX - 32, wifiY);
      ctx.scale(wifiSize, wifiSize);
      
      ctx.fillStyle = '#ffffff';
      
      ctx.beginPath();
      ctx.moveTo(1.5, 9);
      ctx.bezierCurveTo(1.5, 9, 5.5, 4.5, 12, 4.5);
      ctx.bezierCurveTo(18.5, 4.5, 22.5, 9, 22.5, 9);
      ctx.lineTo(19.5, 11.5);
      ctx.bezierCurveTo(19.5, 11.5, 16, 8.2, 12, 8.2);
      ctx.bezierCurveTo(8, 8.2, 4.5, 11.5, 4.5, 11.5);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(5.5, 13);
      ctx.bezierCurveTo(5.5, 13, 8.5, 10.5, 12, 10.5);
      ctx.bezierCurveTo(15.5, 10.5, 18.5, 13, 18.5, 13);
      ctx.lineTo(16, 15);
      ctx.bezierCurveTo(16, 15, 13.5, 13.5, 12, 13.5);
      ctx.bezierCurveTo(10.5, 13.5, 8, 15, 8, 15);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(9, 16.5);
      ctx.quadraticCurveTo(10, 16, 12, 16);
      ctx.quadraticCurveTo(14, 16, 15, 16.5);
      ctx.lineTo(12.3, 19.7);
      ctx.quadraticCurveTo(12, 20, 12, 20);
      ctx.quadraticCurveTo(12, 20, 11.7, 19.7);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
      
      currentX -= 35;
    }

    if (config.operator) {
      const drawSignal = (x, y) => {
        ctx.fillStyle = '#ffffff';
        const bars = [7, 11, 16, 21];
        const barWidth = 3.5;
        const barSpacing = 5.5;
        const radius = 1.5;
        
        for (let i = 0; i < 4; i++) {
          const barHeight = bars[i];
          const barX = x + (i * barSpacing);
          const barY = y + (21 - barHeight);
          
          ctx.beginPath();
          ctx.moveTo(barX, y + 21);
          ctx.lineTo(barX, barY + radius);
          ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
          ctx.lineTo(barX + barWidth - radius, barY);
          ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
          ctx.lineTo(barX + barWidth, y + 21);
          ctx.closePath();
          ctx.fill();
        }
      };

      drawSignal(currentX - 25, statusBarY - 16);
      currentX -= 35;
    }

    ctx.textAlign = 'left';
  }

ctx.font = '24px SFPRODISPLAYREGULAR';
const fontSize = 24;
const maxBubbleWidth = 540;
const minBubbleWidth = 100;
const padding = 40;
const lineHeight = 32;

function getTextSegments(text, emojis) {
  const segments = [];
  let currentIndex = 0;
  
  const sortedEmojis = [...emojis].sort((a, b) => a.offset - b.offset);
  
  for (const emoji of sortedEmojis) {
    if (currentIndex < emoji.offset) {
      const textBefore = text.substring(currentIndex, emoji.offset);
      for (const char of textBefore) {
        segments.push({ type: 'text', value: char });
      }
    }
    
    segments.push({ 
      type: 'emoji', 
      value: emoji.found,
      code: emoji.found 
    });
    
    currentIndex = emoji.offset + emoji.length;
  }
  
  if (currentIndex < text.length) {
    const remaining = text.substring(currentIndex);
    for (const char of remaining) {
      segments.push({ type: 'text', value: char });
    }
  }
  
  return segments;
}

const segments = getTextSegments(text, emojis);

function measureSegment(segment) {
  if (segment.type === 'emoji') {
    return fontSize * 1.22;
  }
  return ctx.measureText(segment.value).width;
}

let lines = [];
let currentLine = [];
let currentWidth = 0;
let currentWord = [];
let currentWordWidth = 0;

for (let i = 0; i < segments.length; i++) {
  const segment = segments[i];
  const segmentWidth = measureSegment(segment);
  
  if (segment.type === 'text' && (segment.value === ' ' || segment.value === '\n')) {
    if (currentWidth + currentWordWidth > maxBubbleWidth - padding) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = [...currentWord];
      currentWidth = currentWordWidth;
    } else {
      currentLine.push(...currentWord);
      currentWidth += currentWordWidth;
    }
    
    currentWord = [];
    currentWordWidth = 0;
    
    if (segment.value === ' ' && currentWidth + segmentWidth <= maxBubbleWidth - padding) {
      currentLine.push(segment);
      currentWidth += segmentWidth;
    }
    
    if (segment.value === '\n') {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }
  } else {
    currentWord.push(segment);
    currentWordWidth += segmentWidth;
  }
}

if (currentWord.length > 0) {
  if (currentWidth + currentWordWidth > maxBubbleWidth - padding) {
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    lines.push(currentWord);
  } else {
    currentLine.push(...currentWord);
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
  }
} else if (currentLine.length > 0) {
  lines.push(currentLine);
}

let maxLineWidth = 0;
for (const line of lines) {
  let lineWidth = 0;
  for (const segment of line) {
    lineWidth += measureSegment(segment);
  }
  maxLineWidth = Math.max(maxLineWidth, lineWidth);
}

const bubbleWidth = Math.max(minBubbleWidth, Math.min(maxBubbleWidth, maxLineWidth + padding + 58));
const bubbleHeight = Math.max(60, (lines.length * lineHeight) + 22);
const bubbleX = 22;
const menuY = 430;
const bubbleY = menuY - bubbleHeight - 20;
const radius = 26;

ctx.fillStyle = '#3a3a3a';
ctx.beginPath();
ctx.moveTo(bubbleX + radius, bubbleY);
ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
ctx.lineTo(bubbleX, bubbleY + radius);
ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
ctx.closePath();
ctx.fill();

ctx.fillStyle = '#ffffff';
ctx.font = '24px SFPRODISPLAYREGULAR';
let y = bubbleY + 34;

for (const line of lines) {
  let x = bubbleX + 24;
  
  for (const segment of line) {
    if (segment.type === 'emoji') {
      const emojiImage = emojiCache.get(segment.code);
      if (emojiImage) {
        ctx.drawImage(
          emojiImage,
          x,
          y - fontSize + fontSize * 0.15,
          fontSize * 1.22,
          fontSize * 1.22
        );
        x += fontSize * 1.22;
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(segment.value, x, y);
      x += ctx.measureText(segment.value).width;
    }
  }
  
  y += lineHeight;
}

ctx.fillStyle = '#999999';
ctx.font = '18px SFPRODISPLAYREGULAR';
ctx.textAlign = 'right';
ctx.fillText(time, bubbleX + bubbleWidth - 14, bubbleY + bubbleHeight - 8);
ctx.textAlign = 'left';
  
  const menuX = 20;
  const menuWidth = 490;
  const menuHeight = 560;
  const menuRadius = 15;
  
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.moveTo(menuX + menuRadius, menuY);
  ctx.lineTo(menuX + menuWidth - menuRadius, menuY);
  ctx.quadraticCurveTo(menuX + menuWidth, menuY, menuX + menuWidth, menuY + menuRadius);
  ctx.lineTo(menuX + menuWidth, menuY + menuHeight - menuRadius);
  ctx.quadraticCurveTo(menuX + menuWidth, menuY + menuHeight, menuX + menuWidth - menuRadius, menuY + menuHeight);
  ctx.lineTo(menuX + menuRadius, menuY + menuHeight);
  ctx.quadraticCurveTo(menuX, menuY + menuHeight, menuX, menuY + menuHeight - menuRadius);
  ctx.lineTo(menuX, menuY + menuRadius);
  ctx.quadraticCurveTo(menuX, menuY, menuX + menuRadius, menuY);
  ctx.closePath();
  ctx.fill();
  
  const drawStar = (x, y) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outer = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const inner = ((i * 2 + 1) * Math.PI) / 5 - Math.PI / 2;
      const ox = x + Math.cos(outer) * 16;
      const oy = y + Math.sin(outer) * 16;
      const ix = x + Math.cos(inner) * 7;
      const iy = y + Math.sin(inner) * 7;
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.stroke();
  };
  
  const drawReply = (x, y) => {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  
  const offsetX = x - 3;
  
  ctx.moveTo(offsetX, y - 6);
  ctx.lineTo(offsetX, y - 13);
  ctx.lineTo(offsetX - 13, y);
  ctx.lineTo(offsetX, y + 13);
  ctx.lineTo(offsetX, y + 6);
  
  ctx.bezierCurveTo(offsetX + 9, y + 6, offsetX + 16, y + 9, offsetX + 20, y + 16);
  
  ctx.bezierCurveTo(offsetX + 18, y + 7, offsetX + 14, y - 2, offsetX, y - 6);
  
  ctx.stroke();
};

const drawForward = (x, y) => {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  
  const offsetX = x + 3;
  
  ctx.moveTo(offsetX, y - 6);
  ctx.lineTo(offsetX, y - 13);
  ctx.lineTo(offsetX + 13, y);
  ctx.lineTo(offsetX, y + 13);
  ctx.lineTo(offsetX, y + 6);
  
  ctx.bezierCurveTo(offsetX - 9, y + 6, offsetX - 16, y + 9, offsetX - 20, y + 16);
  
  ctx.bezierCurveTo(offsetX - 18, y + 7, offsetX - 14, y - 2, offsetX, y - 6);
  
  ctx.stroke();
};
  
  const drawCopy = (x, y) => {
  ctx.save();
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const scale = 0.23;
  const offsetX = -127;
  const offsetY = -105;
  
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  
  ctx.beginPath();
  ctx.moveTo(offsetX + 164, offsetY + 156);
  ctx.bezierCurveTo(offsetX + 164, offsetY + 164, offsetX + 158, offsetY + 170, offsetX + 150, offsetY + 170);
  ctx.lineTo(offsetX + 74, offsetY + 170);
  ctx.bezierCurveTo(offsetX + 66, offsetY + 170, offsetX + 60, offsetY + 164, offsetX + 60, offsetY + 156);
  ctx.lineTo(offsetX + 60, offsetY + 80);
  ctx.bezierCurveTo(offsetX + 60, offsetY + 72, offsetX + 66, offsetY + 66, offsetX + 74, offsetY + 66);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(offsetX + 90, offsetY + 54);
  ctx.bezierCurveTo(offsetX + 90, offsetY + 46, offsetX + 96, offsetY + 40, offsetX + 104, offsetY + 40);
  ctx.lineTo(offsetX + 180, offsetY + 40);
  ctx.bezierCurveTo(offsetX + 188, offsetY + 40, offsetX + 194, offsetY + 46, offsetX + 194, offsetY + 54);
  ctx.lineTo(offsetX + 194, offsetY + 130);
  ctx.bezierCurveTo(offsetX + 194, offsetY + 138, offsetX + 188, offsetY + 144, offsetX + 180, offsetY + 144);
  ctx.lineTo(offsetX + 104, offsetY + 144);
  ctx.bezierCurveTo(offsetX + 96, offsetY + 144, offsetX + 90, offsetY + 138, offsetX + 90, offsetY + 130);
  ctx.closePath();
  ctx.stroke();
  
  ctx.restore();
};
  
const drawComment = (x, y) => {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const width = 30;
  const height = 22;
  const radius = 4;
  
  ctx.beginPath();
  ctx.moveTo(x - width/2 + radius, y - height/2);
  ctx.lineTo(x + width/2 - radius, y - height/2);
  ctx.quadraticCurveTo(x + width/2, y - height/2, x + width/2, y - height/2 + radius);
  ctx.lineTo(x + width/2, y + height/2 - radius);
  ctx.quadraticCurveTo(x + width/2, y + height/2, x + width/2 - radius, y + height/2);
  ctx.lineTo(x - width/2 + 8, y + height/2);
  ctx.lineTo(x - width/2 + 3, y + height/2 + 6);
  ctx.lineTo(x - width/2 + 4, y + height/2);
  ctx.lineTo(x - width/2 + radius, y + height/2);
  ctx.quadraticCurveTo(x - width/2, y + height/2, x - width/2, y + height/2 - radius);
  ctx.lineTo(x - width/2, y - height/2 + radius);
  ctx.quadraticCurveTo(x - width/2, y - height/2, x - width/2 + radius, y - height/2);
  ctx.closePath();
  ctx.stroke();
  
  ctx.fillStyle = '#ffffff';
  const dotSize = 2;
  const dotSpacing = 6;
  ctx.beginPath();
  ctx.arc(x - dotSpacing, y, dotSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, dotSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + dotSpacing, y, dotSize, 0, Math.PI * 2);
  ctx.fill();
};
  
  const drawReport = (x, y) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x - 15, y + 12);
    ctx.lineTo(x + 15, y + 12);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y - 5, 2, 11);
    ctx.beginPath();
    ctx.arc(x, y + 8, 1.5, 0, Math.PI * 2);
    ctx.fill();
  };
  
  const drawTrash = (x, y) => {
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 13);
    ctx.lineTo(x + 15, y - 13);
    ctx.stroke();
    ctx.strokeRect(x - 8, y - 18, 16, 5);
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 11);
    ctx.lineTo(x - 9, y + 13);
    ctx.lineTo(x + 9, y + 13);
    ctx.lineTo(x + 12, y - 11);
    ctx.closePath();
    ctx.stroke();
    
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x, y + 11);
    ctx.moveTo(x - 7, y - 5);
    ctx.lineTo(x - 5, y + 11);
    ctx.moveTo(x + 7, y - 5);
    ctx.lineTo(x + 5, y + 11);
    ctx.stroke();
  };
  
  const items = [
    { text: 'Beri Bintang', icon: drawStar },
    { text: 'Balas', icon: drawReply },
    { text: 'Teruskan', icon: drawForward },
    { text: 'Salin', icon: drawCopy },
    { text: 'Ucapkan', icon: drawComment },
    { text: 'Laporkan', icon: drawReport },
    { text: 'Hapus', icon: drawTrash, color: '#ff3b30' }
  ];
  
  items.forEach((item, i) => {
    const itemY = menuY + (i * 80);
    ctx.fillStyle = item.color || '#ffffff';
    ctx.font = '28px SFPRODISPLAYREGULAR';
    ctx.fillText(item.text, menuX + 30, itemY + 50);
    item.icon(menuX + menuWidth - 40, itemY + 40);
    
    if (i < items.length - 1) {
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(menuX + 25, itemY + 80);
      ctx.lineTo(menuX + menuWidth - 25, itemY + 80);
      ctx.stroke();
    }
  });
  
  const buffer = canvas.toBuffer('image/png');
  
  return {
    success: true,
    image: buffer,
    mimeType: 'image/png',
    timestamp: Date.now(),
    message: 'Created by Hann Universe npm:iqc-canvas'
};
  /**
  const filename = `iqc-${Date.now()}.png`;
  fs.writeFileSync(filename, buffer);
  
  try {
    await client.sendMessage(m.chat, { 
      image: fs.readFileSync(filename),
      caption: '✓ IQC berhasil dibuat'
    }, { quoted: m });
  } finally {
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
  }
  */
}

/**
await generateIQC('Hello World', '00.00', {
  baterai: [true, "100"],
  operator: true,
  timebar: true,
  wifi: true
});
*/

export { generateIQC };