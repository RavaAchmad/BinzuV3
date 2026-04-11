import { makeCacheableSignalKeyStore, useMultiFileAuthState, Browsers, DisconnectReason, fetchLatestBaileysVersion } from 'baileys';
import pino from 'pino';
import chalk from 'chalk';
import { readdirSync, unlinkSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import readline from 'readline';
import dns from 'dns/promises';

// =============================================
//  CONNECTION STATE & CONSTANTS
// =============================================

const CONNECTION_STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  OPEN: 'open',
  CLOSING: 'closing',
  CLOSED: 'closed',
  RECONNECTING: 'reconnecting',
};

const RECONNECT = {
  BASE_DELAY: 2000,       // 2s base delay
  MAX_DELAY: 60000,       // 60s max delay
  MAX_ATTEMPTS: 15,       // 15 attempts before long pause
  JITTER_FACTOR: 0.3,     // 30% random jitter to avoid thundering herd
  COOLDOWN_AFTER_MAX: 120000, // 2 min cooldown setelah max attempts, lalu reset
};

const HEALTH = {
  KEEP_ALIVE_INTERVAL: 25000,  // 25s keep-alive
  PRESENCE_INTERVAL: 60000,    // 60s presence ping
  ZOMBIE_THRESHOLD: 300000,    // 5 min tanpa message = suspect zombie
  ZOMBIE_CHECK_INTERVAL: 120000, // Check zombie tiap 2 menit
  STREAM_TIMEOUT: 45000,       // 45s timeout for stream errors
};

// Error classification
const ERROR_CLASS = {
  FATAL: 'fatal',           // loggedOut — don't reconnect
  SESSION: 'session',       // bad mac, no session — clear pre-keys then reconnect
  TRANSIENT: 'transient',   // timeout, network — just reconnect
  RATE_LIMIT: 'rate_limit', // 429/rate limited — long backoff
  RESTART: 'restart',       // restartRequired — immediate reconnect
  UNKNOWN: 'unknown',       // fallback — reconnect with backoff
};

// Tracking state — shared across all connection instances
let _connState = CONNECTION_STATE.IDLE;
let _reconnectAttempt = 0;
let _lastConnectedAt = 0;
let _lastMessageAt = Date.now();
let _totalReconnects = 0;
let _consecutiveSessionErrors = 0;
let _healthTimers = [];

export const messageTemplates = {
  welcome: "*@user*\n*𝚑𝚊𝚜 𝚓𝚘𝚒𝚗𝚎𝚍 𝚝𝚑𝚎 𝚐𝚛𝚘𝚞𝚙*\n\n𝙱𝚎𝚏𝚘𝚛𝚎 𝚌𝚑𝚊𝚝𝚝𝚒𝚗𝚐, 𝚍𝚘𝚗'𝚝 𝚏𝚘𝚛𝚐𝚎𝚝 𝚝𝚘 𝚛𝚎𝚊𝚍 𝚝𝚑𝚎 𝚐𝚛𝚘𝚞𝚙 𝚛𝚞𝚕𝚎𝚜",
  bye: "*@user* *𝚑𝚊𝚜 𝚕𝚎𝚏𝚝 𝚝𝚑𝚎 𝚐𝚛𝚘𝚞𝚙*",
  promote: "@user sekarang admin!",
  demote: "@user sekarang bukan admin!",
  desc: "Deskripsi telah diubah ke \n@desc",
  subject: "Judul grup telah diubah ke \n@subject",
  icon: "Icon grup telah diubah!",
  revoke: "Link group telah diubah ke \n@revoke"
};

// =============================================
//  UTILITY FUNCTIONS
// =============================================

/** Exponential backoff with jitter */
function getBackoffDelay(attempt) {
  const exponential = Math.min(RECONNECT.BASE_DELAY * Math.pow(2, attempt), RECONNECT.MAX_DELAY);
  const jitter = exponential * RECONNECT.JITTER_FACTOR * Math.random();
  return Math.floor(exponential + jitter);
}

