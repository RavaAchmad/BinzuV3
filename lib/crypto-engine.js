// ============================================================
// CRYPTO ENGINE - Shared price simulation engine
// File: lib/crypto-engine.js
// Di-import oleh semua plugin crypto
// ============================================================

// Base harga dalam satuan "koin game" (bukan IDR asli)
// Disesuaikan agar fun & tidak terlalu mahal untuk minigame
export const COINS = {
    BTC:  { name: 'Bitcoin',        symbol: 'BTC',  emoji: '₿',  basePrice: 500000,  volatility: 0.04 },
    ETH:  { name: 'Ethereum',       symbol: 'ETH',  emoji: '⟠',  basePrice: 35000,   volatility: 0.045 },
    BNB:  { name: 'BNB',            symbol: 'BNB',  emoji: '🔶', basePrice: 8000,    volatility: 0.05 },
    SOL:  { name: 'Solana',         symbol: 'SOL',  emoji: '◎',  basePrice: 3000,    volatility: 0.06 },
    DOGE: { name: 'Dogecoin',       symbol: 'DOGE', emoji: '🐕', basePrice: 30,      volatility: 0.08 },
    ADA:  { name: 'Cardano',        symbol: 'ADA',  emoji: '🔵', basePrice: 15,      volatility: 0.07 },
    XRP:  { name: 'XRP',            symbol: 'XRP',  emoji: '💧', basePrice: 90,      volatility: 0.06 },
    MATIC:{ name: 'Polygon',        symbol: 'MATIC',emoji: '🟣', basePrice: 20,      volatility: 0.07 },
}

// Inisialisasi harga di DB global kalau belum ada
export function initCryptoEngine() {
    if (!global.db.data.crypto) {
        global.db.data.crypto = {
            prices: {},
            prevPrices: {},
            lastUpdate: 0,
            priceHistory: {}  // simpan 10 history per koin buat grafik
        }
    }

    const crypto = global.db.data.crypto
    const now = Date.now()

    // Init harga awal jika kosong
    for (const [symbol, coin] of Object.entries(COINS)) {
        if (!crypto.prices[symbol]) {
            crypto.prices[symbol] = coin.basePrice
            crypto.prevPrices[symbol] = coin.basePrice
            crypto.priceHistory[symbol] = [coin.basePrice]
        }
    }

    // Update harga setiap 5 menit
    if (now - crypto.lastUpdate > 5 * 60 * 1000) {
        updatePrices()
    }

    return crypto
}

// Simulasi pergerakan harga dengan random walk
export function updatePrices() {
    const crypto = global.db.data.crypto
    if (!crypto) return

    for (const [symbol, coin] of Object.entries(COINS)) {
        const currentPrice = crypto.prices[symbol] || coin.basePrice

        // Random walk dengan bias mean-reversion agar ga lari jauh
        const randomFactor = (Math.random() - 0.5) * 2   // -1 to 1
        const change = currentPrice * coin.volatility * randomFactor

        // Mean reversion: kalau harga terlalu jauh dari base, tarik balik
        const deviation = (currentPrice - coin.basePrice) / coin.basePrice
        const reversion = -deviation * 0.05 * currentPrice

        let newPrice = currentPrice + change + reversion
        // Floor 10% dari base agar ga sampai 0
        newPrice = Math.max(newPrice, coin.basePrice * 0.1)

        crypto.prevPrices[symbol] = currentPrice

        // Simpan ke history (max 10 entry)
        if (!crypto.priceHistory[symbol]) crypto.priceHistory[symbol] = []
        crypto.priceHistory[symbol].push(Math.round(newPrice))
        if (crypto.priceHistory[symbol].length > 10) {
            crypto.priceHistory[symbol].shift()
        }

        crypto.prices[symbol] = Math.round(newPrice)
    }

    crypto.lastUpdate = Date.now()
}

// Ambil harga terkini
export function getPrice(symbol) {
    const crypto = global.db.data.crypto
    if (!crypto?.prices[symbol]) {
        initCryptoEngine()
    }
    return global.db.data.crypto.prices[symbol] || COINS[symbol]?.basePrice || 0
}

// Ambil persentase perubahan harga vs sebelumnya
export function getPriceChange(symbol) {
    const crypto = global.db.data.crypto
    const current = crypto?.prices[symbol] || 0
    const prev = crypto?.prevPrices[symbol] || current
    if (!prev) return 0
    return ((current - prev) / prev) * 100
}

// Generate mini grafik ASCII dari history
export function getMiniChart(symbol) {
    const history = global.db.data.crypto?.priceHistory[symbol] || []
    if (history.length < 2) return '─────'
    
    const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
    const min = Math.min(...history)
    const max = Math.max(...history)
    const range = max - min || 1

    return history.slice(-7).map(p => {
        const idx = Math.floor(((p - min) / range) * (blocks.length - 1))
        return blocks[idx]
    }).join('')
}

// Format angka ke string rapi
export function formatNum(num) {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
    return num.toLocaleString('id')
}

// Validasi simbol koin
export function isValidCoin(symbol) {
    return symbol?.toUpperCase() in COINS
}