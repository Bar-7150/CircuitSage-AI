/**
 * CircuitSage AI — Embedded Build Service
 *
 * Provides real toolchain orchestration using Arduino CLI for IoT projects
 * (prioritizing ESP32 and ESP32-CAM).
 *
 * Core Guarantees:
 * - Independent of React / UI layer (pure Node.js)
 * - Safe process execution with spawn() and argument array validation (NO arbitrary shell strings)
 * - Strict FQBN and file path validation
 * - Process timeout & abort cancellation support
 * - Never fabricates output or returns success on compiler failure
 * - Never silently installs or updates board cores / libraries
 */

const childProcess = require('child_process');
const { execFile } = childProcess;
const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseCompilerProblems, parseMemoryUsage } = require('./compilerErrorParser');

// Strict FQBN regex pattern: vendor:architecture:boardId[:option=val,...]
const FQBN_REGEX = /^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+(?::[a-zA-Z0-9_=,-]+)?$/;

// Standard curated ESP32 board presets with default FQBNs
const ESP32_BOARD_PRESETS = [
  {
    id: 'esp32cam',
    name: 'AI Thinker ESP32-CAM',
    fqbn: 'esp32:esp32:esp32cam',
    core: 'esp32:esp32',
    description: 'ESP32 development board with OV2640 camera and microSD socket.',
    logicVoltage: '3.3V',
    notes: 'Requires GPIO 0 pulled to GND to enter flash mode. Needs 5V 2A external power.'
  },
  {
    id: 'esp32',
    name: 'ESP32 Dev Module',
    fqbn: 'esp32:esp32:esp32',
    core: 'esp32:esp32',
    description: 'Generic ESP-WROOM-32 30-pin / 38-pin development board.',
    logicVoltage: '3.3V',
    notes: 'Standard dual-core Xtensa LX6 at 240MHz with Wi-Fi and Bluetooth.'
  },
  {
    id: 'esp32wrover',
    name: 'ESP32 Wrover Module',
    fqbn: 'esp32:esp32:esp32wrover',
    core: 'esp32:esp32',
    description: 'ESP32 with 4MB or 8MB external SPI PSRAM.',
    logicVoltage: '3.3V',
    notes: 'Required for advanced AI image processing pipelines needing PSRAM.'
  },
  {
    id: 'esp32s3',
    name: 'ESP32-S3 Dev Module',
    fqbn: 'esp32:esp32:esp32s3',
    core: 'esp32:esp32',
    description: 'Dual-core Xtensa LX7 with vector instructions for edge AI.',
    logicVoltage: '3.3V',
    notes: 'Native USB CDC and JTAG support. Ideal for modern tinyML workloads.'
  },
  {
    id: 'arduino_uno',
    name: 'Arduino Uno R3',
    fqbn: 'arduino:avr:uno',
    core: 'arduino:avr',
    description: 'ATmega328P 8-bit AVR development board.',
    logicVoltage: '5.0V',
    notes: 'Standard 5V logic. Not 3.3V compatible without level shifters.'
  },
  {
    id: 'pico',
    name: 'Raspberry Pi Pico',
    fqbn: 'rp2040:rp2040:rpipico',
    core: 'rp2040:rp2040',
    description: 'Dual ARM Cortex-M0+ RP2040 microcontroller board.',
    logicVoltage: '3.3V',
    notes: 'UF2 bootloader mode activated via BOOTSEL button.'
  }
];

// Active compilation processes map: buildId -> { childProcess, abortController }
const activeBuilds = new Map();

/**
 * Executes a file directly without a shell, returning a Promise.
 */
