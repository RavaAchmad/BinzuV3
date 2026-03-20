import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// ══════════════════════════════════════════════════════════════
// KONFIGURASI
// ══════════════════════════════════════════════════════════════
const HOME      = process.env.HOME || '/home/container';
const CACHE_DIR = `${HOME}/.spotiflac`;
const CACHE_FILE = `${CACHE_DIR}/cache.json`;

// Interval cek update endpoint dari GitHub (default 24 jam)
// Supaya ga kena rate limit GitHub (60 req/jam untuk unauthenticated)
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Pesan error untuk user — semua error teknis disembunyiin
const USER_ERROR_MSG =
  `❌ Waduh, ada yang error nih!\n\n` +
  `Tolong laporkan ke admin dengan info berikut:\n` +
  `• Command yang dipakai\n` +
  `• URL yang dicoba\n` +
  `• Waktu kejadian\n\n` +
  `Tim kami akan segera cek. Makasih udah lapor! 🙏`;

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// ══════════════════════════════════════════════════════════════
// ENDPOINT DEFAULTS
// Diambil dari: deepwiki.com/afkarxyz/SpotiFLAC/7.2-third-party-api-endpoints
// ══════════════════════════════════════════════════════════════
const DEFAULT_TIDAL_ENDPOINTS = [
  'https://vogel.qqdl.site',
  'https://maus.qqdl.site',
  'https://hund.qqdl.site',
  'https://katze.qqdl.site',
  'https://wolf.qqdl.site',
  'https://tidal.kinoplus.online',
  'https://tidal-api.binimum.org',
  'https://triton.squid.wtf',
];

const DEFAULT_QOBUZ_ENDPOINTS = [
  'https://dab.yeet.su/api/stream?trackId=',
  'https://dabmusic.xyz/api/stream?trackId=',
  'https://qobuz.squid.wtf/api/download-music?track_id=',
];

// Tidal OAuth credentials (dari source SpotiFLAC)
const TIDAL_CLIENT_ID     = Buffer.from('NkJEU1JkcEs5aHFFQlRnVQ==', 'base64').toString();
const TIDAL_CLIENT_SECRET = Buffer.from('eGV1UG1ZN25icFo5SUliTEFjUTkzc2hrYTFWTmhlVUFxTjZJY3N6alRHOD0=', 'base64').toString();

// Qobuz app_id (dari source SpotiFLAC)
const QOBUZ_APP_ID = '798273057';

// ══════════════════════════════════════════════════════════════
// AUTO-UPDATE SYSTEM
// Cek GitHub commits untuk file tidal.go & qobuz.go
// Kalau ada perubahan, parse endpoint baru dari raw file
// Rate limit aman: cek 1x per 24 jam (GitHub limit 60 req/jam)
// ══════════════════════════════════════════════════════════════
const GITHUB_API  = 'https://api.github.com/repos/afkarxyz/SpotiFLAC/commits';
const GITHUB_RAW  = 'https://raw.githubusercontent.com/afkarxyz/SpotiFLAC/main/backend';

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return {
      lastChecked: 0,
      tidalCommitSha: '',
      qobuzCommitSha: '',
      tidalEndpoints: DEFAULT_TIDAL_ENDPOINTS,
      qobuzEndpoints: DEFAULT_QOBUZ_ENDPOINTS,
    };
  }
}

function saveCache(data) {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2)); } catch (_) {}
}

// Parse endpoint dari source Go — ambil string yang cocok pola URL
function parseEndpointsFromGoSource(source, pattern) {
  const matches = [...source.matchAll(pattern)];
  return matches.map(m => m[1]).filter(Boolean);
}

