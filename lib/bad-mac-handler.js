import chalk from 'chalk';

/**
 * Bad MAC Error Handler v2
 * 
 * IMPORTANT: This handler NO LONGER intercepts connection.update events.
 * The previous version ate those events, preventing reconnection — causing
 * the bot to stay disconnected forever after Bad MAC / session errors.
 * 
 * Now it only provides logging and monitoring. Reconnect is handled by
 * connectionUpdate() in connection.js.
 */

let badMacCounter = 0;
let sessionErrorCounter = 0;
let lastLogTime = 0;

export function setupBadMacHandler(conn) {
  if (!conn) return;

  // Listen to connection.update for LOGGING ONLY — do NOT block/eat events
  conn.ev.on('connection.update', (update) => {
    if (!update.lastDisconnect?.error) return;
    
    const error = update.lastDisconnect.error;
    const message = (error.message || '').toLowerCase();
    const now = Date.now();
    
    // Rate limit logging (max 1 per 15 seconds per type)
    const shouldLog = now - lastLogTime > 15000;
    
    if (message.includes('bad mac') || message.includes('mac validation')) {
      badMacCounter++;
      if (shouldLog) {
        lastLogTime = now;
        console.log(chalk.yellow(`[BAD-MAC] #${badMacCounter} — encryption error, reconnecting...`));
        if (badMacCounter > 30) {
          console.log(chalk.red('[BAD-MAC] Persistent errors. Consider: rm -rf sessions/'));
        }
      }
    } else if (message.includes('no session') || message.includes('session error')) {
      sessionErrorCounter++;
      if (shouldLog) {
        lastLogTime = now;
        console.log(chalk.yellow(`[SESSION] #${sessionErrorCounter} — session error, reconnecting...`));
      }
    } else if (message.includes('failed to decrypt') || message.includes('invalid prekey')) {
      if (shouldLog) {
        lastLogTime = now;
        console.log(chalk.gray('[DECRYPT] Message decrypt failed — skipping message'));
      }
    }
  });
  
  // Reset counters on successful connection
  conn.ev.on('connection.update', (update) => {
    if (update.connection === 'open') {
      if (badMacCounter > 0 || sessionErrorCounter > 0) {
        console.log(chalk.green(`[RECOVERY] Connected. Cleared ${badMacCounter} BAD-MAC, ${sessionErrorCounter} session errors`));
      }
      badMacCounter = 0;
      sessionErrorCounter = 0;
    }
  });
}

export function resetErrorTracking() {
  badMacCounter = 0;
  sessionErrorCounter = 0;
}

export function getShouldIgnoreJid() {
  return (jid) => {
    if (!jid) return false;
    return (
      jid.includes('broadcast') ||
      jid.includes('newsletter') ||
      jid.includes('metaai') ||
      jid.includes('status@broadcast')
    );
  };
}

export { badMacCounter, sessionErrorCounter };