/** Classify disconnect error */
function classifyError(lastDisconnect) {
  if (!lastDisconnect?.error) return { type: ERROR_CLASS.UNKNOWN, code: 0, msg: '' };

  const error = lastDisconnect.error;
  const code = error.output?.statusCode || error.statusCode || 0;
  const msg = (error.message || '').toLowerCase();

  // Fatal — device logged out
  if (code === DisconnectReason.loggedOut) {
    return { type: ERROR_CLASS.FATAL, code, msg };
  }

  // Restart required by server
  if (code === DisconnectReason.restartRequired) {
    return { type: ERROR_CLASS.RESTART, code, msg };
  }

  // Rate limited
  if (code === 429 || msg.includes('rate') || msg.includes('too many')) {
    return { type: ERROR_CLASS.RATE_LIMIT, code, msg };
  }

  // Session/encryption errors  
  if (
    msg.includes('bad mac') || msg.includes('mac validation') ||
    msg.includes('no session') || msg.includes('session error') ||
    msg.includes('failed to decrypt') || msg.includes('invalid prekey') ||
    msg.includes('hmac') || msg.includes('decrypt')
  ) {
    return { type: ERROR_CLASS.SESSION, code, msg };
  }

  // Transient network errors
  if (
    code === DisconnectReason.connectionClosed ||
    code === DisconnectReason.connectionLost ||
    code === DisconnectReason.connectionReplaced ||
    code === DisconnectReason.timedOut ||
    msg.includes('timeout') || msg.includes('econnreset') ||
    msg.includes('enotfound') || msg.includes('econnrefused') ||
    msg.includes('socket hang up') || msg.includes('network')
  ) {
    return { type: ERROR_CLASS.TRANSIENT, code, msg };
  }

  return { type: ERROR_CLASS.UNKNOWN, code, msg };
}

/** Check if we have internet by resolving WA server */
async function hasInternet() {
  try {
    await dns.resolve4('web.whatsapp.com');
    return true;
  } catch {
    return false;
  }
}

