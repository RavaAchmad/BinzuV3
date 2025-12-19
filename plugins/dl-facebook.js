// import fetch from 'node-fetch';

// let handler = async (m, { conn, args, usedPrefix, command }) => {  
//     if (!args[0]) throw `Gunakan contoh ${usedPrefix}${command} https://fb.watch/mcx9K6cb6t/?mibextid=8103lRmnirLUhozF`;
    
//     m.reply('⏳ Sedang memproses...');
    
//     try {
//         const res = await fetch(`https://api.ryzumi.vip/api/downloader/fbdl?url=${encodeURIComponent(args[0])}`);
//         const json = await res.json();
        
//         if (!json.status || !json.data || json.data.length === 0) {
//             throw `Tidak dapat mendapatkan video dari tautan yang diberikan`;
//         }
        
//         let videoData = json.data.find(v => v.resolution && v.resolution.includes('HD')) || json.data[0];
        
//         if (!videoData || !videoData.url) {
//             throw `URL video tidak ditemukan`;
//         }
        
//         await conn.sendFile(
//             m.chat, 
//             videoData.url, 
//             'facebook_video.mp4', 
//             `*Facebook Downloader*\n\n📹 Resolusi: ${videoData.resolution || 'Unknown'}\n✨ Download berhasil!`, 
//             m
//         );
        
//     } catch (error) {
//         console.log(error);
//         throw `Terjadi kesalahan saat mengunduh video Facebook. Pastikan link valid dan coba lagi.`;
//     }
// }

// handler.help = ['facebook'].map(v => v + ' <url>');
// handler.command = /^(fb|facebook|facebookdl|fbdl|fbdown|dlfb)$/i;
// handler.tags = ['downloader'];
// handler.limit = true;
// handler.group = false;
// handler.premium = false;
// handler.owner = false;
// handler.admin = false;
// handler.botAdmin = false;
// handler.fail = null;
// handler.private = false;

// export default handler;


import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const CONFIG = {
    MAX_RETRIES: 3,
    TIMEOUT: 15000,
    ROTATE_IDENTITY: true,
    USE_RANDOM_DELAY: false,
    MIN_DELAY: 100,
    MAX_DELAY: 300,
    PROXY_CACHE_DURATION: 600000,
    PROXY_TEST_TIMEOUT: 3000,
    MAX_CONCURRENT_TESTS: 20,
    MIN_WORKING_PROXIES: 10,
    LATENCY_THRESHOLD: 2000,
    DIRECT_CONNECTION_CHANCE: 0.4
};

const PROXY_SOURCES = [
    'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all',
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
];

const FINGERPRINTS = {
    browsers: [
        { name: 'Chrome', versions: ['120.0.6099.109', '119.0.6045.199'] },
        { name: 'Firefox', versions: ['121.0', '120.0.1'] },
        { name: 'Edge', versions: ['120.0.2210.91', '119.0.2151.97'] }
    ],
    os: [
        'Windows NT 10.0; Win64; x64',
        'Macintosh; Intel Mac OS X 10_15_7',
        'X11; Linux x86_64'
    ],
    languages: ['en-US', 'id-ID', 'en-GB'],
    platforms: ['Win32', 'MacIntel', 'Linux x86_64']
};

class FastProxyManager {
    constructor() {
        this.proxies = [];
        this.fastProxies = [];
        this.lastFetch = 0;
        this.currentIndex = 0;
        this.latencyMap = new Map();
    }

    async fetchProxies() {
        const now = Date.now();
        if (this.fastProxies.length >= CONFIG.MIN_WORKING_PROXIES && 
            (now - this.lastFetch) < CONFIG.PROXY_CACHE_DURATION) {
            return this.fastProxies;
        }

        console.log('[PROXY] Fetching fast proxies...');
        const allProxies = new Set();

        const results = await Promise.allSettled(
            PROXY_SOURCES.map(async (source) => {
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 8000);
                    
                    const response = await fetch(source, { 
                        signal: controller.signal,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    
                    clearTimeout(timeout);
                    const text = await response.text();
                    
                    text.split('\n')
                        .map(line => line.trim())
                        .filter(line => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5}$/.test(line))
                        .slice(0, 50)
                        .forEach(proxy => allProxies.add(`http://${proxy}`));
                } catch (e) {}
            })
        );

        this.proxies = Array.from(allProxies);
        console.log(`[PROXY] Found ${this.proxies.length} proxies, testing speed...`);
        
        await this.testProxiesParallel();
        
