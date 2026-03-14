import chalk from 'chalk';

/**
 * Bad MAC Error Handler
 * Handles Baileys Bad MAC / Session corruption errors gracefully
 */

let badMacCounter = 0;
let lastBadMacTime = 0;
let lastBadMacJid = null;

export function setupBadMacHandler(conn) {
  if (!conn) return;

  // Monitor event emitter untuk detect Bad MAC errors
  const originalEmit = conn.ev.emit;
  conn.ev.emit = function (event, ...args) {
    try {
      // Intercept error events
      if (event === 'connection.update' && args[0]?.lastDisconnect) {
        const error = args[0].lastDisconnect.error;
        if (error && error.message) {
          const message = error.message.toLowerCase();
          
          // Detect Bad MAC patterns
          if (message.includes('bad mac') || message.includes('mac validation failed')) {
            handleBadMacError(error, conn);
            return; // Don't emit if we're handling it
          }
          
          // Detect session errors
          if (message.includes('no session') || message.includes('session error')) {
            handleSessionError(error, conn);
            return;
          }
          
          // Detect decrypt failures
          if (message.includes('failed to decrypt') || message.includes('invalid prekey')) {
            handleDecryptError(error, conn);
            return;
          }
        }
      }

      // Emit original event
      return originalEmit.apply(this, [event, ...args]);
    } catch (error) {
      console.log(chalk.gray('[~] Event emit error (ignored)'));
      return originalEmit.apply(this, [event, ...args]);
    }
  };

  // Also listen internally for Bad MAC during message processing
  conn.ev.on('messages.upsert', async (updates) => {
    try {
      for (const update of updates.messages) {
        // Check for Bad MAC in message handling
        if (update.message && update.key) {
          // Prevent excessive error handling
          const now = Date.now();
          if (now - lastBadMacTime < 1000 && lastBadMacJid === update.key.remoteJid) {
            continue; // Skip rapid duplicates from same sender
          }
        }
      }
    } catch (error) {
      // Silently handle
    }
  });
}

/**
 * Handle Bad MAC error gracefully
 */
function handleBadMacError(error, conn) {
  const now = Date.now();
  badMacCounter++;
  
  // Rate limit Bad MAC logging (max 1 per 10 seconds)
  if (now - lastBadMacTime < 10000) {
    console.log(chalk.gray('[~] Bad MAC (throttled)'));
    return;
  }
  
  lastBadMacTime = now;
  
  console.log(chalk.yellow('⚠️  Bad MAC Error detected (encryption/decryption failure)'));
  console.log(chalk.gray(`   This is a Baileys issue, not critical to bot operation`));
  console.log(chalk.gray(`   Bot will continue running (Bad MAC count: ${badMacCounter})`));
  
  // Don't auto-repair sessions like original Baileys does
  // This causes spam and kills bot. Instead, just log and continue.
  
  if (badMacCounter > 20) {
    console.log(chalk.yellow('[!] Too many Bad MAC errors. Consider clearing sessions:'));
    console.log(chalk.gray('    rm -rf sessions/'));
  }
}

/**
 * Handle session errors gracefully
 */
function handleSessionError(error, conn) {
  console.log(chalk.yellow('⚠️  Session Error detected'));
  console.log(chalk.gray(`   Message: ${error.message}`));
  console.log(chalk.gray('   Bot will continue running and recover automatically'));
  
  // Don't trigger immediate reconnect for session errors
  // Let the natural keep-alive mechanism handle it
}

/**
 * Handle decryption errors gracefully
 */
function handleDecryptError(error, conn) {
  console.log(chalk.yellow('⚠️  Decryption Error detected'));
  console.log(chalk.gray(`   This usually means a message couldn't be decrypted`));
  console.log(chalk.gray('   Bot will skip this message and continue'));
  
  // These are normal and shouldn't crash the bot
}

/**
 * Skip problematic JIDs yang often cause Bad MAC
 * Implement the optimization from GitHub issue comment
 */
export function getShouldIgnoreJid() {
  // Pattern-based detection untuk JID types yang problematic
  // (Baileys-specific function import tidak perlu di sini)
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

export { badMacCounter };
