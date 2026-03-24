process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import express from 'express';
import "./config.js";
import { createRequire as createRequire } from "module";
import path, { join as pathJoin } from "path";
import { fileURLToPath as fileURLToPath, pathToFileURL as pathToFileURL } from "url";
import { platform as processPlatform } from "process";
import * as WebSocket from "ws";
import { 
  readdirSync as readDirSync, 
  statSync as statSync, 
  unlinkSync as unlinkSync, 
  existsSync as existsSync, 
  readFileSync as readFileSync, 
  watch as watchFile 
} from "fs";
import yargs from "yargs";
import { spawn as spawnProcess } from "child_process";
import _ from "lodash";
import { clear as clearConsole } from "console";
import cfonts from "cfonts";
import syntaxError from "syntax-error";
import * as os from "os";
import chalk from "chalk";
import { format as formatUtil } from "util";
import { makeWASocket as makeWASocket, protoType as protoType, serialize as serialize } from "./lib/simple.js";
import { Low as LowDB, JSONFile as JSONFile } from "lowdb";
import pino from "pino";
import { 
  clearsession, 
  connectionUpdate, 
  createConnection,
  handlePairing,
  messageTemplates
} from "./lib/connection.js";
import { setupBadMacHandler } from './lib/bad-mac-handler.js';
import { startCryptoTicker } from './plugins/crypto-ticker.js';

const app = express();
app.use(express.json());

global.__filename = function filename(url = import.meta.url, isWindows = "win32" !== processPlatform) {
  return isWindows 
    ? /file:\/\/\//.test(url) 
      ? fileURLToPath(url) 
      : url 
    : pathToFileURL(url).toString();
};

global.__dirname = function dirname(url) {
  return path.dirname(global.__filename(url, true));
};

global.__require = function require(url = import.meta.url) {
  return createRequire(url);
};

const { CONNECTING: WS_CONNECTING } = WebSocket;
const { chain: lodashChain } = _;

process.env.PORT || process.env.SERVER_PORT;

protoType();
serialize();

global.API = (apiName, endpoint = "/", query = {}, apiKeyName) => {
  const baseUrl = apiName in global.APIs ? global.APIs[apiName] : apiName;
  const queryString = query || apiKeyName 
    ? "?" + new URLSearchParams({
        ...query,
        ...(apiKeyName ? { [apiKeyName]: global.APIKeys[apiName in global.APIs ? global.APIs[apiName] : apiName] } : {})
      })
    : "";
  return baseUrl + endpoint + queryString;
};

global.timestamp = { start: new Date() };
const currentDir = global.__dirname(import.meta.url);

global.opts = new Object(
  yargs(process.argv.slice(2))
    .exitProcess(false)
    .parse()
);

global.prefix = new RegExp(
  "^[" + 
  (opts.prefix || "‎xzXZ/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-")
    .replace(/[|\\{}()[\]^$+*?.\-\^]/g, "\\$&") + 
  "]"
);

global.db = new LowDB(
  /https?:\/\//.test(opts.db || "") 
    ? new cloudDBAdapter(opts.db)
    : /mongodb(\+srv)?:\/\//i.test(opts.db)
      ? opts.mongodbv2
        ? new mongoDBV2(opts.db)
        : new mongoDB(opts.db)
      : new JSONFile((opts._[0] ? opts._[0] + "_" : "") + "database.json")
);

global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) {
    return new Promise(resolve => {
      const interval = setInterval(async () => {
        if (!global.db.READ) {
          clearInterval(interval);
          resolve(global.db.data == null ? await global.loadDatabase() : global.db.data);
        }
      }, 1000);
    });
  }

  if (global.db.data === null) {
    global.db.READ = true;
    await global.db.read().catch(console.error);
    global.db.READ = null;
    
    global.db.data = {
      users: {},
      chats: {},
      stats: {},
      msgs: {},
      banned: {},
      sticker: {},
      settings: {},
      ...(global.db.data || {})
    };
    
    global.db.chain = lodashChain(global.db.data);
  }
};

await loadDatabase();
global.authFile = `${opts._[0] || "sessions"}`;
console.log(`Load AuthFile from ${global.authFile}`);

const { 
  connectionOptions: connectionOptions, 
  state: connectionState, 
  saveCreds: saveCredentials 
} = await createConnection(global.authFile, global.opts);

