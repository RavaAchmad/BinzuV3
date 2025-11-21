import * as cheerio from 'cheerio'
import fetch from 'node-fetch'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // ============================================
    // COMMAND: HADITS (Scraping dari hadits.id)
    // ============================================
    if (command === 'hadits' || command === 'hadist') {
        if (!args[0]) {
            return m.reply(`╭─━━━━━━「 📚 KITAB HADITS 」━━━━━━─╮

Pilih kitab hadits yang mau dicari:

• bukhari - Shahih Bukhari
• muslim - Shahih Muslim
• abudawud - Abu Dawud
• tirmidzi - Tirmidzi
• nasai - An-Nasa'i
• ibnumajah - Ibnu Majah

*Cara pakai:*
${usedPrefix + command} bukhari 1
${usedPrefix + command} muslim random

╰─━━━━━━「 hadits.id 」━━━━━━─╯`)
        }

        const kitab = args[0].toLowerCase()
        const validKitab = ['bukhari', 'muslim', 'abudawud', 'tirmidzi', 'nasai', 'ibnumajah']
        
        if (!validKitab.includes(kitab)) {
            return m.reply('❌ Kitab tidak valid! Pilih: bukhari, muslim, abudawud, tirmidzi, nasai, atau ibnumajah')
        }

        m.reply('🔍 Mengambil hadits...')

        try {
            let nomorHadits
            
            // Kalau args[1] = "random" atau kosong, generate random
            if (!args[1] || args[1].toLowerCase() === 'random') {
                // Range hadits per kitab (approximate)
                const ranges = {
                    bukhari: 7563,
                    muslim: 7500,
                    abudawud: 5274,
                    tirmidzi: 3956,
                    nasai: 5758,
                    ibnumajah: 4341
                }
                nomorHadits = Math.floor(Math.random() * ranges[kitab]) + 1
            } else {
                nomorHadits = parseInt(args[1])
                if (isNaN(nomorHadits)) {
                    return m.reply('❌ Nomor hadits harus angka atau "random"!')
                }
            }

            const url = `https://www.hadits.id/hadits/${kitab}/${nomorHadits}`

            const response = await fetch(url)
            if (!response.ok) throw new Error('Hadits tidak ditemukan')

            const html = await response.text()
            const $ = cheerio.load(html)

            // === BAGIAN YANG GUE FIX ===
            // Targetin container utamanya dulu biar scope-nya jelas
            const content = $('article.hadits-content')

            // Judul Bab ada di h1 atau h2 di dalem article
            const judulBab = content.find('h1').text().trim() || content.find('h2').text().trim() || 'Tanpa Judul Bab'

            // Teks Arab ada di tag <p> dengan class "rtl"
            const arabText = content.find('p.rtl').first().text().trim()

            // Terjemahan itu tricky, dia ada di tag <p> tapi gak punya class spesifik.
            // Logic: Cari tag <p> yang isinya mengandung kata kunci periwayat ("Telah menceritakan", dsb)
            // ATAU ambil elemen <p> tepat setelah teks Arab (next sibling)
            let indonesiaText = content.find('p').filter((i, el) => {
                const txt = $(el).text()
                return txt.includes('Telah menceritakan') || txt.includes('Telah bercerita') || txt.includes('berkata;')
            }).first().text().trim()

            // Fallback kalo filter gagal: Ambil <p> setelah <p class="rtl">
            if (!indonesiaText) {
                indonesiaText = content.find('p.rtl').next('p').text().trim()
            }
            // ============================
            
            const namaKitab = kitab.charAt(0).toUpperCase() + kitab.slice(1)

            if (!indonesiaText && !arabText) throw new Error('Gagal parsing hadits, struktur web mungkin berubah.')

            let caption = `╭─━━━━━━「 📖 HADITS 」━━━━━━─╮\n\n`
            caption += `*Kitab:* Shahih ${namaKitab}\n`
            caption += `*Nomor:* ${nomorHadits}\n`
            caption += `*Bab:* ${judulBab}\n\n`
            
            if (arabText) {
                caption += `*Arab:*\n${arabText}\n\n`
            }
            
            caption += `*Terjemah:*\n_${indonesiaText}_\n\n`
            caption += `*Sumber:* hadits.id\n`
            caption += `╰─━━━━━━「 ${usedPrefix + command} 」━━━━━━─╯`
            
            m.reply(caption)
        } catch (error) {
            console.error(error)
            m.reply('❌ Gagal mengambil hadits. Coba nomor lain atau cek koneksi!')
        }
    }

    // ============================================
    // COMMAND: AYAT (Random Al-Quran)
    // ============================================
    else if (command === 'ayat' || command === 'alquran' || command === 'quran') {
        m.reply('🔍 Mengambil ayat Al-Quran...')

        try {
            // Random surah (1-114)
            const randomSurah = Math.floor(Math.random() * 114) + 1
            
            // Fetch info surah untuk tau total ayat
            const surahRes = await fetch(`https://api.alquran.cloud/v1/surah/${randomSurah}`)
            const surahData = await surahRes.json()
            const totalAyahs = surahData.data.numberOfAyahs
            const randomAyah = Math.floor(Math.random() * totalAyahs) + 1
            
            // Fetch Arab + Terjemahan Indonesia
            const [arabRes, idRes] = await Promise.all([
                fetch(`https://api.alquran.cloud/v1/ayah/${randomSurah}:${randomAyah}`),
                fetch(`https://api.alquran.cloud/v1/ayah/${randomSurah}:${randomAyah}/id.indonesian`)
            ])
            
            const arabData = (await arabRes.json()).data
            const idData = (await idRes.json()).data
            
            let caption = `╭─━━━━━━「 📕 AL-QUR'AN 」━━━━━━─╮\n\n`
            caption += `*Surah:* ${idData.surah.name} (${idData.surah.englishName})\n`
            caption += `*Ayat:* ${idData.numberInSurah}\n\n`
            caption += `*Arab:*\n${arabData.text}\n\n`
            caption += `*Terjemahan:*\n_${idData.text}_\n\n`
            caption += `╰─━━━━━━「 QS ${idData.surah.englishName}:${idData.numberInSurah} 」━━━━━━─╯`
            
            m.reply(caption)
        } catch (error) {
            console.error(error)
            m.reply('❌ Gagal mengambil ayat. Coba lagi nanti!')
        }
    }

    // ============================================
    // COMMAND: MOTIVASI (Quote Anak Muda)
    // ============================================
    else if (command === 'motivasi' || command === 'semangat' || command === 'quotes') {
        const quotes = [
            {
                quote: "Gak ada yang instan di dunia ini, kecuali mie. Jadi sabar ya!",
                author: "Filosofi Kehidupan"
            },
            {
                quote: "Jangan takut gagal, yang ditakutin itu kalau lo gak pernah nyoba",
                author: "Motivasi Harian"
            },
            {
                quote: "Hidup itu kayak naik sepeda, kalau mau seimbang ya harus terus bergerak",
                author: "Albert Einstein"
            },
            {
                quote: "Sukses itu bukan tentang seberapa cepat lo sampai, tapi seberapa konsisten lo jalan",
                author: "Wisdom Quote"
            },
            {
                quote: "Jangan bandingin diri lo sama orang lain. Timeline setiap orang beda-beda",
                author: "Self Reminder"
            },
            {
                quote: "Yang penting bukan seberapa keras lo jatuh, tapi seberapa cepat lo bangkit",
                author: "Rocky Balboa"
            },
            {
                quote: "Mimpi itu gratis, tapi usaha buat wujudin itu yang harganya mahal",
                author: "Realita Kehidupan"
            },
            {
                quote: "Jangan tunggu moment yang sempurna, jadiin aja moment sekarang jadi sempurna",
                author: "Life Hack"
            },
            {
                quote: "Kegagalan itu bukan akhir, tapi awal dari kesuksesan yang lebih besar",
                author: "Thomas Edison"
            },
            {
                quote: "Lo gak akan pernah siap 100%, jadi mulai aja dulu dari sekarang",
                author: "Action Oriented"
            },
            {
                quote: "Proses itu kadang menyakitkan, tapi hasil akhirnya worth it kok",
                author: "Growth Mindset"
            },
            {
                quote: "Jangan takut keluar dari zona nyaman, di situ lo baru bisa berkembang",
                author: "Comfort Zone"
            },
            {
                quote: "Yang membedakan antara sukses dan gagal itu cuma satu: konsistensi",
                author: "Success Formula"
            },
            {
                quote: "Masa depan lo ditentukan sama keputusan lo hari ini, jadi pilih yang bijak",
                author: "Future Planning"
            },
            {
                quote: "Jangan fokus sama masalahnya, fokus ke solusinya. Mindset is everything",
                author: "Problem Solving"
            },
            {
                quote: "Kerja keras bisa ngalahin bakat, tapi bakat yang kerja keras? Unstoppable!",
                author: "Hard Work"
            },
            {
                quote: "Jangan pernah berhenti belajar. Dunia terus berkembang, lo juga harus",
                author: "Lifelong Learning"
            },
            {
                quote: "Gagal itu bukan alasan buat nyerah, tapi pelajaran buat jadi lebih baik",
                author: "Failure Wisdom"
            },
            {
                quote: "Percaya sama proses, setiap usaha gak akan pernah sia-sia",
                author: "Trust the Process"
            },
            {
                quote: "Lo cuma butuh keberanian buat mulai, konsistensi buat bertahan, dan keyakinan buat sukses",
                author: "3 Keys to Success"
            }
        ]
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
        
        let caption = `╭─━━━━━━「 🔥 MOTIVASI 」━━━━━━─╮\n\n`
        caption += `_"${randomQuote.quote}"_\n\n`
        caption += `— ${randomQuote.author}\n\n`
        caption += `╰─━━━━━━「 Keep Going! 💪 」━━━━━━─╯`
        
        m.reply(caption)
    }
}

handler.help = ['hadits <kitab> <nomor>', 'ayat', 'motivasi']
handler.tags = ['islami', 'quotes']
handler.command = /^(hadits|hadist|ayat|alquran|quran|motivasi|semangat|quotes)$/i
handler.limit = true
handler.register = true

export default handler