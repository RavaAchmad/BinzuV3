// Menggunakan ESM (ECMAScript Modules) untuk import
import { exec } from 'child_process';
import { promisify } from 'util';
import { unlinkSync, existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper buat dapetin __dirname di ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Biar 'exec' bisa pake async/await, lebih keren
const execAsync = promisify(exec);

// Alamat proxy buat jaga-jaga kalo download error
const PROXY_URL = "http://xmaze:xmpanel@203.194.114.50:3128";

/**
 * Fungsi utama buat download video/audio dari YouTube pake yt-dlp.
 * Dibuat lebih simpel dan to the point.
 */
const ytdl = async (url, quality = "720") => {
  const isAudio = quality === "audio";
  const tempFileName = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const fileExtension = isAudio ? "mp3" : "mp4";
  const tempFilePath = path.join(__dirname, `${tempFileName}.${fileExtension}`);

  // Opsi otentikasi (kalo ada cookies.txt) & header biar gak dicurigai bot
  const cookiesPath = path.join(__dirname, '../cookies.txt');
  const authOptions = [
    existsSync(cookiesPath) ? `--cookies "${cookiesPath}"` : '',
    '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
    '--add-header "Accept-Language:en-US,en;q=0.9"'
  ].filter(Boolean).join(' ');

  // Command yt-dlp yang udah dioptimalkan
  let command;
  if (isAudio) {
    command = `yt-dlp -x --audio-format mp3 --audio-quality 0 ${authOptions} -o "${tempFilePath}" "${url}" --no-warnings --quiet`;
  } else {
    // Format selector ini lebih efisien, langsung cari video terbaik <= resolusi yg diminta + audio terbaik
    const formatSelector = `"bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}]/best"`;
    command = `yt-dlp -f ${formatSelector} --merge-output-format mp4 ${authOptions} -o "${tempFilePath}" "${url}" --no-warnings --quiet`;
  }

  // Fungsi buat eksekusi command, bisa pake proxy kalo perlu
  const executeDownload = async (useProxy = false) => {
    const finalCommand = useProxy ? `${command} --proxy "${PROXY_URL}"` : command;
    console.log(`Executing: ${finalCommand}`);
    // Timeout 5 menit (300000 ms) biar gak kelamaan nunggu
    await execAsync(finalCommand, { timeout: 300000 });
  };

  try {
    // Percobaan download pertama
    await executeDownload();
  } catch (error) {
    console.error('Download attempt 1 failed:', error.message);
    const errorMsg = error.message.toLowerCase();
    
    // Cek kalo errornya butuh login atau semacamnya, baru coba pake proxy
    if (errorMsg.includes('sign in') || errorMsg.includes('private video') || errorMsg.includes('unavailable') || errorMsg.includes('login')) {
      console.log('Error butuh login atau akses khusus, coba lagi pake proxy...');
      try {
        // Percobaan download kedua dengan proxy
        await executeDownload(true);
      } catch (proxyError) {
        console.error('Download pake proxy juga gagal:', proxyError.message);
        // Kalo tetep gagal, lempar error biar ditangkep sama handler
        throw new Error("Gagal download video, udah dicoba pake proxy tapi tetep gak bisa. Mungkin videonya beneran private.");
      }
    } else {
      // Kalo errornya bukan karena akses, langsung lempar aja
      throw error;
    }
  }

  // Cek apakah file berhasil di-download
  if (!existsSync(tempFilePath)) {
    throw new Error("File gagal di-download, gak ada file yang kesimpen. Coba cek URL-nya lagi.");
  }

  // Ambil info file (judul, ukuran, dll)
  const stats = statSync(tempFilePath);
  const fileSize = stats.size;
  
  // Ambil judul video dari yt-dlp
  let videoTitle = 'N/A';
  try {
    const { stdout } = await execAsync(`yt-dlp --get-title "${url}" --no-warnings ${authOptions}`);
    videoTitle = stdout.trim();
  } catch (infoError) {
    console.error('Gagal dapetin judul video, pake judul default aja.');
    videoTitle = `YT_${isAudio ? "Audio" : "Video"}_${Date.now()}`;
  }
  
  return {
    title: videoTitle,
    filePath: tempFilePath,
    size: formatBytes(fileSize),
    fileSizeMB: fileSize / (1024 * 1024),
    type: fileExtension,
  };
};

// Fungsi helper buat format ukuran file biar gampang dibaca
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

// Handler utama buat ngerespon perintah dari user
let handler = async (m, { conn, text }) => {
  if (!text) {
    return m.reply(`*Cara pakenya gini, cuy:*\n.ytmp4 <url youtube> [resolusi]\n\n*Contoh:*\n.ytmp4 https://youtu.be/dQw4w9WgXcQ 720\n\n*Resolusi yang ada:*\n144, 240, 360, 480, 720, 1080, 1440, 2160, atau ketik *audio* buat jadiin MP3.`);
  }

  const args = text.split(" ");
  const url = args[0];
  const quality = args[1]?.replace(/p$/, '') || "720"; // Default ke 720p kalo gak disebutin

  // Validasi URL YouTube
  if (!/youtube\.com|youtu\.be/.test(url)) {
    return m.reply("❌ *URL YouTube-nya gak valid, nih. Coba copy-paste lagi.*");
  }

  const validQualities = ["144", "240", "360", "480", "720", "1080", "1440", "2160", "audio"];
  if (!validQualities.includes(quality)) {
    return m.reply(`❌ *Resolusi gak valid. Pilih salah satu dari ini ya:*\n${validQualities.join(", ")}`);
  }

  let tempFilePath = null;
  try {
    m.reply("⏳ *Sabar ya, lagi di-download... Bentar lagi beres kok!*");

    const result = await ytdl(url, quality);
    tempFilePath = result.filePath;
    
    const { title, size, fileSizeMB, type } = result;
    const isAudio = type === 'mp3';
    
    const caption = `
✅ *DOWNLOAD BERES!*

🎬 *Judul:* ${title}
📦 *Ukuran:* ${size}
${isAudio ? '🎵 *Tipe:* Audio (MP3)' : `📺 *Kualitas:* ${quality}p`}
`.trim();

    // Kalo file kegedean (di atas 80MB), kirim sebagai dokumen
    if (fileSizeMB > 80) {
      m.reply(`📄 *Filenya gede banget (${size}), jadi dikirim sebagai dokumen ya...*`);
      await conn.sendMessage(m.chat, {
        document: { url: tempFilePath },
        mimetype: isAudio ? 'audio/mpeg' : 'video/mp4',
        fileName: `${title}.${type}`,
        caption: caption
      }, { quoted: m });
    } else {
      // Kalo ukurannya aman, kirim langsung sebagai video atau audio
      if (isAudio) {
        await conn.sendMessage(m.chat, {
          audio: { url: tempFilePath },
          mimetype: 'audio/mpeg',
          caption: caption
        }, { quoted: m });
      } else {
        await conn.sendMessage(m.chat, {
          video: { url: tempFilePath },
          mimetype: 'video/mp4',
          caption: caption
        }, { quoted: m });
      }
    }
  } catch (err) {
    console.error(err);
    m.reply(`❌ *Yah, gagal download cuy.*\n\n*Error:* ${err.message}`);
  } finally {
    // Apapun yang terjadi, file sementara harus dihapus biar gak nyampah
    if (tempFilePath && existsSync(tempFilePath)) {
      // Kasih jeda dikit sebelum dihapus, biar filenya keburu kekirim
      setTimeout(() => {
        try {
          unlinkSync(tempFilePath);
          console.log(`File sementara udah dibersihin: ${tempFilePath}`);
        } catch (cleanupError) {
          console.error('Gagal bersihin file sementara:', cleanupError);
        }
      }, 60000); // 1 menit
    }
  }
};

// Info & konfigurasi command
handler.help = ['ytmp4 <url> [kualitas]'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytv)$/i;
handler.limit = true;

// Export handler-nya biar bisa dipake di file utama
export default handler;