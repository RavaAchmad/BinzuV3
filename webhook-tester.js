#!/usr/bin/env node

/**
 * Webhook Tester & Bot Health Checker
 * Useful untuk verify webhook endpoint dan debug 500 errors
 */

import chalk from 'chalk';
import http from 'http';

const PORT = process.env.BOT_PORT || 5000;
const BOT_HOST = process.env.BOT_HOST || 'localhost';
const BASE_URL = `http://${BOT_HOST}:${PORT}`;

// Test cases
const TESTS = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/health',
    body: null,
    expectedStatus: [200, 503],
    description: 'Check if bot is ready'
  },
  {
    name: 'Send Valid Message',
    method: 'POST',
    path: '/webhook/send-promo',
    body: { number: '62812345678', message: 'Test Message' },
    expectedStatus: [200, 503], // 503 if bot not ready (expected)
    description: 'Send message to valid number'
  },
  {
    name: 'Missing Number Parameter',
    method: 'POST',
    path: '/webhook/send-promo',
    body: { message: 'Test' },
    expectedStatus: 400,
    description: 'Should return 400 for missing number'
  },
  {
    name: 'Missing Message Parameter',
    method: 'POST',
    path: '/webhook/send-promo',
    body: { number: '62812345678' },
    expectedStatus: 400,
    description: 'Should return 400 for missing message'
  },
  {
    name: 'Empty JID',
    method: 'POST',
    path: '/webhook/send-promo',
    body: { number: '', message: 'Test' },
    expectedStatus: 400,
    description: 'Should return 400 for empty number'
  },
  {
    name: 'Empty Message',
    method: 'POST',
    path: '/webhook/send-promo',
    body: { number: '62812345678', message: '' },
    expectedStatus: 400,
    description: 'Should return 400 for empty message'
  }
];

// Helper to make HTTP request
function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const isPost = method === 'POST';
    
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', reject);
    
    if (isPost && body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Run a single test
async function runTest(test) {
  console.log(chalk.cyan(`\n▶ ${test.name}`));
  console.log(chalk.gray(`  ${test.description}`));
  
  try {
    const response = await makeRequest(test.method, test.path, test.body);
    
    // Check if status matches expected
    const expectedArr = Array.isArray(test.expectedStatus) 
      ? test.expectedStatus 
      : [test.expectedStatus];
    const passed = expectedArr.includes(response.status);
    
    console.log(chalk[passed ? 'green' : 'red'](
      `  Response: ${response.status} ${passed ? '✓' : '✗'}`
    ));
    
    if (response.body && Object.keys(response.body).length > 0) {
      console.log(chalk.gray(`  Body: ${JSON.stringify(response.body, null, 2)}`));
    }
    
    return passed;
  } catch (error) {
    console.log(chalk.red(`  ✗ ERROR: ${error.message}`));
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.clear();
  console.log(chalk.bold.cyan('╔════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║  Webhook Tester & Bot Health Checker   ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════╝'));
  console.log(chalk.gray(`\nTesting: ${BASE_URL}`));
  console.log(chalk.yellow(`Timeout: 10 seconds per request\n`));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of TESTS) {
    const result = await runTest(test);
    if (result) passed++;
    else failed++;
  }
  
  // Summary
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║           TEST SUMMARY                 ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════╝'));
  console.log(chalk.green(`✓ Passed: ${passed}/${TESTS.length}`));
  if (failed > 0) {
    console.log(chalk.red(`✗ Failed: ${failed}/${TESTS.length}`));
  }
  
  const successRate = ((passed / TESTS.length) * 100).toFixed(1);
  console.log(chalk[passed === TESTS.length ? 'green' : 'yellow'](
    `Success Rate: ${successRate}%`
  ));
  
  // Recommendations
  if (failed > 0) {
    console.log(chalk.yellow('\nRecommendations:'));
    
    if (failed >= 3) {
      console.log(chalk.yellow('  1. Check if bot is running: node index.js'));
      console.log(chalk.yellow('  2. Check if port ' + PORT + ' is accessible'));
      console.log(chalk.yellow('  3. Check firewall settings'));
    } else {
      console.log(chalk.yellow('  1. Review failed test details above'));
      console.log(chalk.yellow('  2. Check bot logs: tail -f bot-health.log'));
      console.log(chalk.yellow('  3. Verify network connectivity'));
    }
  } else {
    console.log(chalk.green('\n✓ All tests passed! Webhook is working correctly.'));
  }
  
  console.log('\n');
  return failed === 0;
}

// Health check mode
async function healthCheck() {
  console.clear();
  console.log(chalk.bold.cyan('╔════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║     Bot Health Status Monitor          ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));
  
  try {
    const response = await makeRequest('GET', '/health', null);
    
    console.log(chalk.bold('Status:'), 
      response.body.status === 'ready' 
        ? chalk.green('✓ READY') 
        : chalk.yellow('⚠ NOT READY')
    );
    
    console.log(chalk.bold('Bot Connected:'), 
      response.body.botConnected 
        ? chalk.green('Yes') 
        : chalk.red('No')
    );
    
    console.log(chalk.bold('Bot Active:'), 
      response.body.botActive 
        ? chalk.green('Yes') 
        : chalk.red('No')
    );
    
    console.log(chalk.bold('Reconnecting:'), 
      response.body.isReconnecting 
        ? chalk.yellow('Yes') 
        : chalk.green('No')
    );
    
    console.log(chalk.bold('Uptime:'), chalk.cyan(response.body.uptime?.toFixed(1) + 's'));
    console.log(chalk.bold('Timestamp:'), chalk.gray(response.body.timestamp));
    
    console.log('\n');
    
  } catch (error) {
    console.log(chalk.red('✗ Could not connect to bot'));
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log(chalk.yellow('\n  Make sure bot is running: node index.js'));
  }
}

// CLI
const arg = process.argv[2];

if (arg === '--health' || arg === '-h') {
  await healthCheck();
} else if (arg === '--help' || arg === '-?') {
  console.log(chalk.cyan('Webhook Tester Usage:'));
  console.log(chalk.gray('  node webhook-tester.js         - Run all tests'));
  console.log(chalk.gray('  node webhook-tester.js --health - Check bot health'));
  console.log(chalk.gray('  node webhook-tester.js --help   - Show this help'));
  console.log(chalk.cyan('\nEnvironment Variables:'));
  console.log(chalk.gray('  BOT_PORT - Bot port (default: 5000)'));
  console.log(chalk.gray('  BOT_HOST - Bot host (default: localhost)'));
} else {
  const success = await runAllTests();
  process.exit(success ? 0 : 1);
}