async function checkAndUpdateEndpoints() {
  const cache = loadCache();
  const now   = Date.now();

  // Skip kalau belum waktunya — hindari rate limit
  if (now - cache.lastChecked < UPDATE_INTERVAL_MS) {
    return cache;
  }

  console.log('[SPOTIFLAC][UPDATE] Cek update endpoint dari GitHub...');

  try {
    // Cek latest commit untuk tidal.go
    const tidalCommitRes = await fetch(
      `${GITHUB_API}?path=backend/tidal.go&per_page=1`,
      { headers: { 'User-Agent': 'SpotiFLAC-Bot/1.0' }, timeout: 10_000 }
    );

    // Kalau kena rate limit (403/429), skip update — pakai cache
    if (!tidalCommitRes.ok) {
      console.log(`[SPOTIFLAC][UPDATE] GitHub rate limit / error: ${tidalCommitRes.status}. Pakai cache.`);
      cache.lastChecked = now;
      saveCache(cache);
      return cache;
    }

    const tidalCommits = await tidalCommitRes.json();
    const latestTidalSha = tidalCommits?.[0]?.sha || '';

    // Kalau SHA sama, ga perlu fetch raw file
    if (latestTidalSha && latestTidalSha === cache.tidalCommitSha) {
      console.log('[SPOTIFLAC][UPDATE] Endpoint tidal.go tidak berubah.');
    } else if (latestTidalSha) {
      // SHA berubah — fetch dan parse ulang
      console.log('[SPOTIFLAC][UPDATE] tidal.go berubah! Ambil endpoint baru...');
      const rawRes = await fetch(`${GITHUB_RAW}/tidal.go`, {
        headers: { 'User-Agent': 'SpotiFLAC-Bot/1.0' }, timeout: 10_000
      });

      if (rawRes.ok) {
        const source = await rawRes.text();
        // Cari pola base64 decode yang cocok → URL pattern qqdl.site dan lainnya
        const decoded = [];
        const b64Matches = [...source.matchAll(/base64\.StdEncoding\.DecodeString\("([A-Za-z0-9+/=]+)"\)/g)];
        for (const m of b64Matches) {
          try {
            const d = Buffer.from(m[1], 'base64').toString();
            if (d.startsWith('http')) decoded.push(d);
          } catch (_) {}
        }

        if (decoded.length > 0) {
          cache.tidalEndpoints = decoded;
          cache.tidalCommitSha = latestTidalSha;
          console.log(`[SPOTIFLAC][UPDATE] Tidal endpoints diperbarui: ${decoded.length} endpoint.`);
        }
      }
    }

    // Cek qobuz.go juga
    const qobuzCommitRes = await fetch(
      `${GITHUB_API}?path=backend/qobuz.go&per_page=1`,
      { headers: { 'User-Agent': 'SpotiFLAC-Bot/1.0' }, timeout: 10_000 }
    );

    if (qobuzCommitRes.ok) {
      const qobuzCommits = await qobuzCommitRes.json();
      const latestQobuzSha = qobuzCommits?.[0]?.sha || '';

      if (latestQobuzSha && latestQobuzSha !== cache.qobuzCommitSha) {
        console.log('[SPOTIFLAC][UPDATE] qobuz.go berubah! Ambil endpoint baru...');
        const rawRes = await fetch(`${GITHUB_RAW}/qobuz.go`, {
          headers: { 'User-Agent': 'SpotiFLAC-Bot/1.0' }, timeout: 10_000
        });

        if (rawRes.ok) {
          const source = await rawRes.text();
          const decoded = [];
          const b64Matches = [...source.matchAll(/base64\.StdEncoding\.DecodeString\("([A-Za-z0-9+/=]+)"\)/g)];
          for (const m of b64Matches) {
            try {
              const d = Buffer.from(m[1], 'base64').toString();
              if (d.startsWith('http')) decoded.push(d);
            } catch (_) {}
          }

          if (decoded.length > 0) {
            cache.qobuzEndpoints = decoded;
            cache.qobuzCommitSha = latestQobuzSha;
            console.log(`[SPOTIFLAC][UPDATE] Qobuz endpoints diperbarui: ${decoded.length} endpoint.`);
          }
        }
      }
    }

    cache.lastChecked = now;
    saveCache(cache);
    return cache;

  } catch (e) {
    console.error('[SPOTIFLAC][UPDATE] Gagal cek GitHub:', e.message);
    // Jangan crash — pakai cache/default yang ada
    cache.lastChecked = now;
    saveCache(cache);
    return cache;
  }
}

