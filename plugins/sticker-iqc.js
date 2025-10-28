/*
• Nama Fitur : Iqc
• Type : Plugin ESM
• Link Channel : https://whatsapp.com/channel/0029VbB8WYS4CrfhJCelw33j
• Author : Agas
*/

let handler = async (m, { conn, text }) => {
    if (!text) return m.reply('Example :\n.iqc lu hitam');

    await conn.sendMessage(m.chat, {
        react: { text: '⏳', key: m.key }
    });

    const now = new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Jakarta' 
    });
    const date = new Date(now);

    const offsetMinutes = Math.floor(Math.random() * (60 - 30 + 1)) + 30;
    const chatDate = new Date(date.getTime() - offsetMinutes * 60000);

    const timeFormat = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };

    const chatTime = new Intl.DateTimeFormat('id-ID', timeFormat).format(chatDate);
    const statusBarTime = new Intl.DateTimeFormat('id-ID', timeFormat).format(date);

    try {
        const primaryUrl = `https://api.zenzxz.my.id/maker/fakechatiphone?text=${encodeURIComponent(text.trim())}&chatime=${encodeURIComponent(chatTime)}&statusbartime=${encodeURIComponent(statusBarTime)}`;
        
        const response = await fetch(primaryUrl);
        if (!response.ok) throw new Error('Gagal mengambil gambar dari API');

        await conn.sendMessage(m.chat, {
            image: { url: primaryUrl }
        }, { quoted: m });

        await conn.sendMessage(m.chat, {
            react: { text: '✅', key: m.key }
        });
    } catch (e) {
        try {
            const fallbackUrl = `https://api.deline.my.id/maker/iqc?text=${encodeURIComponent(text.trim())}&chatTime=${encodeURIComponent(chatTime)}&statusBarTime=${encodeURIComponent(statusBarTime)}`;

            await conn.sendMessage(m.chat, {
                image: { url: fallbackUrl }
            }, { quoted: m });

            await conn.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });
        } catch (e) {
            await conn.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            throw e;
        }
    }
};

handler.help = ['iqc'];
handler.tags = ['maker', 'sticker'];
handler.command = ['iqc'];
handler.register = true;
handler.limit = true;

export default handler;