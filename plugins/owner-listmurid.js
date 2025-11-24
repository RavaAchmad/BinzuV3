// listmurid.js
import { readConfig } from '../json/configManager.js';

let handler = async (m, { conn, text }) => {
  const rombel = text.trim().toUpperCase();
  if (!rombel) {
    return m.reply('Masukin rombelnya, Bos.\nContoh: .listmurid R1');
  }

  const db = await readConfig();

  if (!db[rombel]) {
    return m.reply(`Rombel '${rombel}' ga ketemu.`);
  }

  const muridList = db[rombel];
  const keys = Object.keys(muridList);

  if (keys.length === 0) {
    return m.reply(`List murid buat '${rombel}' masih kosong.`);
  }

  let reply = `👥 *List Murid Rombel ${rombel}*\n\n`;
  keys.forEach((nama, index) => {
    reply += `*${index + 1}. ${nama}*\n`;
    const numbers = muridList[nama];
    if (Array.isArray(numbers)) {
      reply += numbers.map(num => `   - ${num}`).join('\n') + '\n\n';
    } else {
      reply += `   - ${numbers}\n\n`;
    }
  });

  m.reply(reply.trim());
};

handler.command = /^(listmurid|cekmurid)$/i;
export default handler;