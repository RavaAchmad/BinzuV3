// addmurid.js
import { readConfig, writeConfig } from '../json/configManager.js';

// Ganti dengan list nomor mods/owner lo
const MODS = ['6281212035575@s.whatsapp.net', '217333968683183@lid'];
const adminRG = global.adminRG
let handler = async (m, { conn, text }) => {
  if (!adminRG.includes(m.sender)) {
    return m.reply('Sori, command ini khusus buat para suhu.');
  }

  // Format: .addmurid <Rombel> <"Nama Murid"> <Nomor1> [Nomor2] ...
  const args = text.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  if (args.length < 3) {
    return m.reply(`Formatnya salah, Bos.\nContoh:\n.addmurid R1 "Nizar Ganteng" 62812...\n.addmurid R2 Ashifa 62813... 62815...`);
  }

  const rombel = args[0].toUpperCase();
  const nama = args[1].replace(/"/g, ''); // Hapus tanda kutip dari nama
  const numbers = args.slice(2).map(num => num.replace(/[^0-9]/g, ''));

  const db = await readConfig();

  if (!db[rombel]) {
    return m.reply(`Rombel '${rombel}' kaga ada di DB, Cuk.`);
  }

  // Cek apakah murid sudah ada
  if (!db[rombel][nama]) {
    // Murid baru
    db[rombel][nama] = numbers.length === 1 ? numbers[0] : numbers;
  } else {
    // Murid lama, tambahin nomor baru
    let existingNumbers = db[rombel][nama];
    if (!Array.isArray(existingNumbers)) {
      // Kalo tadinya cuma string, ubah jadi array
      existingNumbers = [existingNumbers];
    }
    
    numbers.forEach(num => {
      if (!existingNumbers.includes(num)) {
        existingNumbers.push(num);
      }
    });
    db[rombel][nama] = existingNumbers.length === 1 ? existingNumbers[0] : existingNumbers;
  }
  
  await writeConfig(db);

  m.reply(`✅ Berhasil! Data '${nama}' di rombel ${rombel} udah di-update.`);
};

handler.command = /^(addmurid)$/i;
export default handler;