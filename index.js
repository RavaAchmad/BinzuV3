import { spawn } from 'child_process';
import path from 'path';
import { clear } from 'console';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import fs from 'fs';
import CFonts from 'cfonts';
import chalk from 'chalk';
import readline from 'readline';
import { EventEmitter } from 'node:events';
const emitter = new EventEmitter();
emitter.setMaxListeners(20);

const __dirname = dirname(fileURLToPath(import.meta.url));

const checkSessionsFolder = () => {
  return fs.existsSync(path.join(__dirname, 'sessions'));
};

const checkCredsFile = () => {
  return fs.existsSync(path.join(__dirname, 'sessions', 'creds.json'));
};

const deleteSessionsFolder = () => {
  fs.rmSync(path.join(__dirname, 'sessions'), { recursive: true });
};

let restartCount = 0;
const MAX_RAPID_RESTARTS = 10;
let lastRestartTime = Date.now();

const metric = await import('./metrics.js');
const start = async () => {
  const args = [path.join(__dirname, 'main.js'), ...process.argv.slice(2)];
  
  // Add delay jika terlalu banyak restart dalam waktu singkat
  const timeSinceLastRestart = Date.now() - lastRestartTime;
  if (timeSinceLastRestart < 5000) { // Less than 5 seconds
    restartCount++;
    if (restartCount > MAX_RAPID_RESTARTS) {
      console.log(chalk.red(`[!] Too many restarts (${restartCount}). Waiting 30 seconds...`));
      await new Promise(resolve => setTimeout(resolve, 30000));
      restartCount = 0;
    }
  } else {
    restartCount = 0; // Reset counter if enough time has passed
  }
  
  lastRestartTime = Date.now();
  
  console.log(chalk.cyan(`[~] Starting bot process (restart #${restartCount + 1})...`));
  
  const p = spawn(process.argv[0], args, { 
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'] 
  });
  
  p.on('exit', (code) => {
    console.log(chalk.red(`[!] Bot process exited with code: ${code}`));
    console.log(chalk.yellow(`[~] Attempting to restart in 5 seconds...`));
    setTimeout(() => start(), 5000);
  });
  
  p.on('error', (error) => {
    console.log(chalk.red(`[!] Bot process error:`, error.message));
    console.log(chalk.yellow(`[~] Attempting to restart in 5 seconds...`));
    setTimeout(() => start(), 5000);
  });
};

const runTest = async () => {
  console.log(chalk.green('[~] Running test script...'));
  const p = spawn(process.argv[0], [path.join(__dirname, 'test.js')], { 
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'] 
  });
  
  p.on('exit', (code) => {
    console.log(chalk[code === 0 ? 'green' : 'red'](`[${code === 0 ? '√' : '!'}] Test completed with code: ${code}`));
  });
};

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};


console.clear();
await sleep(300);

CFonts.say('\n  Binzu-MD', {
  font: 'tiny',
  align: 'left',
  colors: ['cyan'],
  space: false
});

console.log(chalk.gray('-'.repeat(50)));

console.log(chalk.cyanBright('  Simple WhatsApp Bot with Pairing Code Authentication'));
console.log(chalk.gray('-'.repeat(50)));

const showMenu = () => {
  console.log(chalk.yellow('\n  Select an option:'));
  console.log(chalk.green('  1. Lanjut Menghubungkan'));
  console.log(chalk.green('  2. Run Test Script'));
  console.log(chalk.gray('-'.repeat(30)));
};

if (checkSessionsFolder()) {
  if (!checkCredsFile()) {
    console.log(chalk.yellow('\n[!] Sessions folder found, but creds.json not found'));
    deleteSessionsFolder();
    
    showMenu();
    
    const rl = readline.createInterface({ 
      input: process.stdin, 
      output: process.stdout 
    });
    
    const choice = await promisify(rl.question).bind(rl)(
      chalk.magenta('  ➤ Select: ')
    );
    rl.close();
    
    if (choice === '1') {
      console.log(chalk.green('\n[~] Starting WhatsApp Bot...'));
      start();
    } else if (choice === '2') {
      await runTest();
    } else {
      console.log(chalk.red('\n[!] Invalid choice'));
      process.exit(1);
    }
  } else {
    console.log(chalk.green('\n[√] Found valid session, continuing...'));
    start();
  }
} else {
  console.log(chalk.yellow('\n[!] No sessions folder found'));
  
  showMenu();
  
  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
  });
  
  const choice = await promisify(rl.question).bind(rl)(
    chalk.magenta('  ➤ Select: ')
  );
  rl.close();
  
  if (choice === '1') {
    console.log(chalk.green('\n[~] Starting WhatsApp Bot...'));
    start();
  } else if (choice === '2') {
    await runTest();
  } else {
    console.log(chalk.red('\n[!] Invalid choice'));
    process.exit(1);
  }
}

console.log(chalk.gray('-'.repeat(50)));
console.log(chalk.cyanBright('  Thank you for using this script!'));
console.log(chalk.gray('-'.repeat(50)));