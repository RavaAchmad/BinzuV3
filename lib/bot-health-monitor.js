import chalk from 'chalk';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

class BotHealthMonitor {
  constructor() {
    this.logFile = './bot-health.log';
    this.statusFile = './bot-status.json';
    this.startTime = Date.now();
    this.messagesSent = 0;
    this.messagesReceived = 0;
    this.disconnects = 0;
    this.lastHeartbeat = Date.now();
  }

  async initializeStatus() {
    const initialStatus = {
      startTime: new Date().toISOString(),
      botActive: true,
      lastHeartbeat: new Date().toISOString(),
      messagesSent: 0,
      messagesReceived: 0,
      disconnectCount: 0,
      uptime: '0m'
    };
    try {
      writeFileSync(this.statusFile, JSON.stringify(initialStatus, null, 2));
    } catch (e) {
      console.log(chalk.gray('[~] Status file write ignored'));
    }
  }

  updateStatus(type, value) {
    try {
      const current = existsSync(this.statusFile) 
        ? JSON.parse(readFileSync(this.statusFile)) 
        : {};
      
      current.lastHeartbeat = new Date().toISOString();
      current.uptime = this.getUptime();
      
      if (type === 'message_sent') {
        this.messagesSent++;
        current.messagesSent = this.messagesSent;
      } else if (type === 'message_received') {
        this.messagesReceived++;
        current.messagesReceived = this.messagesReceived;
      } else if (type === 'disconnect') {
        this.disconnects++;
        current.disconnectCount = this.disconnects;
      } else if (type === 'active') {
        current.botActive = value;
      }
      
      writeFileSync(this.statusFile, JSON.stringify(current, null, 2));
    } catch (e) {
      console.log(chalk.gray('[~] Status update write ignored'));
    }
  }

  heartbeat(conn) {
    this.lastHeartbeat = Date.now();
    this.updateStatus('heartbeat', true);
    return this.lastHeartbeat;
  }

  logEvent(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    try {
      writeFileSync(this.logFile, logEntry, { flag: 'a' });
    } catch (e) {
      console.log(chalk.gray('[~] Log write ignored'));
    }
  }

  getUptime() {
    const upMs = Date.now() - this.startTime;
    const days = Math.floor(upMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((upMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((upMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  getStatus() {
    try {
      if (existsSync(this.statusFile)) {
        return JSON.parse(readFileSync(this.statusFile));
      }
    } catch (e) {
      console.log(chalk.gray('[~] Status read error (ignored)'));
    }
    return null;
  }
}

export default BotHealthMonitor;
