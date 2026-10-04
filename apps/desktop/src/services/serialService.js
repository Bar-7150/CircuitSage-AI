/**
 * CircuitSage AI — Serial Communication Service
 *
 * Implements:
 * - Real hardware serial port connection management via 'serialport'
 * - Baud rate configuration (including 9600 and 115200)
 * - Safe port enumeration with Windows CIM fallback
 * - Sensitive credential & token redaction
 * - Shared port-ownership integration with portManager
 * - Graceful port disconnect and application shutdown
 */

const { SerialPort } = require('serialport');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { portManager } = require('./portManager');

// Standard supported baud rates for embedded devices (ESP32, ESP8266, AVR, STM32)
const SUPPORTED_BAUD_RATES = [
  300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 460800, 921600
];

/**
 * Redacts sensitive credentials, Wi-Fi passwords, and API keys from serial text.
 */
function redactSensitiveData(text) {
  if (!text || typeof text !== 'string') return text;
  let redacted = text;

  // 1. Redact WiFi.begin("SSID", "PASS")
  redacted = redacted.replace(
    /WiFi\.begin\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/gi,
    'WiFi.begin("[REDACTED_SSID]", "[REDACTED_PASS]")'
  );

  // 2. Redact Bearer tokens
  redacted = redacted.replace(/Bearer\s+([a-zA-Z0-9._~+/-]{10,})/gi, 'Bearer [REDACTED_TOKEN]');

  // 3. Redact sk-... keys
  redacted = redacted.replace(/sk-[a-zA-Z0-9]{20,}/gi, '[REDACTED_SECRET]');

  // 4. Redact password/token/key key-value pairs
  redacted = redacted.replace(/(?:password|passwd|pwd|pass)\s*[:=]\s*["']?([^"' \r\n]{3,})["']?/gi, (match, val) => {
    return match.replace(val, '[REDACTED_SECRET]');
  });

  redacted = redacted.replace(/(?:ssid|wifi_ssid)\s*[:=]\s*["']?([^"' \r\n]{3,})["']?/gi, (match, val) => {
    return match.replace(val, '[REDACTED_SSID]');
  });

  redacted = redacted.replace(/(?:api[_-]?key|secret|token)\s*[:=]\s*["']?([^"' \r\n]{5,})["']?/gi, (match, val) => {
    return match.replace(val, '[REDACTED_SECRET]');
  });

  return redacted;
}

class SerialService {
  constructor() {
    this.activePort = null;
    this.activeBaudRate = 115200;
    this.portInstance = null;
    this.isConnected = false;
    this.isPausedForUpload = false;
    this.recentLogs = [];
    this.maxLogLines = 1000;
    this.aiAuthorized = false;

    // Listeners for IPC streaming
    this.dataCallbacks = new Set();
    this.stateCallbacks = new Set();
    this.errorCallbacks = new Set();

    // Register hooks with portManager so uploads can auto-pause and auto-resume monitoring
    portManager.registerMonitorHooks(
      (port) => this.handlePauseForUpload(port),
      (port, config) => this.handleResumeAfterUpload(port, config)
    );
  }

  /**
   * Enumerate available serial ports on host system
   */
  async listPorts() {
    let portList = [];

    try {
      const rawPorts = await SerialPort.list();
      if (Array.isArray(rawPorts) && rawPorts.length > 0) {
        portList = rawPorts.map((p) => ({
          path: p.path,
          name: p.friendlyName || p.path,
          manufacturer: p.manufacturer || 'Serial Device',
          pnpId: p.pnpId || null,
          vendorId: p.vendorId || null,
          productId: p.productId || null
        }));
      }
    } catch {
      // Fallback below
    }

    // Windows CIM fallback if SerialPort.list returned nothing
    if (portList.length === 0 && process.platform === 'win32') {
      try {
        const { stdout } = await execAsync(
          'powershell -NoProfile -Command "Get-CimInstance -Class Win32_SerialPort | Select-Object DeviceID, Description, PNPDeviceID | ConvertTo-Json"',
          { timeout: 3000 }
        );
        if (stdout && stdout.trim()) {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of list) {
            if (item && item.DeviceID) {
              portList.push({
                path: item.DeviceID,
                name: item.Description || item.DeviceID,
                manufacturer: item.PNPDeviceID || 'Serial Device'
              });
            }
          }
        }
      } catch {
        // Non-fatal
      }
    }

