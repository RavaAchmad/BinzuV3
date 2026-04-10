import fetch from 'node-fetch';
import { scrapePinterest } from '../lib/scrape.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    throw `Masukkan URL atau keyword!\n\ncontoh:\n${usedPrefix}${command} https://pin.it/4CVodSq\natau\n${usedPrefix}${command} aesthetic landscape\natau\n${usedPrefix}${command} aesthetic landscape --video`;
  }
  try {
    m.reply('⏳ Sedang mencari...');
    
    // Check for --video flag
    const hasVideoFlag = args.some(arg => arg === '--video');
    const query = args.filter(arg => arg !== '--video').join(' ');
    
    let results;
    
    // Get Pinterest content (returns array)
    results = await scrapePinterest(query);

    if (!results || results.length === 0) {
      return m.reply('❌ Tidak ditemukan konten Pinterest. Coba keyword lain.');
    }

    // Filter by type based on flag
    let filtered = results;
    if (hasVideoFlag) {
      filtered = results.filter(r => r.type === 'video');
      if (filtered.length === 0) {
        return m.reply('❌ Tidak ditemukan video. Coba keyword lain atau hapus flag --video untuk mencari gambar.');
      }
    } else {
      filtered = results.filter(r => r.type === 'image');
      if (filtered.length === 0) {
        return m.reply('❌ Tidak ditemukan gambar. Coba gunakan flag --video untuk mencari video.');
      }
    }

    // Pick random result
    const result = filtered[Math.floor(Math.random() * filtered.length)];
    const { type, title, url, likes, comments, link } = result;
    
    let caption = `*✨ Pinterest ${type.toUpperCase()} ✨*\n\n`;
    caption += `*📌 Judul:* ${title || '-'}\n`;
    caption += `*❤️ Likes:* ${likes || 0}\n`;
    caption += `*💬 Komentar:* ${comments || 0}\n`;
    if (link) caption += `*🔗 Link:* ${link}\n`;

    if (type === 'video') {
      const { duration } = result;
      if (duration) caption += `*⏱️ Durasi:* ${duration}\n`;
      
      await conn.sendMessage(m.chat, { 
        video: { url }, 
        caption 
      }, { quoted: m });
    } else {
      await conn.sendFile(m.chat, url, 'pinterest.jpg', caption, m);
    }
  } catch (e) {
    console.log(e);
    m.reply('❌ Gagal mengunduh dari Pinterest. Coba lagi nanti.');
  }
};

handler.help = ['pinterestdownload'].map(v => v + ' <url/keyword>')
handler.tags = ['downloader']
handler.command = /^(pinterest|pinterest|pin)$/i
handler.register = false
handler.limit = true

export default handler