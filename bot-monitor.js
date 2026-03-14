#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'fs';
import chalk from 'chalk';

const statusFile = './bot-status.json';
const logFile = './bot-health.log';

function getStatus() {
  try {
    if (existsSync(statusFile)) {
      const status = JSON.parse(readFileSync(statusFile));
      return status;
    }
  } catch (e) {
    return null;
  }
}

function getRecentLogs(lines = 20) {
  try {
    if (existsSync(logFile)) {
      const content = readFileSync(logFile, 'utf-8');
      const allLines = content.split('\n').filter(l => l.trim());
      return allLines.slice(-lines);
    }
  } catch (e) {
    return [];
  }
}

function formatStatus() {
  console.clear();
  console.log(chalk.bold.cyan('\n═══════════════════════════════════════════'));
  console.log(chalk.bold.cyan('       BOT HEALTH STATUS MONITOR'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════\n'));

  const status = getStatus();
  
  if (!status) {
    console.log(chalk.yellow('Bot belum pernah dijalankan atau status file tidak ada'));
    return;
  }

  console.log(chalk.white('Status Bot:'), 
    status.botActive ? chalk.green('✓ ACTIVE') : chalk.red('✗ INACTIVE'));
  
  console.log(chalk.white('Uptime:'), chalk.cyan(status.uptime));
  
  console.log(chalk.white('Start Time:'), chalk.gray(status.startTime));
  
  console.log(chalk.white('Last Heartbeat:'), chalk.gray(status.lastHeartbeat));
  
  console.log(chalk.white('\nMessages:'));
  console.log('  ' + chalk.cyan(`Sent: ${status.messagesSent || 0}`));
  console.log('  ' + chalk.cyan(`Received: ${status.messagesReceived || 0}`));
  
  console.log(chalk.white('\nDisconnects:'), chalk.yellow(status.disconnectCount || 0));
  
  console.log(chalk.gray('\n───────────────────────────────────────────'));
  console.log(chalk.bold.white('Recent Events:'));
  console.log(chalk.gray('───────────────────────────────────────────\n'));
  
  const logs = getRecentLogs(15);
  if (logs.length) {
    logs.forEach(log => {
      if (log.includes('ERROR') || log.includes('error')) {
        console.log(chalk.red(log));
      } else if (log.includes('WARN') || log.includes('warn')) {
        console.log(chalk.yellow(log));
      } else if (log.includes('Connected') || log.includes('Active')) {
        console.log(chalk.green(log));
      } else {
        console.log(chalk.gray(log));
      }
    });
  } else {
    console.log(chalk.gray('Belum ada events'));
  }
  
  console.log('\n' + chalk.bold.cyan('═══════════════════════════════════════════'));
  console.log(chalk.gray('Press Ctrl+C to exit | Auto-refresh enabled\n'));
}

function startAutoRefresh() {
  formatStatus();
  setInterval(() => {
    formatStatus();
  }, 5000); // Refresh setiap 5 detik
}

// Handle exit
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n[~] Exiting monitor...\n'));
  process.exit(0);
});

// Start monitoring
startAutoRefresh();