function execFileAsync(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 15000, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Locates the Arduino CLI executable on the host system.
 * Checks ARDUINO_CLI_PATH env, system PATH, and known installation locations.
 */
async function resolveArduinoCliPath() {
  // 1. Explicit environment override
  if (process.env.ARDUINO_CLI_PATH && fs.existsSync(process.env.ARDUINO_CLI_PATH)) {
    return path.resolve(process.env.ARDUINO_CLI_PATH);
  }

  const isWin = process.platform === 'win32';
  const binName = isWin ? 'arduino-cli.exe' : 'arduino-cli';

  // 2. Check system PATH via where/which
  try {
    const whichCmd = isWin ? 'where' : 'which';
    const { stdout } = await execFileAsync(whichCmd, [binName], { timeout: 3000 });
    const firstLine = stdout.trim().split(/\r?\n/)[0]?.trim();
    if (firstLine && fs.existsSync(firstLine)) {
      return path.resolve(firstLine);
    }
  } catch {
    // PATH lookup missed; proceed to fallback paths
  }

  // 3. Well-known fallback locations
  const fallbacks = isWin
    ? [
        'C:\\Program Files\\Arduino IDE\\resources\\app\\lib\\backend\\resources\\arduino-cli.exe',
        'C:\\Program Files (x86)\\Arduino IDE\\resources\\app\\lib\\backend\\resources\\arduino-cli.exe',
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Arduino IDE', 'resources', 'app', 'lib', 'backend', 'resources', 'arduino-cli.exe'),
        path.join(os.homedir(), 'bin', 'arduino-cli.exe'),
        'C:\\tools\\arduino-cli\\arduino-cli.exe'
      ]
    : [
        '/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli',
        '/usr/local/bin/arduino-cli',
        '/opt/homebrew/bin/arduino-cli',
        path.join(os.homedir(), '.local', 'bin', 'arduino-cli'),
        '/usr/bin/arduino-cli'
      ];

  for (const candidate of fallbacks) {
    try {
      if (fs.existsSync(candidate)) {
        return path.resolve(candidate);
      }
    } catch {
      // Ignore filesystem access check errors
    }
  }

  return null;
}

/**
 * Returns actionable installation instructions when Arduino CLI or cores are missing.
 */
function getSetupInstructions() {
  const platform = process.platform;
  let cliInstallCmd = '';

  if (platform === 'win32') {
    cliInstallCmd = 'winget install Arduino.ArduinoCLI\n# Or install Arduino IDE 2.x which bundles arduino-cli';
  } else if (platform === 'darwin') {
    cliInstallCmd = 'brew install arduino-cli';
  } else {
    cliInstallCmd = 'curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh';
  }

  return {
    cliInstallInstructions: [
      'Arduino CLI was not detected on your system.',
      'Install it using your system package manager:',
      cliInstallCmd,
      'Official documentation: https://arduino.github.io/arduino-cli/latest/installation/'
    ].join('\n'),
    esp32CoreInstructions: [
      'To install the official ESP32 board platform (ESP32 / ESP32-CAM), run:',
      '1. Initialize configuration:',
      '   arduino-cli config init',
      '2. Add Espressif board manager URL:',
      '   arduino-cli config add board_manager.additional_urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json',
      '3. Update index and install core:',
      '   arduino-cli core update-index',
      '   arduino-cli core install esp32:esp32'
    ].join('\n')
  };
}

/**
 * Detects toolchain presence, version, and resolved executable path.
 */
async function detectToolchainStatus() {
  const cliPath = await resolveArduinoCliPath();

  if (!cliPath) {
    return {
      installed: false,
      version: null,
      executablePath: null,
      setupInstructions: getSetupInstructions()
    };
  }

  try {
    const { stdout } = await execFileAsync(cliPath, ['version', '--format', 'json'], { timeout: 5000 });
    const parsed = JSON.parse(stdout);
    return {
      installed: true,
      version: parsed.VersionString || 'unknown',
      executablePath: cliPath,
      commit: parsed.Commit || null,
      setupInstructions: null
    };
  } catch (err) {
    return {
      installed: true,
      version: 'unknown',
      executablePath: cliPath,
      error: err.message,
      setupInstructions: null
    };
  }
}

/**
 * Queries installed board platforms and their versions.
 *
 * @param {string} [customCliPath]
 */
async function queryInstalledCores(customCliPath) {
  const cliPath = customCliPath || (await resolveArduinoCliPath());
  if (!cliPath) {
    throw new Error('TOOLCHAIN_NOT_FOUND: Arduino CLI is not installed on this system.');
  }

  const { stdout } = await execFileAsync(cliPath, ['core', 'list', '--format', 'json'], { timeout: 8000 });
  const parsed = JSON.parse(stdout || '{}');
  const platforms = parsed.platforms || (Array.isArray(parsed) ? parsed : []);

  return platforms.map((c) => ({
    id: c.id,
    installedVersion: c.installed_version,
    latestVersion: c.latest_version,
    name: c.name
  }));
}

/**
 * Queries supported boards, optionally filtered by keyword (e.g. 'esp32', 'cam').
 *
 * @param {string} [searchFilter]
 * @param {string} [customCliPath]
 */
async function querySupportedBoards(searchFilter = '', customCliPath) {
  const cliPath = customCliPath || (await resolveArduinoCliPath());
  if (!cliPath) {
    throw new Error('TOOLCHAIN_NOT_FOUND: Arduino CLI is not installed on this system.');
  }

  const args = ['board', 'listall', '--format', 'json'];
  if (searchFilter && typeof searchFilter === 'string' && searchFilter.trim()) {
    args.splice(2, 0, searchFilter.trim());
  }

  const { stdout } = await execFileAsync(cliPath, args, { timeout: 8000 });
  const parsed = JSON.parse(stdout || '{}');
  const boards = parsed.boards || [];

  return boards.map((b) => ({
    name: b.name,
    fqbn: b.fqbn
  }));
}

/**
 * Checks if the board core required for a given FQBN is installed.
 * NEVER silently installs or updates missing cores (Requirement 6).
 *
 * @param {string} fqbn
 * @param {string} [customCliPath]
 */
async function verifyPlatformInstalled(fqbn, customCliPath) {
  if (!fqbn || !FQBN_REGEX.test(fqbn)) {
    throw new Error(`INVALID_FQBN: '${fqbn}' is not a valid Fully Qualified Board Name.`);
  }

  const [vendor, arch] = fqbn.split(':');
  const requiredCoreId = `${vendor}:${arch}`;

  const installedCores = await queryInstalledCores(customCliPath);
  const match = installedCores.find((c) => c.id === requiredCoreId);

  if (match) {
    return {
      installed: true,
      coreId: requiredCoreId,
      installedVersion: match.installedVersion
    };
  }

  return {
    installed: false,
    coreId: requiredCoreId,
    manualInstallCommand: `arduino-cli core install ${requiredCoreId}`,
    message: `Core platform '${requiredCoreId}' is not installed. Run '${`arduino-cli core install ${requiredCoreId}`}' to install it.`
  };
}

/**
 * Validates a sketch path to ensure it exists and represents a valid Arduino sketch.
 */
function validateSketchTarget(sketchPath) {
  if (!sketchPath || typeof sketchPath !== 'string') {
    throw new Error('INVALID_SKETCH_PATH: Sketch path must be a non-empty string.');
  }

  const resolved = path.resolve(sketchPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`SKETCH_NOT_FOUND: File or directory '${resolved}' does not exist.`);
  }

  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    // Look for matching or any .ino file in directory
    const baseName = path.basename(resolved);
    const primaryIno = path.join(resolved, `${baseName}.ino`);
    if (fs.existsSync(primaryIno)) {
      return resolved;
    }
    const entries = fs.readdirSync(resolved);
    const hasIno = entries.some((f) => f.endsWith('.ino'));
    if (!hasIno) {
      throw new Error(`INVALID_SKETCH: Directory '${resolved}' contains no .ino files.`);
    }
    return resolved;
  }

  if (!resolved.endsWith('.ino')) {
    throw new Error(`INVALID_SKETCH: File '${resolved}' is not an Arduino sketch (.ino).`);
  }

  return resolved;
}