        this.lastFetch = now;
        return this.fastProxies;
    }

    async testProxiesParallel() {
        const testChunks = [];
        for (let i = 0; i < this.proxies.length; i += CONFIG.MAX_CONCURRENT_TESTS) {
            testChunks.push(this.proxies.slice(i, i + CONFIG.MAX_CONCURRENT_TESTS));
        }

        for (const chunk of testChunks) {
            const results = await Promise.allSettled(
                chunk.map(proxy => this.measureLatency(proxy))
            );

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value.success) {
                    this.latencyMap.set(chunk[index], result.value.latency);
                }
            });

            if (this.latencyMap.size >= CONFIG.MIN_WORKING_PROXIES) break;
        }

        this.fastProxies = Array.from(this.latencyMap.entries())
            .filter(([proxy, latency]) => latency < CONFIG.LATENCY_THRESHOLD)
            .sort((a, b) => a[1] - b[1])
            .slice(0, 30)
            .map(([proxy]) => proxy);

        console.log(`[PROXY] ${this.fastProxies.length} fast proxies ready (avg: ${this.getAverageLatency()}ms)`);
    }

    async measureLatency(proxy) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), CONFIG.PROXY_TEST_TIMEOUT);
            
            const agent = new HttpsProxyAgent(proxy);
            const startTime = Date.now();
            
            const response = await fetch('https://httpbin.org/ip', {
                signal: controller.signal,
                agent: agent,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            clearTimeout(timeout);
            const latency = Date.now() - startTime;
            
            return response.ok ? { success: true, latency } : { success: false };
        } catch {
            return { success: false };
        }
    }

    getFastestProxy() {
        if (this.fastProxies.length === 0) return null;
        
        if (CONFIG.ROTATE_IDENTITY) {
            return this.fastProxies[Math.floor(Math.random() * Math.min(5, this.fastProxies.length))];
        }
        
        const proxy = this.fastProxies[this.currentIndex % this.fastProxies.length];
        this.currentIndex++;
        return proxy;
    }

    getAverageLatency() {
        if (this.latencyMap.size === 0) return 0;
        const total = Array.from(this.latencyMap.values()).reduce((a, b) => a + b, 0);
        return Math.round(total / this.latencyMap.size);
    }
}

class LightweightFingerprint {
    static generate() {
        const browser = this.rand(FINGERPRINTS.browsers);
        const version = this.rand(browser.versions);
        const os = this.rand(FINGERPRINTS.os);
        
        return {
            browser: browser.name,
            version: version,
            os: os,
            language: this.rand(FINGERPRINTS.languages),
            platform: this.rand(FINGERPRINTS.platforms)
        };
    }

    static generateUA(fp) {
        const templates = {
            'Chrome': `Mozilla/5.0 (${fp.os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${fp.version} Safari/537.36`,
            'Firefox': `Mozilla/5.0 (${fp.os}; rv:${fp.version}) Gecko/20100101 Firefox/${fp.version}`,
            'Edge': `Mozilla/5.0 (${fp.os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${fp.version} Safari/537.36 Edg/${fp.version}`
        };
        return templates[fp.browser] || templates['Chrome'];
    }

    static rand(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}

class FastIPGenerator {
    static generate() {
        const ranges = [
            () => `${this.r(1, 126)}.${this.r(0, 255)}.${this.r(0, 255)}.${this.r(1, 254)}`,
            () => `${this.r(128, 191)}.${this.r(0, 255)}.${this.r(0, 255)}.${this.r(1, 254)}`,
        ];
        return ranges[Math.floor(Math.random() * ranges.length)]();
    }