// ══════════════════════════════════════════════════════════════
// STEP 1: Ambil metadata + ISRC dari Spotify URL
// Pakai oEmbed (tanpa auth) untuk judul, lalu song.link untuk ISRC
// ══════════════════════════════════════════════════════════════
async function getSpotifyMetadata(spotifyUrl) {
  // oEmbed → title, thumbnail (no auth required)
  const oembedRes = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`,
    { timeout: 10_000 }
  );
  if (!oembedRes.ok) throw new Error(`Spotify oEmbed error: ${oembedRes.status}`);
  const oembed = await oembedRes.json();

  return {
    title:     oembed.title     || 'Unknown Title',
    thumbnail: oembed.thumbnail_url || '',
  };
}

// ══════════════════════════════════════════════════════════════
// STEP 2: Resolve Spotify URL → Tidal URL via song.link
// ══════════════════════════════════════════════════════════════
async function resolveViaOdesli(spotifyUrl) {
  const res = await fetch(
    `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(spotifyUrl)}`,
    { timeout: 15_000 }
  );
  if (!res.ok) throw new Error(`song.link error: ${res.status}`);
  const data = await res.json();

  // Ambil Tidal track ID dari response
  const tidalLink = data?.linksByPlatform?.tidal?.url || '';
  const tidalId   = tidalLink.match(/track\/(\d+)/)?.[1] || '';

  // Ambil ISRC dari entities (untuk Qobuz fallback)
  const entities = Object.values(data?.entitiesByUniqueId || {});
  const isrc = entities.find(e => e.isrc)?.isrc || '';

  return { tidalId, isrc };
}

// ══════════════════════════════════════════════════════════════
// STEP 3A: Download via Tidal
// Parallel race ke semua 8 endpoint — siapa duluan yang menang
// ══════════════════════════════════════════════════════════════
async function getTidalAccessToken() {
  const creds   = Buffer.from(`${TIDAL_CLIENT_ID}:${TIDAL_CLIENT_SECRET}`).toString('base64');
  const res     = await fetch('https://auth.tidal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body:    'grant_type=client_credentials',
    timeout: 10_000,
  });
  if (!res.ok) throw new Error(`Tidal OAuth error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function downloadFromTidal(tidalId, endpoints) {
  const token = await getTidalAccessToken();

  // Race semua endpoint secara parallel — pakai yang pertama sukses
  const result = await Promise.any(
    endpoints.map(async (base) => {
      const res = await fetch(
        `${base}/api/getStreamUrl?trackId=${tidalId}&quality=LOSSLESS`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 15_000,
        }
      );
      if (!res.ok) throw new Error(`${base}: HTTP ${res.status}`);
      const data = await res.json();

      // Handle V1 format (direct URL)
      if (data.url) return { url: data.url, format: 'flac' };

      // Handle V2 format (manifest)
      if (data.manifest) {
        const manifest = Buffer.from(data.manifest, 'base64').toString();
        // BTS format — ada direct URL
        const parsed = JSON.parse(manifest);
        if (parsed.url) return { url: parsed.url, format: 'flac' };
        // DASH format — ambil URL pertama dari segments
        const urlMatch = manifest.match(/https?:\/\/[^\s<"]+\.flac[^\s<"]*/);
        if (urlMatch) return { url: urlMatch[0], format: 'flac' };
      }
      throw new Error(`${base}: response format tidak dikenali`);
    })
  );

  return result;
}

// ══════════════════════════════════════════════════════════════
// STEP 3B: Download via Qobuz (fallback kalau Tidal gagal)
// Sequential — coba satu per satu
// ══════════════════════════════════════════════════════════════
async function getQobuzTrackId(isrc) {
  const res = await fetch(
    `https://www.qobuz.com/api.json/0.2/track/search?query=${isrc}&limit=1&app_id=${QOBUZ_APP_ID}`,
    { timeout: 10_000 }
  );
  if (!res.ok) throw new Error(`Qobuz search error: ${res.status}`);
  const data = await res.json();
  const trackId = data?.tracks?.items?.[0]?.id;
  if (!trackId) throw new Error('Qobuz: track tidak ditemukan via ISRC');
  return trackId;
}