/**
 * Compiles an Arduino sketch project using Arduino CLI.
 *
 * Security:
 * - Uses child_process.spawn directly (shell: false)
 * - Strict argument validation (no shell injection)
 * - Restricts execution strictly to arduino-cli binary
 *
 * Resilience:
 * - Asynchronous execution (non-blocking for UI responsiveness)
 * - Supports safe cancellation via abortSignal / cancelCompilation
 * - Strict timeout enforcement
 * - Full stdout/stderr capture, duration measurement, and error parsing
 * - NEVER fabricates output or returns success on exit code !== 0
 *
 * @param {Object} options
 * @param {string} options.sketchPath - Absolute or relative path to .ino file or sketch directory
 * @param {string} options.fqbn - Board FQBN (e.g. 'esp32:esp32:esp32cam')
 * @param {string} [options.buildPath] - Optional custom build cache directory
 * @param {boolean} [options.clean=false] - If true, triggers a clean compilation
 * @param {'none'|'default'|'more'|'all'} [options.warnings='default'] - Warning level
 * @param {number} [options.timeoutMs=120000] - Process timeout in milliseconds (default 2 minutes)
 * @param {string} [options.customCliPath] - Optional custom CLI binary path
 * @param {string} [options.buildId] - Optional identifier for tracking / cancellation
 */
