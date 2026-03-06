import axios from 'axios';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  conn.sessionAI = conn.sessionAI || {};

  if (!text) throw `🚩 ${usedPrefix + command} *enable/disable*`;

  if (text === "enable") {
    conn.sessionAI[m.sender] = { sessionChat: [] };
    m.reply("✅ Auto AI aktif! Sekarang kamu bisa ngobrol langsung tanpa prefix.");
  } else if (text === "disable") {
    delete conn.sessionAI[m.sender];
    m.reply("❌ Auto AI dimatiin. Sampai jumpa!");
  }
};

handler.before = async (m, { conn }) => {
  conn.sessionAI = conn.sessionAI || {};
  if (m.isBaileys && m.fromMe) return;
  if (!m.text) return;
  if (!conn.sessionAI[m.sender]) return;
  if ([".", "#", "!", "/", "\\"].some(prefix => m.text.startsWith(prefix))) return;

  if (conn.sessionAI[m.sender] && m.text) {
    const previousMessages = conn.sessionAI[m.sender].sessionChat || [];

    // Bangun konteks percakapan dari history
    const contextHistory = previousMessages
      .map((msg, i) => `${i % 2 === 0 ? 'User' : 'AI'}: ${msg}`)
      .join('\n');

    // Gabungkan konteks + pesan baru jadi satu query
    const query = contextHistory
      ? `${contextHistory}\nUser: ${m.text}`
      : m.text;

    try {
      const { data } = await axios.get('https://api.shehost.my.id/', {
        params: { q: query }
      });

      if (!data || !data.status) {
        return m.reply("⚠️ Gagal dapet respons dari AI, coba lagi nanti.");
      }

      // Handle tipe respons: chat atau image
      if (data.type === "image") {
        const imageUrl = data.data?.url || data.data?.download;
        if (imageUrl) {
          await conn.sendMessage(m.chat, {
            image: { url: imageUrl },
            caption: `🖼️ *Gambar berhasil dibuat!*\n\n_Prompt: ${data.data?.prompt?.slice(0, 100) || m.text}..._`
          }, { quoted: m });
        } else {
          m.reply("⚠️ Gagal ambil URL gambar.");
        }
      } else {
        // Default: tipe chat
        const result = data.data?.message;
        if (result) {
          await m.reply(result);

          // Simpan history percakapan (max 10 pesan terakhir biar ga berat)
          const updatedHistory = [
            ...conn.sessionAI[m.sender].sessionChat,
            m.text,
            result
          ];
          conn.sessionAI[m.sender].sessionChat = updatedHistory.slice(-10);
        } else {
          m.reply("⚠️ Respons AI kosong, coba lagi.");
        }
      }

    } catch (e) {
      console.error("[AutoAI Error]", e.message);
      m.reply("❌ Error pas manggil API:\n" + e.message);
    }
  }
};

handler.command = ['autoai'];
handler.tags = ['ai'];
handler.help = ['autoai'].map(a => a + ' *enable/disable*');
handler.premium = true;

export default handler;