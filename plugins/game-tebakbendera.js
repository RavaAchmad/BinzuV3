import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import sharp from 'sharp'

let timeout = 120000
let poin = 4999

// ─────────────────────────────────────────────
// 🗄️  DISK CACHE — biar ga bolak-balik minta ke server
// ─────────────────────────────────────────────
const CACHE_DIR = './cache/flags'
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })

function getCacheKey(url) {
    // Bikin nama file dari URL, bersihkan karakter aneh
    return url.replace(/[^a-zA-Z0-9]/g, '_').slice(-120) + '.png'
}

function readCache(url) {
    const file = path.join(CACHE_DIR, getCacheKey(url))
    if (fs.existsSync(file)) {
        return { buffer: fs.readFileSync(file), mime: 'image/png' }
    }
    return null
}

function writeCache(url, buffer) {
    try {
        const file = path.join(CACHE_DIR, getCacheKey(url))
        fs.writeFileSync(file, buffer)
    } catch (e) {
        // Cache write gagal? Santai, bukan error fatal
        console.warn('[CACHE] Gagal nulis cache:', e.message)
    }
}

// ─────────────────────────────────────────────
// 🎭  USER-AGENT POOL — rotate biar ga keliatan bot
// ─────────────────────────────────────────────
const UA_POOL = [
    // Chrome Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    // Chrome Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    // Firefox Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    // Firefox Linux
    'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
    // Safari Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
    // Edge Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    // Chrome Android
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
    // Samsung Browser
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36',
]

function getRandomUA() {
    return UA_POOL[Math.floor(Math.random() * UA_POOL.length)]
}

// ─────────────────────────────────────────────
// 🔗  URL HELPERS
// ─────────────────────────────────────────────

/**
 * Konversi URL SVG wikimedia ke URL thumbnail PNG-nya langsung
 */
function toWikimediaPNG(url) {
    if ((url.includes('wikipedia.org') || url.includes('wikimedia.org')) && url.endsWith('.svg')) {
        const parts = url.split('/commons/')
        if (parts.length === 2) {
            const filePath = parts[1]
            const fileName = filePath.split('/').pop()
            return `https://upload.wikimedia.org/wikipedia/commons/thumb/${filePath}/800px-${fileName}.png`
        }
    }
    return url
}

/**
 * Proxy via wsrv.nl — CDN gratis, cache global di 300+ datacenter,
 * otomatis handle konversi format, bypass rate limit Wikimedia
 * Docs: https://wsrv.nl/
 */
function toWsrvProxy(originalUrl) {
    const pngUrl = toWikimediaPNG(originalUrl)
    return `https://wsrv.nl/?url=${encodeURIComponent(pngUrl)}&output=png&w=800&q=85`
}

/**
 * Proxy via statically.io — CDN alternatif kalau wsrv.nl lagi bete
 */
function toStaticallyProxy(originalUrl) {
    const pngUrl = toWikimediaPNG(originalUrl)
    return `https://cdn.statically.io/img/${pngUrl.replace(/^https?:\/\//, '')}`
}