    static r(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

class FastHeaderGenerator {
    static generate(url) {
        const fp = LightweightFingerprint.generate();
        const ua = LightweightFingerprint.generateUA(fp);
        const ip = FastIPGenerator.generate();
        const urlObj = new URL(url);

        return {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': `${fp.language},en;q=0.9`,
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'X-Forwarded-For': ip,
            'X-Real-IP': ip,
            'CF-Connecting-IP': ip,
            'True-Client-IP': ip,
            'Forwarded': `for=${ip}`,
        };
    }
}

class HighPerformanceFetcher {
    constructor() {
        this.proxyManager = new FastProxyManager();
        this.requestCount = 0;
        this.directSuccess = 0;
        this.proxySuccess = 0;
    }

    async fetch(url, options = {}) {
        const headers = FastHeaderGenerator.generate(url);
        
        const fetchOptions = {
            method: options.method || 'GET',
            headers: { ...headers, ...options.headers },
            timeout: CONFIG.TIMEOUT,
            redirect: 'follow',
            ...options
        };

        const useDirect = Math.random() < CONFIG.DIRECT_CONNECTION_CHANCE;

        if (!useDirect) {
            await this.proxyManager.fetchProxies();
            const proxy = this.proxyManager.getFastestProxy();
            
            if (proxy) {
                try {
                    fetchOptions.agent = new HttpsProxyAgent(proxy);
                    const latency = this.proxyManager.latencyMap.get(proxy) || 'N/A';
                    console.log(`[FETCH] Proxy (${latency}ms): ${new URL(proxy).host}`);
                } catch (e) {
                    console.log('[FETCH] Proxy failed, using direct');
                }
            }
        } else {
            console.log('[FETCH] Direct connection (fastest)');
        }

        if (CONFIG.USE_RANDOM_DELAY) {
            await this.sleep(this.randomInt(CONFIG.MIN_DELAY, CONFIG.MAX_DELAY));
        }

        this.requestCount++;
        return await fetch(url, fetchOptions);
    }

    async fetchWithRetry(url, maxRetries = CONFIG.MAX_RETRIES) {
        let lastError;
        const startTime = Date.now();

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.log(`\n[${attempt + 1}/${maxRetries}] 🚀 Fast fetch...`);
                
                const response = await this.fetch(url);
                const elapsed = Date.now() - startTime;

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                console.log(`[SUCCESS] ✅ ${elapsed}ms`);
                return await response.json();

            } catch (error) {
                console.log(`[FAILED] ❌ ${error.message}`);
                lastError = error;

                if (attempt < maxRetries - 1) {
                    const backoff = Math.min(1000 * Math.pow(1.5, attempt), 3000);
                    console.log(`[RETRY] ⏳ ${Math.round(backoff/1000)}s...`);
                    await this.sleep(backoff);
                }
            }
        }

        throw lastError;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

const fetcher = new HighPerformanceFetcher();

let handler = async (m, { conn, args, usedPrefix, command }) => {  
    if (!args[0]) {
        return m.reply(
            `╭─❏ *HIGH-SPEED DOWNLOADER* ❏\n` +
            `│\n` +
            `│ 📋 Usage: ${usedPrefix}${command} <url>\n` +
            `│ 📌 Example: ${usedPrefix}${command} https://fb.watch/xxx\n` +
            `│\n` +
            `│ ⚡ Performance Features:\n` +
            `│ • Low-Latency Proxy Pool\n` +
            `│ • Fast IP Rotation (<2s)\n` +
            `│ • Direct Connection Priority\n` +
            `│ • Minimal Header Overhead\n` +
            `│ • Parallel Proxy Testing\n` +
            `│ • Smart Retry Logic\n` +
            `│\n` +
            `│ ⚠️ Optimized for Speed\n` +
            `╰─────────────────❏`
        );
    }

    const statusMsg = await m.reply(
        `⚡ *HIGH-SPEED MODE*\n\n` +
        `🚀 Initializing fast connection...\n` +
        `⏱️ Testing proxy latency...\n` +
        `🎯 Selecting fastest route...`
    );

    try {
        const apiUrl = `https://api.ryzumi.vip/api/downloader/fbdl?url=${encodeURIComponent(args[0])}`;

        await conn.sendMessage(m.chat, {
            text: `🔍 *Fetching data*\n⚡ Using optimal route`,
            edit: statusMsg.key
        });

        const json = await fetcher.fetchWithRetry(apiUrl);

        if (!json.status || !json.data || json.data.length === 0) {
            throw new Error('Video not found');
        }

        const videoData = json.data.find(v => v.resolution && v.resolution.includes('HD')) || json.data[0];

        if (!videoData?.url) {
            throw new Error('Invalid video URL');
        }

        await conn.sendMessage(m.chat, {
            text: `📥 *Downloading*\n🎬 ${videoData.resolution}\n⚡ High-speed transfer`,
            edit: statusMsg.key
        });

        const videoResponse = await fetcher.fetch(videoData.url);

        if (!videoResponse.ok) {
            throw new Error(`Download failed: ${videoResponse.status}`);
        }

        const videoBuffer = await videoResponse.buffer();

        await conn.sendMessage(m.chat, {
            text: `✅ *Complete*\n📤 Uploading...`,
            edit: statusMsg.key
        });

        await conn.sendMessage(
            m.chat,
            {
                video: videoBuffer,
                caption: 
                    `✅ *DOWNLOAD COMPLETE*\n\n` +
                    `📹 Resolution: ${videoData.resolution || 'Unknown'}\n` +
                    `⚡ Mode: High-Speed\n` +
                    `🌐 IP: Rotated\n` +
                    `🎯 Route: Optimized\n\n`,
                mimetype: 'video/mp4',
                fileName: `nganu_${Date.now()}.mp4`
            },
            { quoted: m }
        );

    } catch (error) {
        console.error('[ERROR]', error);
        await conn.sendMessage(m.chat, {
            text: 
                `❌ *FAILED*\n\n` +
                `⚠️ ${error.message}\n\n` +
                `💡 Tips:\n` +
                `• Check URL validity\n` +
                `• Verify connection\n` +
                `• Retry in a moment`,
            edit: statusMsg.key
        });
    }
};

handler.help = ['facebook <url>'];
handler.command = /^(fb|facebook|facebookdl|fbdl|fbdown|dlfb)$/i;
handler.tags = ['downloader'];
handler.limit = true;

export default handler;