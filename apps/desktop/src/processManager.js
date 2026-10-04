/**
 * CircuitSage AI — Desktop Background Process Supervisor
 *
 * Checks if the local Express API is already listening on http://127.0.0.1:8000.
 * If not running, launches apps/api/src/server.js as a managed child process.
 * Gracefully terminates managed processes when the Electron app exits.
 */

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

let apiProcess = null;

/**
 * Checks if the Express API health endpoint is reachable.
 */
function checkApiHealth(port = 8000, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/v1/health`, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Starts managed Express API server if not already running.
 */
async function startManagedApiServer(port = 8000) {
  const isRunning = await checkApiHealth(port);
  if (isRunning) {
    console.log(`[ProcessManager] Express API is already active on http://127.0.0.1:${port}`);
    return { managed: false, port };
  }

  const serverPath = path.resolve(__dirname, '../../api/src/server.js');
  console.log(`[ProcessManager] Spawning Express API child process from ${serverPath}...`);

  apiProcess = spawn(process.execPath || 'node', [serverPath], {
    env: { ...process.env, PORT: port.toString(), NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  apiProcess.stdout.on('data', (data) => {
    console.log(`[API Process]: ${data.toString().trim()}`);
  });

  apiProcess.stderr.on('data', (data) => {
    console.error(`[API Process Error]: ${data.toString().trim()}`);
  });

  apiProcess.on('exit', (code, signal) => {
    console.log(`[ProcessManager] Express API exited with code ${code}, signal ${signal}`);
    apiProcess = null;
  });

  // Wait up to 5 seconds for API to become healthy
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const healthy = await checkApiHealth(port);
    if (healthy) {
      console.log(`[ProcessManager] Express API confirmed healthy on port ${port}.`);
      return { managed: true, port };
    }
  }

  console.warn('[ProcessManager] Warning: Express API started but health check timed out.');
  return { managed: true, port };
}

/**
 * Gracefully terminates the managed Express API process.
 */
function stopManagedApiServer() {
  if (apiProcess && !apiProcess.killed) {
    console.log('[ProcessManager] Terminating managed Express API process...');
    apiProcess.kill('SIGTERM');
    apiProcess = null;
  }
}

module.exports = {
  checkApiHealth,
  startManagedApiServer,
  stopManagedApiServer
};