global.conn = await makeWASocket(connectionOptions);
conn.isInit = false;

// Apply message templates
Object.assign(conn, {
  welcome: messageTemplates.welcome,
  bye: messageTemplates.bye,
  spromote: messageTemplates.promote,
  sdemote: messageTemplates.demote,
  sDesc: messageTemplates.desc,
  sSubject: messageTemplates.subject,
  sIcon: messageTemplates.icon,
  sRevoke: messageTemplates.revoke
});

// ========== BAD MAC ERROR HANDLING ==========
setupBadMacHandler(conn);
console.log(chalk.cyan('[~] Bad MAC error handler initialized'));
// ========== END BAD MAC HANDLING ==========

// ========== KEEP-ALIVE & PROTECTION MECHANISM ==========
conn._lastMessageTime = Date.now();
conn._disconnectCount = 0;
conn._isReconnecting = false;

// Health check setiap 60 detik
setInterval(() => {
  if (conn.user) {
    const timeSinceLastMessage = Date.now() - conn._lastMessageTime;
    if (timeSinceLastMessage > 300000) { // 5 menit tanpa aktivitas
      console.log(chalk.yellow('[!] No activity detected. Sending keep-alive ping...'));
      try {
        conn.sendPresenceUpdate('available', conn.user.id);
      } catch (e) {
        console.log(chalk.red('[!] Keep-alive failed, attempting reconnect...'));
      }
    }
  }
}, 60000);

// Socket error listener untuk detect disconnect lebih cepat
if (conn.ws) {
  conn.ws.on('close', () => {
    console.log(chalk.red('[!] WebSocket closed unexpectedly'));
    if (!conn._isReconnecting) {
      conn._isReconnecting = true;
      setTimeout(() => {
        console.log(chalk.cyan('[~] Initiating emergency reconnect...'));
        global.reloadHandler(true).finally(() => {
          conn._isReconnecting = false;
        });
      }, 3000);
    }
  });

  conn.ws.on('error', (err) => {
    console.log(chalk.red('[!] WebSocket error:'), err.message || err);
    if (!conn._isReconnecting) {
      conn._isReconnecting = true;
      setTimeout(() => {
        console.log(chalk.cyan('[~] Recovering from socket error...'));
        global.reloadHandler(true).finally(() => {
          conn._isReconnecting = false;
        });
      }, 3000);
    }
  });
}

// Track last message time untuk keep-alive
conn.ev.on('messages.upsert', () => {
  conn._lastMessageTime = Date.now();
});

// Track credentials update untuk MAC address consistency
let lastCredsCheck = Date.now();
conn.ev.on('creds.update', () => {
  const now = Date.now();
  // Only log updates yang tidak frequent (prevent spam)
  if (now - lastCredsCheck > 10000) {
    console.log(chalk.gray('[~] Session credentials updated'));
    lastCredsCheck = now;
  }
});

// ========== END KEEP-ALIVE ==========

if (!opts.test) {
  setInterval(async () => {
    if (global.db.data) {
      await global.db.write().catch(console.error);
    }
  }, 60000);
}

process.on("uncaughtException", (error) => {
  console.error(chalk.red('[CRITICAL ERROR]'), error);
  // Don't exit process, try to recover
  console.log(chalk.yellow('[!] Attempting to recover...'));
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(chalk.red('[UNHANDLED REJECTION]'), reason);
  // Don't exit, let the bot stay alive
});

let isHandlerInitializing = true;
let handlerModule = await import("./handler.js");
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

