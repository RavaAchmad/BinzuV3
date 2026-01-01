/*
• Nama Fitur : Iqc
• Type : Plugin ESM
• Link Channel : https://whatsapp.com/channel/0029VbB8WYS4CrfhJCelw33j
• Author : Agas
*/

import { generateIQC } from '../iqc/index.js';

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
        const result = await generateIQC(text.trim(), chatTime, {
            baterai: [true, "100"],
            operator: true,
            timebar: true,
            wifi: true
        });

        if (result.success && result.image) {
            await conn.sendMessage(m.chat, {
                image: result.image,
                mimetype: result.mimeType
            }, { quoted: m });

            await conn.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });
        } else {
            throw new Error('Gagal generate IQC');
        }
    } catch (e) {
        console.error('Error generating IQC:', e);
        await conn.sendMessage(m.chat, {
            react: { text: '❌', key: m.key }
        });
        throw e;
    }
};

handler.help = ['iqc'];
handler.tags = ['maker', 'sticker'];
handler.command = ['iqc'];
handler.register = true;
handler.limit = true;

export default handler;