// ─────────────────────────────────────────────
// 🌐  FETCH DENGAN HEADER SPOOF
// ─────────────────────────────────────────────
async function fetchWithSpoof(url, isProxy = false) {
    const ua = getRandomUA()
    const headers = {
        'User-Agent': ua,
        'Accept': 'image/webp,image/avif,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
    }

    // Kalau direct ke Wikimedia, tambahin Referer biar lebih legit
    if (!isProxy) {
        headers['Referer'] = 'https://en.wikipedia.org/'
    }

    const res = await fetch(url, { headers, timeout: 12000 })

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} dari ${url}`)
    }

    const contentType = res.headers.get('content-type') || ''
    const buffer = Buffer.from(await res.arrayBuffer())

    // Kalau dapet SVG (harusnya udah ga terjadi dengan proxy), konversi
    if (contentType.includes('svg') || url.endsWith('.svg')) {
        const pngBuffer = await sharp(buffer).png().toBuffer()
        return { buffer: pngBuffer, mime: 'image/png' }
    }

    if (!contentType.startsWith('image')) {
        throw new Error(`Response bukan gambar (${contentType})`)
    }

    return { buffer, mime: 'image/png' }
}

// ─────────────────────────────────────────────
// 🏆  MAIN FETCH — 4 LAPIS STRATEGI
// ─────────────────────────────────────────────
async function fetchFlagImage(url) {
    // ── LAYER 0: Cek disk cache dulu, biar ga usah kemana-mana ──
    const cached = readCache(url)
    if (cached) {
        console.log('[FLAG] ✅ Cache hit:', url.split('/').pop())
        return cached
    }

    const pngUrl = toWikimediaPNG(url)
    const wsrvUrl = toWsrvProxy(url)
    const staticallyUrl = toStaticallyProxy(url)

    const strategies = [
        // ── LAYER 1: wsrv.nl proxy — opsi terbaik, CDN global, handle SVG otomatis ──
        async () => {
            console.log('[FLAG] 🔄 Coba wsrv.nl proxy...')
            return await fetchWithSpoof(wsrvUrl, true)
        },
        // ── LAYER 2: Statically.io proxy — backup kalau wsrv lagi down ──
        async () => {
            console.log('[FLAG] 🔄 Coba statically.io proxy...')
            return await fetchWithSpoof(staticallyUrl, true)
        },
        // ── LAYER 3: Direct ke Wikimedia PNG dengan header spoof ──
        async () => {
            console.log('[FLAG] 🔄 Coba direct Wikimedia PNG...')
            return await fetchWithSpoof(pngUrl, false)
        },
        // ── LAYER 4: URL asli (last resort) ──
        async () => {
            console.log('[FLAG] 🔄 Coba URL original...')
            return await fetchWithSpoof(url, false)
        },
    ]

    let lastError = null
    for (const strategy of strategies) {
        try {
            const result = await strategy()
            // Berhasil? Simpan ke cache biar request berikutnya langsung hit
            writeCache(url, result.buffer)
            console.log('[FLAG] ✅ Berhasil ambil gambar, disimpan ke cache')
            return result
        } catch (e) {
            lastError = e
            console.warn('[FLAG] ⚠️ Strategi gagal:', e.message)
            // Jeda kecil sebelum coba strategi berikutnya — jangan spam request
            await new Promise(r => setTimeout(r, 300 + Math.random() * 400))
        }
    }

    throw new Error(`Semua strategi gagal. Error terakhir: ${lastError?.message}`)
}

// ─────────────────────────────────────────────
// 🚀  BACKGROUND PREFETCHER
// Diam-diam pre-cache soal berikutnya sambil user lagi main
// ─────────────────────────────────────────────
let prefetchQueue = new Set()

function prefetchNext(src, count = 3) {
    for (let i = 0; i < count; i++) {
        const json = src[Math.floor(Math.random() * src.length)]
        if (prefetchQueue.has(json.img)) continue

        const cached = readCache(json.img)
        if (cached) continue // udah ada, skip

        prefetchQueue.add(json.img)
        // Jalanin di background, jangan block apapun
        setTimeout(async () => {
            try {
                await fetchFlagImage(json.img)
                console.log('[PREFETCH] ✅ Pre-cached:', json.img.split('/').pop())
            } catch (e) {
                console.warn('[PREFETCH] ⚠️ Gagal pre-cache:', e.message)
            } finally {
                prefetchQueue.delete(json.img)
            }
        }, 2000 + Math.random() * 3000) // delay random biar ga serempak
    }
}

// ─────────────────────────────────────────────
// 🎮  HANDLER UTAMA
// ─────────────────────────────────────────────
let handler = async (m, { conn, usedPrefix }) => {
    conn.game = conn.game ? conn.game : {}
    let id = 'tebakbendera-' + m.chat
    if (id in conn.game) return conn.reply(m.chat, 'Masih ada soal belum terjawab di chat ini', conn.game[id][0])

    let src = JSON.parse(fs.readFileSync('./json/tebakbendera.json', 'utf-8'))
    let json = src[Math.floor(Math.random() * src.length)]

    let caption = `
Silahkan Tebak Bendera Di Atas...

Timeout *${(timeout / 1000).toFixed(0)} detik*
Ketik ${usedPrefix}teben untuk bantuan
Bonus: ${poin} XP
    `.trim()

    let sentMsg
    try {
        const { buffer, mime } = await fetchFlagImage(json.img)

        sentMsg = await conn.sendMessage(m.chat, {
            image: buffer,
            caption,
            mimetype: mime
        }, { quoted: m })

    } catch (e) {
        console.error('[TEBAKBENDERA] Semua strategi habis:', e.message)
        return m.reply(`❌ Gagal mengambil gambar bendera setelah 4 percobaan.\nCoba lagi sebentar!\n_Error: ${e.message}_`)
    }

    // Kick off background prefetch — 3 soal berikutnya di-cache diam-diam
    prefetchNext(src, 3)

    conn.game[id] = [
        sentMsg,
        json,
        poin,
        setTimeout(() => {
            if (conn.game[id]) {
                conn.reply(m.chat, `⏰ Waktu habis!\nJawabannya adalah *${json.name}*`, conn.game[id][0])
            }
            delete conn.game[id]
        }, timeout)
    ]
}

handler.help = ['tebakbendera']
handler.tags = ['game']
handler.command = /^tebakbendera$/i
handler.onlyprem = true
handler.game = true

export default handler