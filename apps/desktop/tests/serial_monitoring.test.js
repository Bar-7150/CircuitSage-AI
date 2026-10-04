/**
 * CircuitSage AI — Serial Monitoring, Port Ownership & Upload Unit Tests
 */

const { PortManager } = require('../src/services/portManager');
const { redactSensitiveData, SUPPORTED_BAUD_RATES } = require('../src/services/serialService');
const { uploadFirmware, parseUploadDiagnostics } = require('../src/services/uploadService');

describe('Port Ownership & Mutual Exclusion', () => {
  let portMgr;

  beforeEach(() => {
    portMgr = new PortManager();
  });

  it('allows acquiring port ownership for monitor when unoccupied', () => {
    const res = portMgr.acquirePort('COM3', 'MONITOR');
    expect(res.success).toBe(true);
    expect(res.owner).toBe('MONITOR');
    expect(portMgr.getPortState('COM3').owner).toBe('MONITOR');
  });

  it('rejects monitor acquisition if port is actively locked by upload', () => {
    portMgr.acquirePort('COM3', 'UPLOAD');
    const res = portMgr.acquirePort('COM3', 'MONITOR');
    expect(res.success).toBe(false);
    expect(res.error).toBe('PORT_LOCKED_BY_UPLOAD');
  });

  it('properly triggers pause and resume hooks during upload lifecycle', async () => {
    let pausedPort = null;
    let resumedPort = null;
    let resumedConfig = null;

    portMgr.registerMonitorHooks(
      async (port) => {
        pausedPort = port;
        return { port, baudRate: 115200 };
      },
      async (port, config) => {
        resumedPort = port;
        resumedConfig = config;
      }
    );

    // Initial monitor ownership
    portMgr.acquirePort('COM4', 'MONITOR');

    // Prepare for upload
    await portMgr.preparePortForUpload('COM4');
    expect(pausedPort).toBe('COM4');
    expect(portMgr.getPortState('COM4').owner).toBe('UPLOAD');

    // Restore after upload completes
    await portMgr.restorePortAfterUpload('COM4');
    expect(resumedPort).toBe('COM4');
    expect(resumedConfig).toEqual({ port: 'COM4', baudRate: 115200 });
    expect(portMgr.getPortState('COM4').owner).toBe('MONITOR');
  });
});

describe('Sensitive Log Redaction & Baud Rate Support', () => {
  it('supports industry standard baud rates for microcontrollers', () => {
    expect(SUPPORTED_BAUD_RATES).toContain(9600);
    expect(SUPPORTED_BAUD_RATES).toContain(115200);
    expect(SUPPORTED_BAUD_RATES).toContain(460800);
    expect(SUPPORTED_BAUD_RATES).toContain(921600);
  });

  it('redacts Wi-Fi credentials from serial telemetry logs', () => {
    const raw = 'Connecting to AP: WiFi.begin("HomeWiFi_Guest", "SuperSecretPassword123")';
    const redacted = redactSensitiveData(raw);
    expect(redacted).not.toContain('HomeWiFi_Guest');
    expect(redacted).not.toContain('SuperSecretPassword123');
    expect(redacted).toContain('WiFi.begin("[REDACTED_SSID]", "[REDACTED_PASS]")');
  });

  it('redacts Bearer tokens and API secret keys', () => {
    const raw = 'Auth: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret token data\nAPI key: sk-abcdef1234567890abcdef123456';
    const redacted = redactSensitiveData(raw);
    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret');
    expect(redacted).not.toContain('sk-abcdef1234567890abcdef123456');
    expect(redacted).toContain('Bearer [REDACTED_TOKEN]');
  });
});

describe('Firmware Upload Validation & Circuit Disclaimer', () => {
  it('strictly requires explicit user approval before initiating upload', async () => {
    const res = await uploadFirmware({
      sketchPath: 'test.ino',
      fqbn: 'esp32:esp32:esp32cam',
      port: 'COM3',
      userApproved: false // User did not approve
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('APPROVAL_REQUIRED');
  });

  it('rejects invalid or malformed FQBN values', async () => {
    const res = await uploadFirmware({
      sketchPath: 'test.ino',
      fqbn: 'invalid_malicious;rm -rf /',
      port: 'COM3',
      userApproved: true
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('INVALID_FQBN');
  });

  it('rejects missing or empty target port', async () => {
    const res = await uploadFirmware({
      sketchPath: 'test.ino',
      fqbn: 'esp32:esp32:esp32cam',
      port: '',
      userApproved: true
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('INVALID_PORT');
  });
});

describe('Upload Diagnostics Parser', () => {
  it('parses ESP32-CAM bootloader timeout and provides GPIO 0 remedy', () => {
    const stderr = 'A fatal error occurred: Failed to connect to ESP32: Timed out waiting for packet header';
    const diags = parseUploadDiagnostics(stderr, '', 'esp32:esp32:esp32cam');

    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].type).toBe('BOOTLOADER_SYNC_TIMEOUT');
    expect(diags[0].message).toContain('ESP32-CAM did not enter flash download mode');
    expect(diags[0].remedy).toContain('GPIO 0 to GND');
  });

  it('parses port access denied / busy error', () => {
    const stderr = 'serial.serialutil.SerialException: could not open port COM3: [Error 5] Access is denied.';
    const diags = parseUploadDiagnostics(stderr, '', 'esp32:esp32:esp32');

    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].type).toBe('PORT_BUSY');
    expect(diags[0].title).toBe('Serial Port Access Denied');
  });

  it('parses brownout and power instability error', () => {
    const stdout = 'Brownout detector was triggered at 0x40081234';
    const diags = parseUploadDiagnostics('', stdout, 'esp32:esp32:esp32cam');

    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].type).toBe('POWER_BROWNOUT');
    expect(diags[0].remedy).toContain('5V 2A');
  });
});