/** Wait for internet to come back, with logging */
async function waitForInternet(maxWaitMs = 120000) {
  const start = Date.now();
  let logged = false;
  while (Date.now() - start < maxWaitMs) {
    if (await hasInternet()) return true;
    if (!logged) {
      console.log(chalk.yellow('[NET] Tidak ada internet, menunggu koneksi kembali...'));
      logged = true;
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  return false;
}

// =============================================
//  SESSION MANAGEMENT
// =============================================

export async function clearsession() {
  try {
    if (!existsSync('./sessions')) return;
    const filesToClear = readdirSync('./sessions').filter(file => file.startsWith('pre-key-'));
    filesToClear.forEach(file => {
      unlinkSync(`./sessions/${file}`);
    });
    if (filesToClear.length > 0) {
      console.log(chalk.bold.green(`Session dibersihkan (${filesToClear.length} pre-keys dihapus)`));
    }
  } catch (e) {
    console.error(chalk.red('Gagal membersihkan session:', e));
  }
}

/** Backup session credentials before risky operations */
function backupSession(authFile) {
  try {
    const backupDir = `${authFile}_backup`;
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
    
    if (!existsSync(authFile)) return;
    const files = readdirSync(authFile).filter(f => f.endsWith('.json'));
    for (const file of files) {
      copyFileSync(join(authFile, file), join(backupDir, file));
    }
    console.log(chalk.gray(`[~] Session backup saved (${files.length} files)`));
  } catch (e) {
    // Non-critical, don't block on backup failures
  }
}

/** Clear stale pre-keys (fixes most session/bad-mac errors) */
function clearStalePreKeys(authFile) {
  try {
    if (!existsSync(authFile)) return 0;
    const preKeys = readdirSync(authFile).filter(f => f.startsWith('pre-key-'));
    for (const file of preKeys) {
      unlinkSync(join(authFile, file));
    }
    if (preKeys.length > 0) {
      console.log(chalk.yellow(`[SESSION] Cleared ${preKeys.length} stale pre-keys`));
    }
    return preKeys.length;
  } catch {
    return 0;
  }
}

// =============================================
//  HEALTH MONITORING (built into connection)
// =============================================

function startHealthMonitoring(conn) {
  // Clear any existing timers
  stopHealthMonitoring();

  // 1. Presence keep-alive — keeps WA server from dropping idle connections
  _healthTimers.push(setInterval(() => {
    if (_connState === CONNECTION_STATE.OPEN && conn?.user) {
      conn.sendPresenceUpdate('available').catch(() => {});
    }
  }, HEALTH.PRESENCE_INTERVAL));

  // 2. Zombie detection — detect connections that look open but are actually dead
  _healthTimers.push(setInterval(async () => {
    if (_connState !== CONNECTION_STATE.OPEN || !conn?.user) return;

    const timeSinceMsg = Date.now() - _lastMessageAt;
    if (timeSinceMsg > HEALTH.ZOMBIE_THRESHOLD) {
      console.log(chalk.yellow(`[ZOMBIE] ${Math.round(timeSinceMsg / 60000)}m tanpa pesan — cek koneksi...`));
      try {
        // Try sending presence as a connection test
        await Promise.race([
          conn.sendPresenceUpdate('available'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]);
        // If presence succeeds, connection is fine — just no messages
        _lastMessageAt = Date.now();
      } catch {
        console.log(chalk.red('[ZOMBIE] Koneksi mati — force reconnect...'));
        _connState = CONNECTION_STATE.CLOSED;
        await global.reloadHandler(true).catch(() => {});
      }
    }
  }, HEALTH.ZOMBIE_CHECK_INTERVAL));

  // 3. Track incoming messages to detect zombie state
  conn.ev.on('messages.upsert', () => {
    _lastMessageAt = Date.now();
  });
}

function stopHealthMonitoring() {
  for (const timer of _healthTimers) {
    clearInterval(timer);
  }
  _healthTimers = [];
}

// =============================================
//  CONNECTION UPDATE HANDLER
// =============================================

export async function connectionUpdate(update, conn) {
  const { receivedPendingNotifications, connection, lastDisconnect, isOnline, isNewLogin, qr } = update;

  if (isNewLogin) conn.isInit = true;
  global.timestamp.connect = new Date();

  // --- State: CONNECTING ---
  if (connection === 'connecting') {
    _connState = CONNECTION_STATE.CONNECTING;
    console.log(chalk.cyan('[~] Menghubungkan ke WhatsApp...'));
  }

  // --- State: OPEN ---
  if (connection === 'open') {
    _connState = CONNECTION_STATE.OPEN;
    _reconnectAttempt = 0;
    _consecutiveSessionErrors = 0;
    _lastConnectedAt = Date.now();
    _lastMessageAt = Date.now();
    conn._disconnectCount = 0;
    conn._isReconnecting = false;

    const uptime = _totalReconnects > 0 ? ` (reconnect #${_totalReconnects})` : '';
    console.log(chalk.green(`[✓] Connected${uptime}`));

    // Start health monitoring on new connection
    startHealthMonitoring(conn);
  }

  // --- Online/Offline status ---
  if (isOnline === true) console.log(chalk.green('[✓] Status: Online'));
  if (isOnline === false) console.log(chalk.red('[✗] Status: Offline'));

  // --- Pending notifications ---
  if (receivedPendingNotifications) {
    console.log(chalk.yellow('[~] Memproses pesan pending...'));
  }

  // --- State: CLOSE --- reconnect logic
  if (connection === 'close') {
    _connState = CONNECTION_STATE.CLOSED;
    conn._disconnectCount = (conn._disconnectCount || 0) + 1;

    if (!lastDisconnect) {
      console.log(chalk.red('[!] Koneksi tertutup tanpa error info — reconnecting...'));
      await _doReconnect(conn);
      return;
    }

    const { type, code, msg } = classifyError(lastDisconnect);

    console.log(chalk.red(`[✗] Disconnected — class: ${type}, code: ${code}`));
    if (msg) console.log(chalk.gray(`    error: ${msg.substring(0, 120)}`));

    switch (type) {
      case ERROR_CLASS.FATAL:
        console.log(chalk.red.bold('[FATAL] Device logged out! Harus scan ulang QR / pairing code.'));
        stopHealthMonitoring();
        return false;

      case ERROR_CLASS.RESTART:
        console.log(chalk.cyan('[~] Server minta restart — reconnect langsung...'));
        _reconnectAttempt = 0; // restart = immediate, no backoff
        await _doReconnect(conn);
        break;

      case ERROR_CLASS.SESSION:
        _consecutiveSessionErrors++;
        console.log(chalk.yellow(`[SESSION] Error #${_consecutiveSessionErrors}`));

        // After 3 consecutive session errors, clear pre-keys
        if (_consecutiveSessionErrors >= 3) {
          console.log(chalk.yellow('[SESSION] 3x session error — membersihkan pre-keys...'));
          backupSession(global.authFile || 'sessions');
          clearStalePreKeys(global.authFile || 'sessions');
          _consecutiveSessionErrors = 0;
        }
        await _doReconnect(conn);
        break;

      case ERROR_CLASS.RATE_LIMIT:
        const rlDelay = 30000 + Math.random() * 30000; // 30-60s random
        console.log(chalk.yellow(`[RATE-LIMIT] Tunggu ${Math.round(rlDelay / 1000)}s sebelum reconnect...`));
        await new Promise(r => setTimeout(r, rlDelay));
        await _doReconnect(conn);
        break;

      case ERROR_CLASS.TRANSIENT:
      case ERROR_CLASS.UNKNOWN:
      default:
        await _doReconnect(conn);
        break;
    }
  }

  return false;
}

/** Internal reconnect orchestrator */
async function _doReconnect(conn) {
  if (_connState === CONNECTION_STATE.RECONNECTING) {
    console.log(chalk.gray('[~] Sudah ada proses reconnect berjalan, skip...'));
    return;
  }

  _connState = CONNECTION_STATE.RECONNECTING;
  _reconnectAttempt++;
  _totalReconnects++;

  // Check if we've exceeded max attempts → long cooldown
  if (_reconnectAttempt > RECONNECT.MAX_ATTEMPTS) {
    console.log(chalk.red(`[!] ${RECONNECT.MAX_ATTEMPTS}x reconnect gagal.`));
    console.log(chalk.yellow(`[~] Cooldown ${RECONNECT.COOLDOWN_AFTER_MAX / 1000}s lalu coba lagi...`));

    // Wait for internet first
    const hasNet = await waitForInternet(RECONNECT.COOLDOWN_AFTER_MAX);
    if (!hasNet) {
      console.log(chalk.red('[!] Masih tidak ada internet setelah cooldown. Tetap coba...'));
    }

    _reconnectAttempt = 1; // Reset counter
  }

  // Wait for internet before reconnecting
  if (!(await hasInternet())) {
    const gotNet = await waitForInternet(30000);
    if (!gotNet) {
      console.log(chalk.yellow('[NET] Internet belum kembali, tetap coba reconnect...'));
    }
  }

  const delay = getBackoffDelay(_reconnectAttempt - 1);
  console.log(chalk.cyan(`[~] Reconnect #${_reconnectAttempt} dalam ${(delay / 1000).toFixed(1)}s...`));

  await new Promise(r => setTimeout(r, delay));

  try {
    await global.reloadHandler(true);
  } catch (err) {
    console.error(chalk.red('[!] Reconnect gagal:'), err.message);
    _connState = CONNECTION_STATE.CLOSED;
    // Will be retried on next connectionUpdate close event
  }
}

// =============================================
//  PAIRING / AUTHENTICATION
// =============================================

export async function handlePairing(conn, opts) {
  if (!conn.authState.creds.registered) {
    console.clear();
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(chalk.bold.green("=============================================="));
    console.log(chalk.bold.yellow("           WHATSAPP BOT AUTHENTICATION          "));
    console.log(chalk.bold.green("=============================================="));

    const rl = readline.createInterface({ 
      input: process.stdin, 
      output: process.stdout 
    });

    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    try {
      let phoneNumber;
      while (true) {
        console.log(chalk.bold.white("\nEnter WhatsApp number (example: 6281234567890):"));
        phoneNumber = await question(chalk.green("> "));
        phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

        if (phoneNumber.match(/^\d{10,}$/)) break;
        console.log(chalk.bold.red("\nWrong number format! Use format 6281234567890"));
      }

      console.log(chalk.bold.blue("\nCreating authentication code..."));
      await new Promise(resolve => setTimeout(resolve, 3000));

      const pairingCode = await conn.requestPairingCode(phoneNumber);
      const formattedCode = pairingCode?.match(/.{1,4}/g)?.join("-") || pairingCode;

      console.clear();
      console.log(chalk.bold.green("=============================================="));
      console.log(chalk.bold.yellow("           WHATSAPP AUTHENTICATION CODE          "));
      console.log(chalk.bold.green("=============================================="));
      console.log(chalk.bold.white("\nNumber: ") + chalk.cyan(phoneNumber));
      console.log(chalk.bold.white("Code : ") + chalk.yellow.bold(formattedCode));
      console.log(chalk.bold.green("\nUsage Instructions:"));
      console.log(chalk.white("1. Make sure the WhatsApp number is active"));
      console.log(chalk.white("2. Open WhatsApp on your phone"));
      console.log(chalk.white("3. Go to Settings → Linked Devices"));
      console.log(chalk.white("4. Select 'Link a Device'"));
      console.log(chalk.white("5. Enter the code above within 3 minutes"));
      console.log(chalk.bold.green("\n=============================================="));

      conn.ev.on("connection.update", (update) => {
        if (update.connection === "open") {
          console.log(chalk.green("\nSuccessfully connected!"));
          rl.close();
        }
      });
    } catch (error) {
      console.error(chalk.red("\nAuthentication error:", error));
    } finally {
      rl.close();
    }
  }
}

// =============================================
//  CONNECTION FACTORY
// =============================================

export async function createConnection(authFile, opts) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(authFile);
    const { version } = await fetchLatestBaileysVersion();

    console.log(chalk.cyan(`[~] Baileys v${version.join('.')} | Node ${process.version}`));

    const connectionOptions = {
      version,
      logger: pino({ level: 'silent' }),
      browser: Browsers.macOS('Chrome'),
      generateHighQualityLinkPreview: true,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino().child({
          level: 'silent',
          stream: 'store'
        }))
      },
      patchMessageBeforeSending: (message) => {
        const requiresPatch = !!(
          message.buttonsMessage || message.templateMessage || message.listMessage
        );
        if (requiresPatch) {
          message = {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadataVersion: 2,
                  deviceListMetadata: {},
                },
                ...message,
              },
            },
          };
        }
        return message;
      },
      getMessage: async (key) => {
        return { conversation: '' };
      },

      // --- Connection tuning ---
      defaultQueryTimeoutMs: undefined,
      syncFullHistory: false,
      keepAliveIntervalMs: HEALTH.KEEP_ALIVE_INTERVAL,
      emitAllUnreadMessages: false,
      retryRequestDelayMs: 300,
      markOnlineOnConnect: false,
      connectTimeoutMs: 45000,              // 45s connect timeout
      qrTimeout: 60000,                     // 60s QR timeout
      maxMsgRetryCount: 5,                  // Retry sending messages up to 5x
      fireInitQueries: true,                // Fire init queries for faster ready state
    };

    return {
      state,
      saveCreds,
      version,
      connectionOptions
    };
  } catch (error) {
    console.error(chalk.red('Gagal membuat koneksi:', error));
    throw error;
  }
}

// =============================================
//  EXPORTS FOR EXTERNAL STATE ACCESS
// =============================================

export function getConnectionState() {
  return {
    state: _connState,
    reconnectAttempt: _reconnectAttempt,
    totalReconnects: _totalReconnects,
    lastConnectedAt: _lastConnectedAt,
    lastMessageAt: _lastMessageAt,
    uptime: _lastConnectedAt ? Date.now() - _lastConnectedAt : 0,
  };
}

export { stopHealthMonitoring };