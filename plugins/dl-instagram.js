import { aiopro, anydown } from '../lib/scrape.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // Cek input url
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} https://www.instagram.com/p/ByxKbUSnubS/`
    
    // Memberitahu user sedang diproses
    m.reply('Sedang memproses, mohon tunggu...')

    try {
        let url = args[0]
        let data;

        // COBA SCRAPER 1 (aiopro)
        try {
            data = await aiopro(url)
        } catch (e) {
            console.error(e);
            try {
                data = await anydown(url)
            } catch (err) {
				console.error(err);	
            }
        }

        // Validasi data hasil scrape
        if (!data) throw 'Tidak ada data yang ditemukan.'
        
        // Normalisasi hasil output (karena API sering berubah struktur)
        // Biasanya API ini mengembalikan properti 'medias' atau 'url'
        let results = []
        
        if (data.medias && data.medias.length > 0) {
            results = data.medias
        } else if (data.url) {
            results = [{ url: data.url, extension: data.extension || 'mp4' }]
        } else {
            // Coba cari array di dalam object jika struktur beda
            results = Object.values(data).filter(v => v && typeof v === 'object' && v.url)
        }

        if (results.length === 0) throw 'Konten tidak ditemukan atau url bersifat privat.'

        // Filter duplikat URL dan ambil kualitas terbaik (jika ada opsi kualitas)
        // Kita gunakan Set untuk menyimpan url unik
        const seen = new Set();
        const filteredResults = [];

        for (let item of results) {
            // Pastikan item punya url
            if (item.url && !seen.has(item.url)) {
                // Filter tambahan: kadang API kasih versi audio saja (m4a), kita skip kalau mau video/gambar saja
                // Hapus baris 'item.extension === ...' jika ingin download semuanya termasuk audio
                if (item.extension !== 'm4a') { 
                    filteredResults.push(item);
                    seen.add(item.url);
                }
            }
        }

        // Kirim hasil ke chat
        const limitnya = 99; // Batasi jumlah file untuk mencegah spam jika albumnya banyak
        
        for (let i = 0; i < Math.min(limitnya, filteredResults.length); i++) {
            let fileUrl = filteredResults[i].url
            let isVideo = filteredResults[i].extension === 'mp4' || fileUrl.includes('.mp4')
            
            // Delay sedikit biar ga ke-banned WA
            if (i > 0) await sleep(150);

            await conn.sendFile(m.chat, fileUrl, null, `*Instagram Downloader* (${i + 1}/${Math.min(limitnya, filteredResults.length)})`, m)
        }

    } catch (e) {
        console.error(e)
        m.reply(`Server down coba lagi nanti ya niggs`)
    }
}

handler.help = ['instagram', 'ig'].map(v => v + ' <url>')
handler.tags = ['downloader']
handler.command = /^(ig|instagram|igdl|instagramdl|igstory)$/i
handler.limit = true

export default handler

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}