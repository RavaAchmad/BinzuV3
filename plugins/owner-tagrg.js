
import { group } from 'console';
import { readConfig } from '../json/configManager.js';
import { EventEmitter } from 'events';

// Variabel untuk caching konfigurasi
let commandCache = null;
let commandCacheTime = 0;
const COMMAND_CACHE_DURATION = 1000; // Cache berlaku selama 1 detik

// Handler utamaconst adminRG = global.adminRG

let handler = async (m, { conn, text, command }) => {
  // Menaikkan batas listener untuk menghindari warning
  const adminRG = global.adminRG
    if (!adminRG.includes(m.sender)) {
    return m.reply('Sori, command ini khusus buat para suhu.');
  }
  EventEmitter.defaultMaxListeners = 20;
  console.log(`[DEBUG] Handler dimulai untuk command: "${command}"`);

  try {
    // --- 1. MEMUAT KONFIGURASI (DATABASE) ---
    const now = Date.now();
    let brainiesDB;
    if (commandCache && (now - commandCacheTime) < COMMAND_CACHE_DURATION) {
      brainiesDB = commandCache;
      console.log('[DEBUG] Menggunakan konfigurasi dari cache.');
    } else {
      console.log('[DEBUG] Membaca konfigurasi dari file `brainiesDB.json`...');
      brainiesDB = await readConfig();
      commandCache = brainiesDB; // Simpan ke cache
      commandCacheTime = now;   // Set waktu cache
      console.log('[DEBUG] Konfigurasi berhasil dimuat dan disimpan ke cache.');
    }

    // --- 2. VALIDASI DATABASE ---
    if (!brainiesDB || Object.keys(brainiesDB).length === 0) {
      console.error('[ERROR] Gagal memuat database. File kosong atau terjadi kesalahan.');
      return m.reply('⚠️ Gagal memuat database brainies. File kosong atau error.');
    }

    // --- 3. EKSTRAKSI GROUP ID ---
    const groupId = Array.isArray(brainiesDB.groupId)
      ? brainiesDB.groupId[0]
      : brainiesDB.groupId || '120363422919131515@g.us'; // Default Group ID
    console.log(`[DEBUG] Group ID yang akan digunakan: ${groupId}`);

    // --- 4. PEMETAAN COMMAND KE NAMA ROOM ---
    const roomMap = {
      'rg1': 'R1',
      'rg2': 'R2',
      'rg3': 'R3',
      'rg4': 'R4',
      'rg5': 'R5',
      'rg6': 'R6'
    };
    const displayName = roomMap[command.toLowerCase()];
    console.log(`[DEBUG] Command "${command}" dipetakan ke room: "${displayName}"`);

    if (!displayName || !brainiesDB[displayName]) {
      console.warn(`[WARN] Command "${command}" tidak memiliki data di database.`);
      return m.reply(`Waduh, command *${command}* belum ada di database nih.`);
    }

    // --- 5. EKSTRAKSI TARGET DARI ROOM YANG DIPILIH ---
    const roomData = brainiesDB[displayName];
    const targets = [];

    console.log(`[DEBUG] Memproses data untuk room "${displayName}"...`);
    for (let [name, numbers] of Object.entries(roomData)) {
      if (Array.isArray(numbers)) {
        // Jika `numbers` adalah array, tambahkan setiap nomor
        targets.push(...numbers.map(num => ({ name, number: num })));
      } else if (typeof numbers === 'string') {
        // Jika `numbers` adalah string, tambahkan langsung
        targets.push({ name, number: numbers });
      }
    }

    if (targets.length === 0) {
      console.warn(`[WARN] Room ${displayName} tidak memiliki member terdaftar.`);
      return m.reply(`⚠️ Room ${displayName} kosong. Belum ada member yang terdaftar.`);
    }
    console.log(`[DEBUG] Total target yang ditemukan di room ${displayName}: ${targets.length}`);

    // --- 6. MENGAMBIL METADATA GRUP (DENGAN CACHING) ---
    if (!conn.groupCache) conn.groupCache = {};
    if (!conn.groupCache[groupId]) {
      console.log(`[DEBUG] Mengambil metadata untuk grup ${groupId} (cache kosong)...`);
      conn.groupCache[groupId] = await conn.groupMetadata(groupId);
      // Hapus cache setelah 5 menit
      setTimeout(() => {
        console.log(`[DEBUG] Cache metadata untuk grup ${groupId} telah dihapus.`);
        delete conn.groupCache[groupId];
      }, 5 * 60 * 1000);
    } else {
      console.log(`[DEBUG] Menggunakan metadata grup ${groupId} dari cache.`);
    }

    const groupMetadata = conn.groupCache[groupId];
    const participants = groupMetadata.participants;
    console.log(`[DEBUG] Berhasil mendapatkan metadata. Total partisipan di grup: ${participants.length}`);

    // --- 7. FORCE MENTION SEMUA NOMOR (TANPA VALIDASI) ---
    console.log('[DEBUG] MODE: FORCE MENTION - Semua nomor akan di-tag paksa!');
    
    const forcedMentions = [];
    const memberList = [];
    const participantIds = participants.map(p => p.id);

    console.log('[DEBUG] Sample participant IDs:', participantIds.slice(0, 5));

    // Iterasi melalui setiap target dan paksa mention
    for (let target of targets) {
      const { name, number } = target;
      if (!number || typeof number !== 'string') {
        console.warn(`[WARN] Skipping target "${name}" karena nomor tidak valid:`, number);
        continue;
      }
      
      const cleanNumber = number.replace(/\D/g, ''); // Hapus semua karakter non-digit
      
      // Coba beberapa format dan pilih yang pertama berhasil
      const possibleFormats = [
        `${cleanNumber}@s.whatsapp.net`,  // Format JID standar
        `${cleanNumber}@lid`,              // Format LID
        cleanNumber                         // Plain number
      ];

      let selectedFormat = possibleFormats[0]; // Default ke JID
      
      // Cek apakah ada format yang match di participants
      for (let format of possibleFormats) {
        if (participantIds.includes(format)) {
          selectedFormat = format;
          console.log(`[MATCH] ✅ ${name} match dengan format: ${format}`);
          break;
        }
      }

      forcedMentions.push(selectedFormat);
      memberList.push({ name, number, format: selectedFormat });
      console.log(`[FORCED] 🔨 ${name} (${number}) -> ${selectedFormat}`);
    }

    console.log(`[SUMMARY] Total mention yang akan dipaksa: ${forcedMentions.length}`);

    if (forcedMentions.length === 0) {
      console.error('[ERROR] Tidak ada nomor yang bisa di-tag (semua invalid).');
      return m.reply(`❌ Tidak ada nomor valid di room ${displayName}! Cek format nomor di database.`);
    }

    // --- 8. MENYUSUN DAN MENGIRIM PESAN UTAMA (FORCE MENTION) ---
    let messageText = `_Hallo Brainies, pejuang PTN 2026_\n\n` +
                      `KHUSUS untuk jadwal pembelajaran SNBT akan share di grup ini ya, jadi kalau ada temennya yang belum masuk grup ini harap colek colek yaa temen-temen 😊\n\n` +
                      `Jadwal hari ini\n` +
                      `Sesi 1  (17.00 - 20.30)\n- SNBT ${roomMap}\n\n` +
                      `Sesi 2  (19.00 - 20.30)\n- SNBT ${roomMap}\n\n` +
                      `Info kelasnya sudah Kak Indri share kemarin di atas bisa di-scroll aja ya, atau bisa cek di aplikasi. Jika jadwal belum berubah, masih tahap penyesuaian jadwal kelas terbaru ya. Terima kasih 😊\n\n`;

    console.log(`[ACTION] Mengirim pesan FORCE MENTION ke grup ${groupId}...`);
    console.log(`[DEBUG] Mentions array:`, forcedMentions.slice(0, 10)); 
    
    // await conn.sendMessage(groupId, {
    //   text: messageText,
    //   mentions: forcedMentions  // PAKSA MENTION SEMUA!
    // });
    const teks = text.replace("@tag", `@${groupId}`);
    await conn.sendMessage(groupId, {
      text: teks,
      contextInfo: {
        mentionedJid: forcedMentions,
        groupMentions: [
          { groupSubject: `${displayName}`, groupJid: groupId }
        ]
      }
    });    
    console.log('[ACTION] Pesan dengan FORCE MENTION berhasil dikirim!');

    // --- 9. MEMBUAT DAN MENGIRIM LAPORAN DEBUG ---
    let reportText = `🔨 *FORCE TAG ${displayName} Selesai!*\n\n` +
                     `⚠️ *MODE: DEBUG FORCE MENTION*\n` +
                     `_Semua nomor dipaksa di-tag tanpa validasi_\n\n` +
                     `📊 *Summary:*\n` +
                     `• Total dari database: ${targets.length} member\n` +
                     `• Total yang di-tag paksa: ${forcedMentions.length} member\n\n`;

    reportText += `📋 *Daftar Member yang Di-Tag:*\n`;
    memberList.forEach((mem, idx) => {
      // Format: @628xxx (mention langsung)
      reportText += `${idx + 1}. ${mem.name} → @${mem.number.replace(/\D/g, '')}\n`;
      reportText += `   🆔 ${mem.format}\n`;
    });

    reportText += `\n💡 *Note:*\n` +
                  `_Jika ada yang muncul "tidak dikenal", berarti:_\n` +
                  `_• Nomor belum/tidak ada di grup_\n` +
                  `_• Format nomor salah_\n` +
                  `_• Member sudah keluar grup_\n\n` +
                  `_Ini mode debug, jadi semua nomor dipaksa tag!_ 🔨`;

    console.log('[ACTION] Mengirim laporan debug ke private chat...');
    
    // Kirim dengan mentions array biar @ nya jadi highlight
    await conn.sendMessage(m.chat, {
      text: reportText,
      mentions: forcedMentions  // Reuse mentions dari pesan utama
    });
    
    console.log('[ACTION] Laporan debug dengan mentions berhasil dikirim. Proses selesai.');

  } catch (e) {
    // --- 10. PENANGANAN ERROR ---
    console.error('--- [FATAL ERROR] Terjadi kesalahan pada command ruangguru ---');
    console.error('Error Message:', e.message);
    console.error('Error Stack:', e.stack);
    console.error('--- End of Error ---');
    m.reply(`⚠️ Gagal total bosku: ${e.message || 'Unknown error'}\n\n\`\`\`${e.stack?.substring(0, 500)}\`\`\`\n\nCek konsol untuk detail lengkap.`);
  }
};

handler.command = /^(rg[1-6])$/i;

export default handler;