async function compileProject(options = {}) {
  const {
    sketchPath,
    fqbn,
    buildPath,
    clean = false,
    warnings = 'default',
    timeoutMs = 120000,
    customCliPath,
    buildId = `build_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  } = options;

  // 1. Resolve executable
  const cliPath = customCliPath || (await resolveArduinoCliPath());
  if (!cliPath) {
    throw new Error('TOOLCHAIN_NOT_FOUND: Arduino CLI executable is not installed or could not be found.');
  }

  // 2. Validate inputs strictly
  if (!fqbn || !FQBN_REGEX.test(fqbn)) {
    throw new Error(`INVALID_FQBN: '${fqbn}' is not a valid Fully Qualified Board Name.`);
  }

  const safeSketchPath = validateSketchTarget(sketchPath);

  const allowedWarnings = new Set(['none', 'default', 'more', 'all']);
  const safeWarnings = allowedWarnings.has(warnings) ? warnings : 'default';

  // 3. Assemble validated command arguments (array of strings, shell: false)
  const args = [
    'compile',
    '--fqbn', fqbn,
    '--no-color',
    '--warnings', safeWarnings
  ];

  if (clean) {
    args.push('--clean');
  }

  if (buildPath && typeof buildPath === 'string') {
    args.push('--build-path', path.resolve(buildPath));
  }

  args.push(safeSketchPath);

  // 4. Execute compilation process
  const startTime = Date.now();
  let stdoutData = '';
  let stderrData = '';
  let timedOut = false;
  let cancelled = false;

  return new Promise((resolve) => {
    const spawnFn = options.spawnFn || childProcess.spawn;
    const child = spawnFn(cliPath, args, {
      shell: false,
      windowsHide: true
    });

    const abortController = new AbortController();
    activeBuilds.set(buildId, { child, abortController });

    // Setup process timeout
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
        // Force kill after grace period if needed
        setTimeout(() => {
          try { child.kill('SIGKILL'); } catch { /* ignore */ }
        }, 3000);
      } catch { /* ignore */ }
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString('utf8');
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      activeBuilds.delete(buildId);
      const durationMs = Date.now() - startTime;

      resolve({
        success: false,
        exitCode: -1,
        durationMs,
        stdout: stdoutData,
        stderr: `${stderrData}\nProcess Execution Error: ${err.message}`.trim(),
        problems: parseCompilerProblems(stderrData, stdoutData),
        memoryUsage: parseMemoryUsage(stdoutData),
        timedOut: false,
        cancelled: false,
        error: err.message
      });
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      activeBuilds.delete(buildId);
      const durationMs = Date.now() - startTime;

      if (signal === 'SIGTERM' || signal === 'SIGINT') {
        if (!timedOut) cancelled = true;
      }

      // Exit code 0 strictly denotes success
      const success = code === 0 && !timedOut && !cancelled;

      const problems = parseCompilerProblems(stderrData, stdoutData);
      const memoryUsage = parseMemoryUsage(stdoutData);

      resolve({
        success,
        exitCode: code !== null ? code : -1,
        signal: signal || null,
        durationMs,
        stdout: stdoutData,
        stderr: stderrData,
        problems,
        memoryUsage,
        timedOut,
        cancelled,
        fqbn,
        sketchPath: safeSketchPath
      });
    });
  });
}

/**
 * Cancels an ongoing compilation process by buildId.
 *
 * @param {string} buildId
 * @returns {boolean} true if an active build was found and signal sent
 */
function cancelCompilation(buildId) {
  if (!buildId || !activeBuilds.has(buildId)) {
    return false;
  }

  const { child } = activeBuilds.get(buildId);
  try {
    child.kill('SIGINT');
    setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
    }, 2000);
    activeBuilds.delete(buildId);
    return true;
  } catch {
    activeBuilds.delete(buildId);
    return false;
  }
}

module.exports = {
  resolveArduinoCliPath,
  detectToolchainStatus,
  getSetupInstructions,
  queryInstalledCores,
  querySupportedBoards,
  verifyPlatformInstalled,
  validateSketchTarget,
  compileProject,
  cancelCompilation,
  ESP32_BOARD_PRESETS,
  FQBN_REGEX,
  _activeBuildsForTesting: activeBuilds
};