global.reloadHandler = async function reloadHandler(restartConn, attempt = 1) {
  try {
    const newHandler = await import(`./handler.js?update=${Date.now()}`).catch(console.error);
    if (newHandler && Object.keys(newHandler).length) {
      handlerModule = newHandler;
    }
  } catch (error) {
    console.error(chalk.red('[!] Error loading handler:'), error.message);
  }

  if (restartConn) {
    try {
      reconnectAttempts++;
      const currentChats = global.conn?.chats || {};
      try {
        global.conn?.ws?.close();
      } catch {}
      
      conn?.ev?.removeAllListeners();
      
      console.log(chalk.cyan(`[~] Restarting connection (attempt ${reconnectAttempts})...`));
      global.conn = makeWASocket(connectionOptions, { chats: currentChats });
      
      // Reset reconnect attempts on success
      if (global.conn) {
        await new Promise(resolve => {
          const timeout = setTimeout(() => resolve(), 15000);
          // Listen for successful connection
          const connListener = (update) => {
            if (update.connection === 'open') {
              clearTimeout(timeout);
              global.conn.ev.off('connection.update', connListener);
              reconnectAttempts = 0; // Reset on success
              resolve();
            }
          };
          global.conn.ev.on('connection.update', connListener);
        });
      }
      
      isHandlerInitializing = true;
    } catch (error) {
      console.error(chalk.red('[!] Error restarting connection:'), error.message);
      
      // Retry dengan delay exponential
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delayMs = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
        console.log(chalk.yellow(`[!] Retrying in ${delayMs}ms...`));
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return global.reloadHandler(true, attempt + 1);
      } else {
        console.log(chalk.red('[!] Max reconnect attempts reached. Keeping process alive.'));
      }
    }
  }

  if (!isHandlerInitializing) {
    conn.ev.off("messages.upsert", conn.handler);
    conn.ev.off("group-participants.update", conn.participantsUpdate);
    conn.ev.off("groups.update", conn.groupsUpdate);
    conn.ev.off("message.delete", conn.onDelete);
    conn.ev.off("connection.update", conn.connectionUpdate);
    conn.ev.off("creds.update", conn.credsUpdate);
  }

  conn.handler = handlerModule.handler.bind(global.conn);
  conn.participantsUpdate = handlerModule.participantsUpdate.bind(global.conn);
  conn.groupsUpdate = handlerModule.groupsUpdate.bind(global.conn);
  conn.onDelete = handlerModule.deleteUpdate.bind(global.conn);
  conn.connectionUpdate = (update) => {
    connectionUpdate(update, conn);
    if (update.connection === 'open') {
      startCryptoTicker(conn);
    }
  };
  conn.credsUpdate = saveCredentials.bind(global.conn);

  conn.ev.on("messages.upsert", conn.handler);
  conn.ev.on("group-participants.update", conn.participantsUpdate);
  conn.ev.on("groups.update", conn.groupsUpdate);
  conn.ev.on("message.delete", conn.onDelete);
  conn.ev.on("connection.update", conn.connectionUpdate);
  conn.ev.on("creds.update", conn.credsUpdate);

  isHandlerInitializing = false;
  return true;
};

// ========== ADDITIONAL SAFEGUARDS ==========
// Aggressive presence update setiap 2 menit untuk keep bot active
const presenceUpdateInterval = setInterval(async () => {
  try {
    if (conn && conn.user && !conn._isReconnecting) {
      const botJid = conn.user.id;
      await conn.sendPresenceUpdate('available', botJid).catch(() => {
        // Silently handle if this fails
      });
    }
  } catch (error) {
    console.log(chalk.gray('[~] Presence update request (normal, dapat diabaikan)'));
  }
}, 120000); // 2 minutes

// Session integrity check setiap 10 menit
const sessionCheckInterval = setInterval(async () => {
  try {
    if (conn && conn.user && conn.authState?.creds) {
      // Verify session still valid
      const sessionValid = conn.authState.creds?.me?.id;
      if (sessionValid) {
        console.log(chalk.gray('[✓] Session integrity check passed'));
      } else {
        console.log(chalk.yellow('[!] Session appears invalid, consider re-authenticating'));
      }
    }
  } catch (error) {
    console.log(chalk.gray('[~] Session check error (dapat diabaikan)'));
  }
}, 600000); // 10 minutes

