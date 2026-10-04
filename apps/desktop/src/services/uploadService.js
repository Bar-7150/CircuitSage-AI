/**
 * CircuitSage AI — Firmware Upload Service
 *
 * Coordinates real firmware flashing using Arduino CLI for ESP32 & ESP32-CAM:
 * - Validates sketch path, FQBN, and serial port before execution
 * - Requires explicit user approval before beginning flash
 * - Employs shared port-ownership (pauses active serial monitor before upload, resumes after)
 * - Executes arduino-cli upload with safe argument arrays (spawn, NO shell strings)
 * - Captures stdout, stderr, exit code, and duration
 * - Parses hardware diagnostics for bootloader timeouts, busy ports, and brownouts
 * - Never claims a successful upload proves the circuit works (circuit disclaimer guarantee)
 */

const { spawn } = require('child_process');
const { resolveArduinoCliPath, validateSketchTarget, FQBN_REGEX } = require('./embeddedBuildService');
const { portManager } = require('./portManager');

// Standard upload timeout (60 seconds)
const DEFAULT_UPLOAD_TIMEOUT_MS = 60000;

// Active upload processes: uploadId -> { childProcess, abortController }
const activeUploads = new Map();

/**
 * Diagnostic parser for common microcontroller upload and bootloader failures
 */
function parseUploadDiagnostics(stderr, stdout, fqbn = '') {
  const combined = `${stderr || ''}\n${stdout || ''}`;
  const diagnostics = [];

  // 1. ESP32 Bootloader Sync Failure (GPIO 0 not held)
  if (
    combined.includes('Failed to connect to ESP32: Timed out waiting for packet header') ||
    combined.includes('No serial data received') ||
    combined.includes('Connecting........_____.....') ||
    combined.includes('A fatal error occurred: Failed to connect')
  ) {
    const isCam = fqbn.toLowerCase().includes('cam');
    diagnostics.push({
      type: 'BOOTLOADER_SYNC_TIMEOUT',
      severity: 'error',
      title: 'Bootloader Synchronization Failed',
      message: isCam
        ? 'ESP32-CAM did not enter flash download mode. On AI-Thinker ESP32-CAM, you must connect GPIO 0 to GND, press the RESET button once, and then click Upload.'
        : 'ESP32 did not enter flash download mode. Hold down the BOOT (IO0) button on your board while clicking Upload, then release once flashing begins.',
      remedy: isCam
        ? '1. Connect jumper wire from GPIO 0 to GND.\n2. Tap the RST button on the back of the ESP32-CAM.\n3. Retry upload.\n4. Remember to remove the GPIO 0 jumper after upload completes!'
        : 'Hold the physical BOOT button on your ESP32 module until the flasher establishes connection.'
    });
  }

  // 2. Port Locked / Access Denied
  if (
    combined.includes('Access is denied') ||
    combined.includes('could not open port') ||
    combined.includes('Device or resource busy') ||
    combined.includes('Permission denied')
  ) {
    diagnostics.push({
      type: 'PORT_BUSY',
      severity: 'error',
      title: 'Serial Port Access Denied',
      message: 'The serial port is currently locked or in use by another program.',
      remedy: 'Close any external serial monitors (PuTTY, Arduino IDE, screen, minicom). CircuitSage AI automatically manages internal monitor ownership.'
    });
  }

  // 3. Port Disconnected / Device Missing
  if (
    combined.includes('No such file or directory') ||
    combined.includes('Serial port not found') ||
    combined.includes('cannot open') ||
    combined.includes('Port not found')
  ) {
    diagnostics.push({
      type: 'PORT_NOT_FOUND',
      severity: 'error',
      title: 'Device Disconnected or Not Found',
      message: 'The target COM port does not exist or was unplugged.',
      remedy: 'Verify your USB cable supports data transfer (not just power charging). Check Windows Device Manager / lsusb to confirm port assignment.'
    });
  }

  // 4. Brownout / Power instability
  if (
    combined.includes('Brownout detector was triggered') ||
    combined.includes('Flash write error') ||
    combined.includes('A fatal error occurred: MD5 of file does not match')
  ) {
    diagnostics.push({
      type: 'POWER_BROWNOUT',
      severity: 'error',
      title: 'Power Instability / Brownout',
      message: 'The ESP32 experienced a voltage dip below 2.8V during high-power flash programming.',
      remedy: 'ESP32-CAM modules require a stable 5V 2A external power supply. Standard computer USB ports often brown out when the RF transceiver or flash executes.'
    });
  }

  return diagnostics;
}

/**
 * Uploads compiled firmware to target microcontroller
 *
 * @param {object} payload
 * @param {string} payload.sketchPath - Absolute or workspace-relative path to .ino sketch
 * @param {string} payload.fqbn - Target board FQBN
 * @param {string} payload.port - Target serial port (e.g. COM3 or /dev/ttyUSB0)
 * @param {boolean} payload.userApproved - Explicit user confirmation
 * @param {number} [payload.uploadSpeed] - Optional upload baud rate override
 * @param {number} [payload.timeoutMs] - Process timeout in milliseconds
 */
