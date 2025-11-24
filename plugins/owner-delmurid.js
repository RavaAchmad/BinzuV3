// delmurid.js
import { readConfig, writeConfig } from '../json/configManager.js';

const adminRG = global.adminRG
let handler = async (m, { conn, text }) => {
  if (!adminRG.includes(m.sender)) {
    return m.reply('Sori, command ini khusus buat para suhu.');
  }

  // Format: .delmurid <Rombel> <"Nama Murid"> [Nomor Spesifik]
  const args = text.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  if (args.length < 2) {
    return m.reply(`Formatnya salah, Bos.\nContoh:\n.delmurid R1 "Nizar"\n.delmurid R2 Ashifa 6281311556939`);
  }

  const rombel = args[0].toUpperCase();
  const nama = args[1].replace(/"/g, '');
  const numberToDel = args[2] ? args[2].replace(/[^0-9]/g, '') : null;

  const db = await readConfig();

  if (!db[rombel] || !db[rombel][nama]) {
    return m.reply(`Murid '${nama}' di rombel '${rombel}' ga ketemu di DB.`);
  }

  // KASUS 1: Hapus satu murid full
  if (!numberToDel) {
    delete db[rombel][nama];
    await writeConfig(db);
    return m.reply(`✅ Bye-bye! Semua data murid '${nama}' di rombel ${rombel} berhasil dihapus.`);
  }

  // KASUS 2: Hapus nomor spesifik
  let existingNumbers = db[rombel][nama];
  if (!Array.isArray(existingNumbers)) {
    // Kalo nomornya cuma satu (string)
    if (existingNumbers === numberToDel) {
      delete db[rombel][nama]; // Langsung hapus muridnya
    } else {
      return m.reply(`Nomor ${numberToDel} ga cocok sama datanya '${nama}'.`);
    }
  } else {
    // Kalo nomornya banyak (array)
    const newNumbers = existingNumbers.filter(num => num !== numberToDel);
    if (newNumbers.length === existingNumbers.length) {
      return m.reply(`Nomor ${numberToDel} ga ketemu di datanya '${nama}'.`);
    }
    // Kalo setelah dihapus sisa 1, jadiin string. Kalo kosong, hapus.
    if (newNumbers.length === 0) {
      delete db[rombel][nama];
    } else if (newNumbers.length === 1) {
      db[rombel][nama] = newNumbers[0];
    } else {
      db[rombel][nama] = newNumbers;
    }
  }

  await writeConfig(db);
  m.reply(`✅ Sip! Nomor ${numberToDel} buat murid '${nama}' udah dihapus.`);
};

handler.command = /^(delmurid)$/i;
export default handler;