async function downloadFromQobuz(isrc, endpoints) {
  const trackId = await getQobuzTrackId(isrc);

  for (const endpoint of endpoints) {
    try {
      // Quality 7 = 24-bit FLAC, fallback ke 6 = 16-bit FLAC
      const res = await fetch(`${endpoint}${trackId}&quality=7`, { timeout: 60_000 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.url) return { url: data.url, format: 'flac' };
    } catch (e) {
      console.error(`[QOBUZ] ${endpoint} gagal:`, e.message);
    }
  }
  throw new Error('Semua Qobuz endpoint gagal');
}

// ══════════════════════════════════════════════════════════════
// STEP 4: Download audio file dari URL ke buffer
// ══════════════════════════════════════════════════════════════
async function downloadAudio(url) {
  const res = await fetch(url, { timeout: 300_000 }); // 5 menit
  if (!res.ok) throw new Error(`Download audio error: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1024) throw new Error('File audio terlalu kecil, kemungkinan corrupt');
  return buffer;
}

// ══════════════════════════════════════════════════════════════
// HELPER LOG
// ══════════════════════════════════════════════════════════════
function logError(context, err) {
  const ts = new Date().toISOString();
  console.error(`[SPOTIFY][${ts}] ${context} | ${err?.message || err}`);
}

// ══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════
let handler = async (m, { conn, args, usedPrefix, command }) => {

  if (!args[0]) {
    throw (
      `🎵 *Spotify Downloader*\n\n` +
      `Kirim URL Spotify ya!\n\n` +
      `*Contoh track:*\n` +
      `${usedPrefix + command} https://open.spotify.com/track/xxx\n\n` +
      `*Contoh album:*\n` +
      `${usedPrefix + command} https://open.spotify.com/album/xxx\n\n` +
      `*Contoh playlist:*\n` +
      `${usedPrefix + command} https://open.spotify.com/playlist/xxx`
    );
  }

  const isUrl = /https:\/\/open\.spotify\.com\/(track|album|playlist)/i.test(args[0]);
  if (!isUrl) {
    throw (
      `⚠️ Format URL tidak dikenali.\n\n` +
      `Pastikan link dari Spotify:\n` +
      `open.spotify.com/track/...\n` +
      `open.spotify.com/album/...\n` +
      `open.spotify.com/playlist/...`
    );
  }

  const spotifyUrl = args[0].split('?')[0]; // buang ?si= tracking param
  m.reply(`⏳ Lagi proses, tunggu bentar ya...`);

  try {
    // Load endpoint cache + auto-update kalau sudah waktunya
    // Fire and forget — ga perlu await biar ga delay user
    const cache = await checkAndUpdateEndpoints();
    const tidalEndpoints = cache.tidalEndpoints?.length ? cache.tidalEndpoints : DEFAULT_TIDAL_ENDPOINTS;
    const qobuzEndpoints = cache.qobuzEndpoints?.length ? cache.qobuzEndpoints : DEFAULT_QOBUZ_ENDPOINTS;

    // Step 1: Metadata Spotify
    const meta = await getSpotifyMetadata(spotifyUrl);

    // Step 2: Resolve ke Tidal + ISRC via song.link
    const { tidalId, isrc } = await resolveViaOdesli(spotifyUrl);

    let audioBuffer, fileExt;

    // Step 3A: Coba Tidal dulu (FLAC lossless, parallel race)
    try {
      if (!tidalId) throw new Error('Tidal ID tidak ditemukan via song.link');
      const { url, format } = await downloadFromTidal(tidalId, tidalEndpoints);
      audioBuffer = await downloadAudio(url);
      fileExt     = format; // 'flac'
      console.log(`[SPOTIFY] Tidal sukses: ${meta.title}`);
    } catch (tidalErr) {
      console.error(`[SPOTIFY] Tidal gagal: ${tidalErr.message}. Fallback ke Qobuz...`);

      // Step 3B: Fallback ke Qobuz (sequential)
      if (!isrc) throw new Error('ISRC tidak ditemukan — Qobuz tidak bisa dipakai');
      const { url, format } = await downloadFromQobuz(isrc, qobuzEndpoints);
      audioBuffer = await downloadAudio(url);
      fileExt     = format;
      console.log(`[SPOTIFY] Qobuz sukses: ${meta.title}`);
    }

    const MAX_SIZE_MB = 95;
    const sizeMB      = audioBuffer.length / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      logError('FILE_TOO_LARGE', new Error(`${sizeMB.toFixed(1)} MB | ${spotifyUrl}`));
      throw new Error('__TOOLARGE__');
    }

    const fileName = `${meta.title.replace(/[/\\?%*:|"<>]/g, '-')}.${fileExt}`;
    const mimetype = fileExt === 'flac' ? 'audio/flac' : 'audio/mpeg';

    await conn.sendMessage(m.chat, {
      audio:    audioBuffer,
      mimetype,
      fileName,
    }, { quoted: m });

  } catch (e) {
    if (e.message === '__TOOLARGE__') {
      throw `⚠️ Ukuran file terlalu besar untuk dikirim via WhatsApp.\nCoba lagu lain ya!`;
    }
    logError('HANDLER', e);
    throw USER_ERROR_MSG;
  }
};

handler.help    = ['spotify'];
handler.command = /^(spotify)$/i;
handler.tags    = ['downloader'];
handler.limit   = true;

export default handler;