    return portList;
  }

  /**
   * Connect to a specific serial port with given baud rate
   */
  async connect({ port, baudRate = 115200 }) {
    if (!port || typeof port !== 'string') {
      throw new Error('INVALID_PORT: Port path must be a non-empty string.');
    }

    const baud = Number(baudRate) || 115200;
    if (!SUPPORTED_BAUD_RATES.includes(baud)) {
      throw new Error(`UNSUPPORTED_BAUD_RATE: Baud rate ${baud} is not supported.`);
    }

    // Check mutual exclusion lock
    const lock = portManager.acquirePort(port, 'MONITOR');
    if (!lock.success) {
      return {
        success: false,
        error: lock.error,
        message: lock.message
      };
    }

    // Disconnect any active port first
    if (this.isConnected) {
      await this.disconnect();
    }

    return new Promise((resolve) => {
      try {
        const serial = new SerialPort({
          path: port,
          baudRate: baud,
          autoOpen: false
        });

        serial.open((err) => {
          if (err) {
            portManager.releasePort(port, 'MONITOR');
            this.notifyError(`Failed to open ${port}: ${err.message}`);
            return resolve({
              success: false,
              error: 'OPEN_FAILED',
              message: err.message
            });
          }

          this.portInstance = serial;
          this.activePort = port;
          this.activeBaudRate = baud;
          this.isConnected = true;
          this.isPausedForUpload = false;

          serial.on('data', (data) => {
            const rawText = data.toString('utf8');
            const cleanText = redactSensitiveData(rawText);
            this.appendLog(cleanText);
            this.notifyData(cleanText);
          });

          serial.on('error', (portErr) => {
            this.notifyError(`Port Error (${port}): ${portErr.message}`);
          });

          serial.on('close', () => {
            this.handlePortClosed();
          });

          this.notifyState();
          resolve({
            success: true,
            port,
            baudRate: baud,
            status: 'connected'
          });
        });
      } catch (ex) {
        portManager.releasePort(port, 'MONITOR');
        resolve({
          success: false,
          error: 'INITIALIZATION_ERROR',
          message: ex.message
        });
      }
    });
  }

  /**
   * Safely disconnect from the active serial port
   */
  async disconnect() {
    if (!this.portInstance || !this.isConnected) {
      return { success: true, status: 'disconnected' };
    }

    const currentPort = this.activePort;

    return new Promise((resolve) => {
      this.portInstance.close(() => {
        this.portInstance = null;
        this.isConnected = false;
        this.activePort = null;
        portManager.releasePort(currentPort, 'MONITOR');
        this.notifyState();
        resolve({ success: true, status: 'disconnected' });
      });
    });
  }

  /**
   * Transmits text string to the microcontroller with selected line ending
   */
  async write({ text, lineEnding = 'none' }) {
    if (!this.isConnected || !this.portInstance) {
      return {
        success: false,
        error: 'NOT_CONNECTED',
        message: 'Cannot write: Serial monitor is not connected to any port.'
      };
    }

    let terminator = '';
    switch (lineEnding.toLowerCase()) {
      case 'lf':
      case 'newline':
        terminator = '\n';
        break;
      case 'crlf':
      case 'both':
        terminator = '\r\n';
        break;
      case 'cr':
        terminator = '\r';
        break;
      case 'none':
      default:
        terminator = '';
        break;
    }

    const payload = `${text}${terminator}`;

    return new Promise((resolve) => {
      this.portInstance.write(payload, 'utf8', (err) => {
        if (err) {
          return resolve({ success: false, error: 'WRITE_FAILED', message: err.message });
        }
        resolve({ success: true, bytesWritten: Buffer.byteLength(payload, 'utf8') });
      });
    });
  }

  appendLog(text) {
    this.recentLogs.push({
      time: new Date().toLocaleTimeString(),
      text
    });
    if (this.recentLogs.length > this.maxLogLines) {
      this.recentLogs.shift();
    }
  }

  clearLogs() {
    this.recentLogs = [];
    return { success: true };
  }

  getLogs() {
    return { success: true, logs: this.recentLogs };
  }

  /**
   * Returns serial telemetry for AI context ONLY if authorized by user
   */
  getLogsForAi(authorizedByUser) {
    if (!authorizedByUser && !this.aiAuthorized) {
      return {
        authorized: false,
        summary: '[Telemetry Excluded: User authorization required to share live serial telemetry with AI model.]'
      };
    }

    const recentSnippets = this.recentLogs.slice(-50).map((l) => `[${l.time}] ${l.text}`).join('');
    return {
      authorized: true,
      telemetry: redactSensitiveData(recentSnippets)
    };
  }

  setAiAuthorization(authorized) {
    this.aiAuthorized = Boolean(authorized);
    return { success: true, aiAuthorized: this.aiAuthorized };
  }

  /**
   * Internal hook: Pause monitor during upload
   */
  async handlePauseForUpload(port) {
    if (this.isConnected && this.activePort === port && this.portInstance) {
      const config = {
        port: this.activePort,
        baudRate: this.activeBaudRate
      };

      await new Promise((resolve) => {
        this.portInstance.close(() => {
          this.portInstance = null;
          this.isConnected = false;
          this.isPausedForUpload = true;
          this.notifyState();
          resolve();
        });
      });

      return config;
    }
    return null;
  }

  /**
   * Internal hook: Resume monitor after upload
   */
  async handleResumeAfterUpload(port, config) {
    if (config && config.port) {
      await this.connect({
        port: config.port,
        baudRate: config.baudRate
      });
      this.isPausedForUpload = false;
      this.notifyState();
    }
  }

  handlePortClosed() {
    if (!this.isPausedForUpload) {
      this.isConnected = false;
      this.portInstance = null;
      if (this.activePort) {
        portManager.releasePort(this.activePort, 'MONITOR');
        this.activePort = null;
      }
      this.notifyState();
    }
  }

  getState() {
    return {
      isConnected: this.isConnected,
      activePort: this.activePort,
      baudRate: this.activeBaudRate,
      isPausedForUpload: this.isPausedForUpload,
      aiAuthorized: this.aiAuthorized
    };
  }

  onData(cb) { this.dataCallbacks.add(cb); return () => this.dataCallbacks.delete(cb); }
  onState(cb) { this.stateCallbacks.add(cb); return () => this.stateCallbacks.delete(cb); }
  onError(cb) { this.errorCallbacks.add(cb); return () => this.errorCallbacks.delete(cb); }

  notifyData(chunk) {
    for (const cb of this.dataCallbacks) {
      try { cb(chunk); } catch { /* ignore */ }
    }
  }

  notifyState() {
    const state = this.getState();
    for (const cb of this.stateCallbacks) {
      try { cb(state); } catch { /* ignore */ }
    }
  }

  notifyError(msg) {
    for (const cb of this.errorCallbacks) {
      try { cb(msg); } catch { /* ignore */ }
    }
  }

  /**
   * Closes active port during application shutdown
   */
  async shutdown() {
    if (this.isConnected && this.portInstance) {
      try {
        await this.disconnect();
      } catch {
        // Ignore during shutdown
      }
    }
  }
}

// Global singleton instance
const serialService = new SerialService();

module.exports = {
  SerialService,
  serialService,
  redactSensitiveData,
  SUPPORTED_BAUD_RATES
};
