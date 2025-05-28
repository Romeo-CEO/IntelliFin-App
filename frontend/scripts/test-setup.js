#!/usr/bin/env node

/**
 * IntelliFin E2E Test Setup Script
 * 
 * This script helps set up and run E2E tests for the IntelliFin application.
 * It ensures both frontend and backend services are running before executing tests.
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  frontend: {
    port: 3000,
    url: 'http://localhost:3000',
    command: 'npm run dev',
    cwd: path.resolve(__dirname, '..')
  },
  backend: {
    port: 3001,
    url: 'http://localhost:3001/api/v1/health',
    command: 'npm run start:dev',
    cwd: path.resolve(__dirname, '../../backend')
  },
  database: {
    url: 'postgresql://intellifin-core:Chizzy@1!@localhost:5432/intellifin-core'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Check if a service is running on a specific port
function checkPort(port) {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' 
      ? `netstat -an | findstr :${port}`
      : `lsof -i :${port}`;
    
    exec(command, (error, stdout) => {
      resolve(!error && stdout.trim().length > 0);
    });
  });
}

// Wait for a URL to be accessible
function waitForUrl(url, timeout = 60000, interval = 2000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          resolve(true);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for ${url} (${timeout}ms)`));
        } else {
          setTimeout(check, interval);
        }
      }
    };
    
    check();
  });
}

// Start a service
function startService(name, config) {
  return new Promise((resolve, reject) => {
    logStep('START', `Starting ${name} service...`);
    
    const child = spawn('npm', ['run', config.command.split(' ')[2]], {
      cwd: config.cwd,
      stdio: 'pipe',
      shell: true
    });
    
    let started = false;
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('ready') || output.includes('listening') || output.includes('started')) {
        if (!started) {
          started = true;
          logSuccess(`${name} service started`);
          resolve(child);
        }
      }
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('EADDRINUSE')) {
        logWarning(`${name} service already running on port ${config.port}`);
        if (!started) {
          started = true;
          resolve(null); // Service already running
        }
      }
    });
    
    child.on('error', (error) => {
      if (!started) {
        reject(new Error(`Failed to start ${name}: ${error.message}`));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!started) {
        child.kill();
        reject(new Error(`Timeout starting ${name} service`));
      }
    }, 30000);
  });
}

// Check prerequisites
async function checkPrerequisites() {
  logStep('CHECK', 'Checking prerequisites...');
  
  // Check if Node.js is installed
  try {
    const nodeVersion = await new Promise((resolve, reject) => {
      exec('node --version', (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout.trim());
      });
    });
    logSuccess(`Node.js ${nodeVersion} found`);
  } catch (error) {
    logError('Node.js not found. Please install Node.js >= 18.0.0');
    process.exit(1);
  }
  
  // Check if npm is installed
  try {
    const npmVersion = await new Promise((resolve, reject) => {
      exec('npm --version', (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout.trim());
      });
    });
    logSuccess(`npm ${npmVersion} found`);
  } catch (error) {
    logError('npm not found. Please install npm >= 8.0.0');
    process.exit(1);
  }
  
  // Check if Playwright is installed
  const playwrightPath = path.join(__dirname, '../node_modules/@playwright/test');
  if (fs.existsSync(playwrightPath)) {
    logSuccess('Playwright found');
  } else {
    logWarning('Playwright not found. Installing...');
    await new Promise((resolve, reject) => {
      exec('npm install @playwright/test', { cwd: CONFIG.frontend.cwd }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    logSuccess('Playwright installed');
  }
}

// Setup test environment
async function setupTestEnvironment() {
  logStep('SETUP', 'Setting up test environment...');
  
  const services = [];
  
  // Check if backend is already running
  const backendRunning = await checkPort(CONFIG.backend.port);
  if (!backendRunning) {
    const backendProcess = await startService('Backend', CONFIG.backend);
    if (backendProcess) services.push(backendProcess);
    
    // Wait for backend to be ready
    await waitForUrl(CONFIG.backend.url);
    logSuccess('Backend service is ready');
  } else {
    logSuccess('Backend service already running');
  }
  
  // Check if frontend is already running
  const frontendRunning = await checkPort(CONFIG.frontend.port);
  if (!frontendRunning) {
    const frontendProcess = await startService('Frontend', CONFIG.frontend);
    if (frontendProcess) services.push(frontendProcess);
    
    // Wait for frontend to be ready
    await waitForUrl(CONFIG.frontend.url);
    logSuccess('Frontend service is ready');
  } else {
    logSuccess('Frontend service already running');
  }
  
  return services;
}

// Run E2E tests
async function runTests(testType = 'all') {
  logStep('TEST', `Running ${testType} E2E tests...`);
  
  const testCommands = {
    all: 'test:e2e',
    auth: 'test:e2e:auth',
    dashboard: 'test:e2e:dashboard',
    ui: 'test:e2e:ui',
    headed: 'test:e2e:headed',
    debug: 'test:e2e:debug'
  };
  
  const command = testCommands[testType] || testCommands.all;
  
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', command], {
      cwd: CONFIG.frontend.cwd,
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        logSuccess('E2E tests completed successfully');
        resolve(true);
      } else {
        logError(`E2E tests failed with exit code ${code}`);
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      logError(`Failed to run tests: ${error.message}`);
      reject(error);
    });
  });
}

// Cleanup function
function cleanup(services) {
  logStep('CLEANUP', 'Cleaning up...');
  
  services.forEach((service, index) => {
    if (service && !service.killed) {
      service.kill();
      logSuccess(`Service ${index + 1} stopped`);
    }
  });
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';
  
  log('🚀 IntelliFin E2E Test Setup', 'bright');
  log('================================', 'bright');
  
  let services = [];
  
  try {
    await checkPrerequisites();
    services = await setupTestEnvironment();
    await runTests(testType);
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  } finally {
    cleanup(services);
  }
  
  log('\n🎉 Test execution completed!', 'green');
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n⚠️  Process interrupted', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n⚠️  Process terminated', 'yellow');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, checkPrerequisites, setupTestEnvironment, runTests };