async function uploadFirmware(payload = {}) {
  const {
    sketchPath,
    fqbn,
    port,
    userApproved = false,
    uploadSpeed,
    timeoutMs = DEFAULT_UPLOAD_TIMEOUT_MS
  } = payload;

  const startTime = Date.now();

  // 1. Explicit user approval requirement
  if (!userApproved) {
    return {
      success: false,
      error: 'APPROVAL_REQUIRED',
      message: 'Firmware upload requires explicit user approval before execution.',
      targetBoard: fqbn,
      port
    };
  }

  // 2. Validate FQBN
  if (!fqbn || typeof fqbn !== 'string' || !FQBN_REGEX.test(fqbn.trim())) {
    return {
      success: false,
      error: 'INVALID_FQBN',
      message: `Invalid or malformed FQBN: '${fqbn}'. Expected vendor:arch:board format.`
    };
  }

  // 3. Validate Port
  if (!port || typeof port !== 'string' || !port.trim()) {
    return {
      success: false,
      error: 'INVALID_PORT',
      message: 'A target serial communication port must be selected for upload.'
    };
  }

  // 4. Validate Sketch Target
  let safeSketchPath;
  try {
    safeSketchPath = validateSketchTarget(sketchPath);
  } catch (err) {
    return {
      success: false,
      error: 'INVALID_SKETCH',
      message: err.message
    };
  }

  // 5. Resolve Arduino CLI Executable
  let cliPath;
  try {
    cliPath = await resolveArduinoCliPath();
  } catch (err) {
    return {
      success: false,
      error: 'TOOLCHAIN_NOT_FOUND',
      message: err.message
    };
  }

  const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const cleanPort = port.trim();
  const cleanFqbn = fqbn.trim();

  // 6. Mutual Exclusion: Prepare port and pause active monitor
  await portManager.preparePortForUpload(cleanPort);

  // Build validated argument array
  const args = [
    'upload',
    '-p', cleanPort,
    '--fqbn', cleanFqbn,
    safeSketchPath
  ];

  if (uploadSpeed && !isNaN(uploadSpeed)) {
    args.push('--upload-property', `upload.speed=${Number(uploadSpeed)}`);
  }

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let timedOut = false;
    let cancelled = false;

    const child = spawn(cliPath, args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    activeUploads.set(uploadId, { child });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
        setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* ignore */ } }, 2000);
      } catch { /* ignore */ }
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString('utf8');
    });

    child.on('error', async (err) => {
      clearTimeout(timer);
      activeUploads.delete(uploadId);
      await portManager.restorePortAfterUpload(cleanPort);
      const durationMs = Date.now() - startTime;

      resolve({
        success: false,
        exitCode: -1,
        durationMs,
        stdout: stdoutData,
        stderr: `${stderrData}\nExecution Error: ${err.message}`,
        diagnostics: parseUploadDiagnostics(stderrData, stdoutData, cleanFqbn),
        disclaimer: 'NOTE: Firmware upload was not completed.',
        port: cleanPort,
        fqbn: cleanFqbn
      });
    });

    child.on('close', async (code, signal) => {
      clearTimeout(timer);
      activeUploads.delete(uploadId);
      await portManager.restorePortAfterUpload(cleanPort);
      const durationMs = Date.now() - startTime;

      if (signal === 'SIGTERM' || signal === 'SIGINT') {
        if (!timedOut) cancelled = true;
      }

      const success = code === 0 && !timedOut && !cancelled;
      const diagnostics = parseUploadDiagnostics(stderrData, stdoutData, cleanFqbn);

      // Crucial requirement: Never claim a successful upload proves the circuit works
      const disclaimer = success
        ? 'Firmware uploaded successfully to flash memory. NOTE: Flash verification confirms program memory write, but does not prove circuit connections, sensors, or external components are functional.'
        : 'Firmware upload failed. Review diagnostic suggestions above.';

      resolve({
        success,
        exitCode: code !== null ? code : -1,
        signal: signal || null,
        durationMs,
        stdout: stdoutData,
        stderr: stderrData,
        diagnostics,
        disclaimer,
        timedOut,
        cancelled,
        port: cleanPort,
        fqbn: cleanFqbn,
        uploadId
      });
    });
  });
}

function cancelUpload(uploadId) {
  if (!uploadId || !activeUploads.has(uploadId)) {
    return false;
  }

  const { child } = activeUploads.get(uploadId);
  try {
    child.kill('SIGINT');
    setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
    }, 2000);
    activeUploads.delete(uploadId);
    return true;
  } catch {
    activeUploads.delete(uploadId);
    return false;
  }
}

module.exports = {
  uploadFirmware,
  cancelUpload,
  parseUploadDiagnostics,
  _activeUploadsForTesting: activeUploads
};