// Graceful shutdown handlers untuk prevent hanging
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return; // Prevent double shutdown
  isShuttingDown = true;
  
  console.log(chalk.yellow(`[!] ${signal} received, graceful shutdown...`));
  
  try {
    // Stop accepting new requests
    clearInterval(presenceUpdateInterval);
    clearInterval(sessionCheckInterval);
    
    // Save database
    if (global.db?.write) {
      console.log(chalk.gray('[~] Saving database...'));
      await global.db.write().catch(() => {});
    }
    
    // Close WebSocket first
    if (conn?.ws) {
      console.log(chalk.gray('[~] Closing WebSocket...'));
      try {
        await conn.ws.close();
      } catch (e) {
        console.log(chalk.gray('[~] WebSocket close error (ignored)'));
      }
    }
    
    // Remove all listeners
    if (conn?.ev) {
      console.log(chalk.gray('[~] Removing event listeners...'));
      try {
        conn.ev.removeAllListeners();
      } catch (e) {
        console.log(chalk.gray('[~] Event removal error (ignored)'));
      }
    }
    
    // Close HTTP server
    if (global.httpServer) {
      console.log(chalk.gray('[~] Closing HTTP server...'));
      global.httpServer.close(() => {
        console.log(chalk.green('[✓] HTTP server closed'));
      });
    }
    
    console.log(chalk.green('[✓] Graceful shutdown complete'));
    
    // Exit after 3 seconds max
    setTimeout(() => {
      console.log(chalk.red('[!] Force exit due to timeout'));
      process.exit(1);
    }, 3000);
    
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('[!] Error during shutdown:'), error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// ========== END SAFEGUARDS ==========

const pluginsDir = global.__dirname(pathJoin(currentDir, "./plugins/index"));
const isPluginFile = (filename) => /\.js$/.test(filename);

global.plugins = {};

async function loadPlugins() {
  for (let filename of readDirSync(pluginsDir).filter(isPluginFile)) {
    try {
      let filePath = global.__filename(pathJoin(pluginsDir, filename));
      const plugin = await import(filePath);
      global.plugins[filename] = plugin.default || plugin;
    } catch (error) {
      conn.logger.error(error);
      delete global.plugins[filename];
    }
  }
}

loadPlugins()
  .then(() => {
    const pluginCount = Object.keys(global.plugins).length;
    console.log(chalk.bold.green(`Plugins Total : ${pluginCount} Plugins`));
  })
  .catch(console.error);

global.reload = async function reloadPlugin(event, filename) {
  if (isPluginFile(filename)) {
    let filePath = global.__filename(pathJoin(pluginsDir, filename), true);
    
    if (filename in global.plugins) {
      if (!existsSync(filePath)) {
        conn.logger.warn(`Deleted plugin '${filename}'`);
        return delete global.plugins[filename];
      }
      conn.logger.info(`Reloading plugin '${filename}'`);
    } else {
      conn.logger.info(`Loading new plugin '${filename}'`);
    }
    
    const errorCheck = syntaxError(readFileSync(filePath), filename, {
      sourceType: "module",
      allowAwaitOutsideFunction: true
    });
    
    if (errorCheck) {
      conn.logger.error(`Syntax error while loading '${filename}'\n${formatUtil(errorCheck)}`);
      return;
    }
    
    try {
      const plugin = await import(`${global.__filename(filePath)}?update=${Date.now()}`);
      global.plugins[filename] = plugin.default || plugin;
    } catch (error) {
      conn.logger.error(`Error loading plugin '${filename}'\n${formatUtil(error)}`);
    } finally {
      global.plugins = Object.fromEntries(
        Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b))
      );
    }
  }
};

Object.freeze(global.reload);
watchFile(pluginsDir, global.reload);
await global.reloadHandler();
await handlePairing(conn, opts);

(async function quickTest() {
  const testResults = await Promise.all([
    spawnProcess("ffmpeg"),
    spawnProcess("ffprobe"),
    spawnProcess("ffmpeg", ["-hide_banner", "-loglevel", "error", "-filter_complex", "color", "-frames:v", "1", "-f", "webp", "-"]),
    spawnProcess("convert"),
    spawnProcess("magick"),
    spawnProcess("gm"),
    spawnProcess("find", ["--version"])
  ].map(cmd => Promise.race([
    new Promise(resolve => {
      cmd.on("close", code => resolve(code !== 127));
    }),
    new Promise(resolve => {
      cmd.on("error", () => resolve(false));
    })
  ])));
  
  const [
    ffmpeg, 
    ffprobe, 
    ffmpegWebp, 
    convert, 
    magick, 
    gm, 
    find
  ] = testResults;
  
  global.support = {
    ffmpeg,
    ffprobe,
    ffmpegWebp,
    convert,
    magick,
    gm,
    find
  };
  
  Object.freeze(global.support);
  
  if (!support.ffmpeg) {
    conn.logger.warn("Please install ffmpeg for sending videos (pkg install ffmpeg)");
  }
  
  if (support.ffmpeg && !support.ffmpegWebp) {
    conn.logger.warn("Stickers may not animate without libwebp on ffmpeg (--enable-ibwebp while compiling ffmpeg)");
  }
  
  if (!support.convert && !support.magick && !support.gm) {
    conn.logger.warn("Stickers may not work without imagemagick if libwebp on ffmpeg isn't installed (pkg install imagemagick)");
  }
})().then(() => conn.logger.info("✓ Quick Test Done"))
  .catch(console.error);

