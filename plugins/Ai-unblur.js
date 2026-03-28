import { winkHD } from '../lib/scrape.js';

async function handler(m, { conn, usedPrefix, command }) {
  try {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || q.mediaType || '';
    if (/^image/.test(mime) && !/webp/.test(mime)) {
      const img = await q.download();
      if (!img || !Buffer.isBuffer(img)) {
        return m.reply('Gagal mendownload gambar, coba lagi.');
      }
      const mode = command === 'ultrahd' ? 'ULTRA_HD' : 'HD';
      m.reply(`⏳ Sedang memproses gambar (${mode === 'ULTRA_HD' ? 'Ultra HD' : 'HD'})...`);
      const result = await winkHD(img, mode);
      await conn.sendFile(m.chat, result, null, wm, m);
      m.reply('bisa pakai *hd*, dan tersedia *ultrahd* untuk hasil lebih maksimal.')
    } else {
      m.reply(`Kirim gambar dengan caption *${usedPrefix + command}* atau tag gambar yang sudah dikirim. Tersedia ultrahd untuk hasil lebih maksimal.`);
    }
  } catch (e) {
    console.error(e);
    m.reply('❌ Gagal memproses gambar. Silakan coba lagi.');
  }
}

handler.help = ['remini', 'hd', 'hdr', 'unblur', 'ultrahd'];
handler.tags = ['tools'];
handler.command = ['remini', 'unblur', 'hd', 'hdr', 'ultrahd'];
handler.limit = true;

export default handler;