// ========== WEBHOOK HANDLERS ==========
/**
 * Helper function untuk check apakah bot siap
 */
function isBotReady() {
  return conn && conn.user && !conn._isReconnecting && conn.ev;
}

/**
 * Helper function untuk delay retry
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send message dengan retry logic
 */
async function sendMessageWithRetry(jid, message, maxRetries = 3) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check bot ready
      if (!isBotReady()) {
        throw new Error('Bot not ready (not connected)');
      }
      
      // Validate JID format
      if (!jid || typeof jid !== 'string') {
        throw new Error('Invalid JID format');
      }
      
      // Format JID properly
      const formattedJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
      
      // Validate message
      if (!message || typeof message !== 'string') {
        throw new Error('Invalid message format');
      }
      
      // Send with timeout
      const sendPromise = conn.sendMessage(formattedJid, { text: message });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Send timeout (30s)')), 30000)
      );
      
      await Promise.race([sendPromise, timeoutPromise]);
      
      console.log(chalk.green(`[✓] Message sent to ${formattedJid}`));
      return { success: true, jid: formattedJid };
      
    } catch (error) {
      lastError = error;
      console.log(chalk.yellow(`[!] Send attempt ${attempt}/${maxRetries} failed: ${error.message}`));
      
      // Don't retry on validation errors
      if (error.message.includes('Invalid') || error.message.includes('invalid')) {
        break;
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        const delayMs = 1000 * attempt; // Exponential backoff
        await sleep(delayMs);
      }
    }
  }
  
  // All retries exhausted
  throw lastError || new Error('Failed to send message after retries');
}

/**
 * Webhook: Send promotional message
 */
app.post("/webhook/send-promo", async (req, res) => {
  try {
    const { number, message } = req.body;
    
    // Validate input
    if (!number || !message) {
      console.log(chalk.red('[!] Webhook error: Missing parameters'));
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['number', 'message'],
        statusCode: 400
      });
    }
    
    console.log(chalk.cyan(`[~] Webhook request: number=${number}`));
    
    // Check bot connection status
    if (!isBotReady()) {
      console.log(chalk.yellow('[!] Bot not ready'));
      return res.status(503).json({ 
        error: 'Bot not ready (still connecting)',
        statusCode: 503,
        retryAfter: 5
      });
    }
    
    // Send message with retry
    const result = await sendMessageWithRetry(number, message);
    
    console.log(chalk.green(`[✓] Webhook success: ${result.jid}`));
    return res.status(200).json({ 
      status: 'ok',
      sent_to: result.jid,
      statusCode: 200
    });
    
  } catch (error) {
    console.error(chalk.red('[!] Webhook error:'), error.message);
    
    // Determine appropriate error code
    let statusCode = 500;
    let errorMsg = error.message;
    
    if (error.message.includes('Invalid')) {
      statusCode = 400;
    } else if (error.message.includes('not ready')) {
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
    } else if (error.message.includes('Bad MAC') || error.message.includes('session')) {
      statusCode = 502; // Bad Gateway - bot connection issue
    }
    
    return res.status(statusCode).json({ 
      error: errorMsg,
      statusCode: statusCode,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  const isReady = isBotReady();
  const status = {
    status: isReady ? 'ready' : 'not-ready',
    botConnected: !!conn?.user,
    botActive: !!conn?.ev,
    isReconnecting: !!conn?._isReconnecting,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
  
  return res.status(isReady ? 200 : 503).json(status);
});

// ========== END WEBHOOK ==========

const PORT = process.env.PORT || 5000;
global.httpServer = app.listen(PORT, async () => {
    console.log(chalk.bold.green(`\n🚀 WhatsApp Webhook & Bot running on port ${PORT}`));
    console.log(chalk.gray('   Webhook: POST http://localhost:' + PORT + '/webhook/send-promo'));
    console.log(chalk.gray('   Health: GET http://localhost:' + PORT + '/health\n'));
});